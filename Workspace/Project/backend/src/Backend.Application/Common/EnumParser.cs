namespace Backend.Application.Common;

public static class EnumParser
{
    public static TEnum Parse<TEnum>(string value, string fieldName)
        where TEnum : struct, Enum
    {
        if (!TryParse<TEnum>(value, out var parsed))
        {
            throw new ArgumentException($"Invalid value '{value}' for {fieldName}.", fieldName);
        }

        return parsed;
    }

    public static bool TryParse<TEnum>(string value, out TEnum parsed)
        where TEnum : struct, Enum
    {
        if (!Enum.TryParse(value, true, out parsed))
        {
            return false;
        }

        return Enum.IsDefined(parsed);
    }
}
