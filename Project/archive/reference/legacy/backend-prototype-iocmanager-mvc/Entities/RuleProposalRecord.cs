namespace IoCManager.Mvc.Entities;

public sealed class RuleProposalRecord
{
    public int Id { get; set; }
    public string ProposalId { get; set; } = string.Empty;
    public int? ObservableId { get; set; }
    public string RuleFamily { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string RuleBody { get; set; } = string.Empty;
    public string Severity { get; set; } = "medium";
    public double Confidence { get; set; }
    public bool HumanReviewRequired { get; set; } = true;
    public string Status { get; set; } = "proposed";
    public string AttackTechniquesJson { get; set; } = "[]";
    public string CitationsJson { get; set; } = "[]";
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}
