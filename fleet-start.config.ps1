# Per-repo fleet start config for alexa-mcp
# Edit ports/backend target here - start.ps1 is fleet-standard.
@{
    Name         = 'alexa-mcp'
    BackendPort  = 10801
    FrontendPort = 10800
    HealthPath   = '/health'
    WebRoot      = 'web_sota'
    Backend = @{
        Kind          = 'uvicorn'
        UvicornTarget = 'alexa_mcp.server:asgi_app'
        SyncExtras    = @('dev')
        SyncOnStart  = $true
        Env           = @{ WEB_PORT = '10801' }
    }
    Frontend = @{
        Kind           = 'vite-npm'
        PackageManager = 'npm'
        PortEnvVar     = 'VITE_PORT'
        ApiTargetEnv   = 'VITE_API_TARGET'
    }
}
