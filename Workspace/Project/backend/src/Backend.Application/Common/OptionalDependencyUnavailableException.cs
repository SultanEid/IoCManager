namespace Backend.Application.Common;

public sealed class OptionalDependencyUnavailableException : Exception
{
    public OptionalDependencyUnavailableException(
        string dependencyName,
        string condition,
        string message,
        Exception? innerException = null)
        : base(message, innerException)
    {
        DependencyName = dependencyName;
        Condition = condition;
    }

    public string DependencyName { get; }

    public string Condition { get; }
}
