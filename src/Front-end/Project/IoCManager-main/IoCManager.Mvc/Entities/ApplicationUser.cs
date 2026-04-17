using Microsoft.AspNetCore.Identity;

namespace IoCManager.Mvc.Entities;

public sealed class ApplicationUser : IdentityUser
{
    public string DisplayName { get; set; } = string.Empty;
}
