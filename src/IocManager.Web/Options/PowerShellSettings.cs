namespace IocVmwareIngestion.Api.Options;

public sealed class PowerShellSettings
{
    public const string SectionName = "PowerShell";

    public string Executable { get; set; } = "powershell.exe";
    public bool AcceptNewHostKey { get; set; } = true;
    public string DefaultYaraRulePath { get; set; } = string.Empty;
    public string DefaultSigmaRule { get; set; } = string.Empty;
    public int DefaultSigmaMinutesBack { get; set; } = 60;
    public List<string> DefaultScanners { get; set; } = [ "yara", "sigma" ];
    public Dictionary<string, string> Scripts { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public RemoteExecutionSettings RemoteExecution { get; set; } = new();
}

public sealed class RemoteExecutionSettings
{
    public bool Enabled { get; set; }
    public string SshExecutable { get; set; } = "ssh.exe";
    public string ScpExecutable { get; set; } = "scp.exe";
    public string Host { get; set; } = string.Empty;
    public string User { get; set; } = string.Empty;
    public string KeyPath { get; set; } = string.Empty;
    public string PowerShellExecutable { get; set; } = "powershell.exe";
}
