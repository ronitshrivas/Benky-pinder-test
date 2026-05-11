$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

$projectId = 'manishpokharel-2fd2d'
$region = 'asia-southeast1'
$firebase = 'firebase.cmd'

function Get-EnvValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $line = Get-Content (Join-Path $repoRoot '.env.local') |
    Where-Object { $_ -match "^[ ]*$([regex]::Escape($Name))=" } |
    Select-Object -First 1

  if (-not $line) {
    throw "Missing $Name in .env.local"
  }

  return ($line -split '=', 2)[1]
}

function Set-Secret {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Key,
    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  $tempFile = Join-Path $env:TEMP ("{0}-{1}.txt" -f $Key, ([guid]::NewGuid().ToString('N')))
  Set-Content -LiteralPath $tempFile -Value $Value -NoNewline
  try {
    & $firebase apphosting:secrets:set $Key --project $projectId --location $region --data-file $tempFile -f
  }
  finally {
    Remove-Item -LiteralPath $tempFile -Force -ErrorAction SilentlyContinue
  }
}

Set-Secret -Key 'squareAccessToken' -Value (Get-EnvValue 'SQUARE_ACCESS_TOKEN')
Set-Secret -Key 'emailPassword' -Value (Get-EnvValue 'EMAIL_PASSWORD')

& $firebase deploy --project $projectId --config (Join-Path $repoRoot 'firebase.json')
