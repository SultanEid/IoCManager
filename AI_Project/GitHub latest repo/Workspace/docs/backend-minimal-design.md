# Minimal VMware IOC Ingestion Backend

## Execution model

The API can run scripts locally or SSH into `ioc_mgr` and run them there. The SSH transport is isolated behind execution-host services so moving the API onto `ioc_mgr` later only changes configuration.

## Azure SQL config

The backend now accepts a single Azure SQL connection string in `AzureSql:ConnectionString`.

Supported keys:

- `Server` or `Data Source`
- `Database` or `Initial Catalog`
- `User ID` or `UID`
- `Password` or `PWD`
- `Encrypt`
- `TrustServerCertificate`
- `Connection Timeout` or `Connect Timeout`

The repository parses that string and converts it into `sqlcmd` arguments at runtime.
