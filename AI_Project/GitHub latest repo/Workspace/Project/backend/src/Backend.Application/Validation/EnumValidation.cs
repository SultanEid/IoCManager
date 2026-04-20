namespace Backend.Application.Validation;

internal static class EnumValidation
{
    public static bool IsDefinedValue<TEnum>(string? value)
        where TEnum : struct, Enum
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        if (!Enum.TryParse<TEnum>(value, true, out var parsed))
        {
            return false;
        }

        return Enum.IsDefined(parsed);
    }
}
