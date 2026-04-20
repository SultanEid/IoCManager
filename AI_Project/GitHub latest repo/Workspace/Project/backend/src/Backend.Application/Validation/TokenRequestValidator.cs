using Backend.Contracts.Auth;
using FluentValidation;

namespace Backend.Application.Validation;

public sealed class TokenRequestValidator : AbstractValidator<TokenRequest>
{
    public TokenRequestValidator()
    {
        RuleFor(x => x.UserName).NotEmpty().MaximumLength(128);
        RuleFor(x => x.Password).NotEmpty().MaximumLength(256);
    }
}
