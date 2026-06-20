param(
  [Parameter(Mandatory = $true)]
  [string] $File
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $File)) {
  throw "File to sign does not exist: $File"
}

if (-not $env:ARTIFACT_SIGNING_CLI_PATH) {
  throw "ARTIFACT_SIGNING_CLI_PATH is not set."
}

if (-not (Test-Path -LiteralPath $env:ARTIFACT_SIGNING_CLI_PATH)) {
  throw "artifact-signing-cli was not found at: $env:ARTIFACT_SIGNING_CLI_PATH"
}

if (-not $env:SIGNTOOL_PATH) {
  throw "SIGNTOOL_PATH is not set."
}

if (-not (Test-Path -LiteralPath $env:SIGNTOOL_PATH)) {
  throw "signtool.exe was not found at: $env:SIGNTOOL_PATH"
}

Write-Host "Signing $File"
Write-Host "Using artifact-signing-cli at $env:ARTIFACT_SIGNING_CLI_PATH"
Write-Host "Using signtool.exe at $env:SIGNTOOL_PATH"

& $env:ARTIFACT_SIGNING_CLI_PATH `
  --sign-tool-path $env:SIGNTOOL_PATH `
  --endpoint $env:AZURE_TRUSTED_SIGNING_ENDPOINT `
  --account $env:AZURE_ARTIFACT_SIGNING_ACCOUNT `
  --certificate $env:AZURE_ARTIFACT_SIGNING_CERTIFICATE_PROFILE `
  --description "all-i-care-about" `
  $File

if ($LASTEXITCODE -ne 0) {
  throw "artifact-signing-cli exited with code $LASTEXITCODE"
}
