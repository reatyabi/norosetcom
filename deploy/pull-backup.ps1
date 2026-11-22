# بک‌آپ روی ماشین مالک، هر ۴۸ ساعت در ساعت کم‌بار (docs/launch-blueprint.md). آخرین dump دیتابیس و
# آرشیو فایل‌های SeaweedFS را می‌گیرد و سه نسخه‌ی آخر را نگه می‌دارد.
#
#   .\deploy\pull-backup.ps1 -Server deploy@1.2.3.4 -Destination D:\noroset-backups
param(
  [Parameter(Mandatory = $true)][string]$Server,
  [Parameter(Mandatory = $true)][string]$Destination
)

$ErrorActionPreference = 'Stop'

function Invoke-Checked {
  param([string]$File, [string[]]$Arguments)
  & $File @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$File failed with exit code $LASTEXITCODE" }
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
New-Item -ItemType Directory -Force $Destination | Out-Null

$dump = Join-Path $Destination "db-$stamp.dump"
Invoke-Checked scp @("${Server}:/srv/noroset/backups/db/latest.dump", "$dump.part")
Move-Item "$dump.part" $dump

# scp خروجی باینری را سالم نگه می‌دارد؛ آرشیو اول روی سرور ساخته و بعد پاک می‌شود.
$remoteTar = "/srv/noroset/backups/files-$stamp.tar.gz"
Invoke-Checked ssh @($Server, "docker exec noroset-storage tar -czf - -C / data > $remoteTar")
try {
  $files = Join-Path $Destination "files-$stamp.tar.gz"
  Invoke-Checked scp @("${Server}:$remoteTar", "$files.part")
  Move-Item "$files.part" $files
} finally {
  Invoke-Checked ssh @($Server, "rm -f $remoteTar")
}

foreach ($pattern in 'db-*.dump', 'files-*.tar.gz') {
  Get-ChildItem $Destination -Filter $pattern | Sort-Object Name -Descending | Select-Object -Skip 3 | Remove-Item
}
Write-Host "backup saved in $Destination ($stamp)"
