using Microsoft.AspNetCore.Identity;

namespace Backend.Infrastructure.Security;

public sealed class ApplicationUser : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = string.Empty;
}
