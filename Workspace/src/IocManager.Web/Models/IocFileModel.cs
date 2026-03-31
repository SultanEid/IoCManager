namespace IocVmwareIngestion.Api.Models;

public sealed class IocFileModel
{
    public int FileId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string FilePath { get; init; } = string.Empty;
    public string? FileHash { get; init; }
    public int RelatedIocCount { get; init; }
}
