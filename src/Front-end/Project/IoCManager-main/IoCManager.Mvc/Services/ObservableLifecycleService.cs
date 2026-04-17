using IoCManager.Mvc.Contracts.Intel;
using IoCManager.Mvc.Data;
using IoCManager.Mvc.Entities;
using Microsoft.EntityFrameworkCore;

namespace IoCManager.Mvc.Services;

public sealed class ObservableLifecycleService : IObservableLifecycleService
{
    private static readonly Dictionary<string, HashSet<string>> TransitionMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["new"] = ["validated", "active", "suppressed", "deprecated", "revoked"],
        ["validated"] = ["active", "suppressed", "deprecated", "revoked"],
        ["active"] = ["suppressed", "deprecated", "revoked"],
        ["suppressed"] = ["active", "deprecated", "revoked"],
        ["deprecated"] = ["revoked"],
        ["revoked"] = []
    };

    private readonly ApplicationDbContext _dbContext;
    private readonly ObservableCanonicalizer _canonicalizer;

    public ObservableLifecycleService(ApplicationDbContext dbContext, ObservableCanonicalizer canonicalizer)
    {
        _dbContext = dbContext;
        _canonicalizer = canonicalizer;
    }

    public IReadOnlyCollection<string> AllowedStatuses => TransitionMap.Keys.ToArray();

    public async Task<ObservableRecord> UpsertAsync(
        IocUpsertRequest request,
        string actorUserId,
        CancellationToken cancellationToken = default)
    {
        var normalizedType = NormalizeType(request.Type);
        var canonical = _canonicalizer.Canonicalize(normalizedType, request.Value);
        if (string.IsNullOrWhiteSpace(canonical))
        {
            throw new InvalidOperationException("A valid IOC value is required.");
        }

        var now = DateTime.UtcNow;
        var existing = await _dbContext.Observables
            .FirstOrDefaultAsync(
                x => x.Type == normalizedType && x.ValueCanonical == canonical,
                cancellationToken);

        if (existing is null)
        {
            existing = new ObservableRecord
            {
                Type = normalizedType,
                ValueRaw = request.Value.Trim(),
                ValueCanonical = canonical,
                Status = "new",
                FirstSeenUtc = now,
                LastSeenUtc = now,
                ExpiresAtUtc = request.ExpiresAtUtc,
                SourceCount = 1
            };
            _dbContext.Observables.Add(existing);
        }
        else
        {
            existing.ValueRaw = request.Value.Trim();
            existing.LastSeenUtc = now;
            existing.SourceCount += 1;
            if (request.ExpiresAtUtc.HasValue)
            {
                existing.ExpiresAtUtc = request.ExpiresAtUtc;
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var source = string.IsNullOrWhiteSpace(request.Source) ? "manual" : request.Source.Trim();
        _dbContext.ObservableEvidences.Add(new ObservableEvidence
        {
            ObservableId = existing.Id,
            Source = source,
            EvidenceType = "source",
            EvidenceKey = "source",
            EvidenceValue = source,
            ObservedUtc = now
        });

        if (request.Evidence is not null)
        {
            foreach (var pair in request.Evidence.Where(pair => !string.IsNullOrWhiteSpace(pair.Key) && !string.IsNullOrWhiteSpace(pair.Value)))
            {
                _dbContext.ObservableEvidences.Add(new ObservableEvidence
                {
                    ObservableId = existing.Id,
                    Source = source,
                    EvidenceType = pair.Key.Trim().ToLowerInvariant(),
                    EvidenceKey = pair.Key.Trim(),
                    EvidenceValue = pair.Value.Trim(),
                    ObservedUtc = now
                });
            }
        }

        await AddAuditAsync(actorUserId, "IOC_UPSERT", "Observable", existing.Id.ToString(), $"{normalizedType}:{canonical}", cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await RecomputeConfidenceAsync(existing.Id, cancellationToken);
        return existing;
    }

    public async Task<ObservableRecord?> UpdateStatusAsync(
        int id,
        string nextStatus,
        string actorUserId,
        CancellationToken cancellationToken = default)
    {
        var existing = await _dbContext.Observables.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        var normalizedNext = NormalizeStatus(nextStatus);
        if (existing.Status.Equals(normalizedNext, StringComparison.OrdinalIgnoreCase))
        {
            return existing;
        }

        if (!IsTransitionAllowed(existing.Status, normalizedNext))
        {
            throw new InvalidOperationException($"Status transition '{existing.Status}' -> '{normalizedNext}' is not allowed.");
        }

        var previousStatus = existing.Status;
        existing.Status = normalizedNext;
        existing.LastSeenUtc = DateTime.UtcNow;

        await AddAuditAsync(
            actorUserId,
            "IOC_STATUS_UPDATE",
            "Observable",
            existing.Id.ToString(),
            $"Status changed from {previousStatus} to {normalizedNext}.",
            cancellationToken);

        await _dbContext.SaveChangesAsync(cancellationToken);
        return existing;
    }

    public async Task RecomputeConfidenceAsync(int observableId, CancellationToken cancellationToken = default)
    {
        var observable = await _dbContext.Observables.FirstOrDefaultAsync(x => x.Id == observableId, cancellationToken);
        if (observable is null)
        {
            return;
        }

        var sightingCount = await _dbContext.ObservableSightings
            .Where(x => x.ObservableId == observableId)
            .SumAsync(x => x.HitCount, cancellationToken);

        var relationCount = await _dbContext.ObservableRelationships
            .Where(x => (x.FromObservableId == observableId || x.ToObservableId == observableId) && x.Confidence >= 55)
            .CountAsync(cancellationToken);

        observable.BaseConfidence = 40;
        observable.SourceBonus = Math.Min(25, observable.SourceCount * 5);
        observable.SightingBonus = Math.Min(20, sightingCount * 2);
        observable.CorrelationBonus = Math.Min(15, relationCount * 3);
        observable.Confidence = Math.Clamp(
            observable.BaseConfidence + observable.SourceBonus + observable.SightingBonus + observable.CorrelationBonus,
            0,
            100);

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task RecomputeAllConfidenceAsync(CancellationToken cancellationToken = default)
    {
        var ids = await _dbContext.Observables.Select(x => x.Id).ToListAsync(cancellationToken);
        foreach (var id in ids)
        {
            await RecomputeConfidenceAsync(id, cancellationToken);
        }
    }

    private async Task AddAuditAsync(
        string actorUserId,
        string action,
        string entityType,
        string entityId,
        string details,
        CancellationToken cancellationToken)
    {
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            ActorUserId = actorUserId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details,
            OccurredUtc = DateTime.UtcNow
        });

        await Task.CompletedTask;
    }

    private static bool IsTransitionAllowed(string current, string next)
    {
        var normalizedCurrent = NormalizeStatus(current);
        var normalizedNext = NormalizeStatus(next);
        if (normalizedCurrent == normalizedNext)
        {
            return true;
        }

        return TransitionMap.TryGetValue(normalizedCurrent, out var allowed) && allowed.Contains(normalizedNext);
    }

    private static string NormalizeType(string incoming)
    {
        return string.IsNullOrWhiteSpace(incoming) ? "domain" : incoming.Trim().ToLowerInvariant();
    }

    private static string NormalizeStatus(string incoming)
    {
        var normalized = string.IsNullOrWhiteSpace(incoming) ? "new" : incoming.Trim().ToLowerInvariant();
        return TransitionMap.ContainsKey(normalized) ? normalized : "new";
    }
}
