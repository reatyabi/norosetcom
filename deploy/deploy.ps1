# بیلد از ماشین توسعه و ارسال به سرور (docs/launch-blueprint.md). فقط از commit می‌سازد، پس تغییرهای commit‌نشده
# و .env وارد release نمی‌شوند. پیش از اجرا: lint، typecheck، check:boundaries و test سبز باشند.
#
#   .\deploy\deploy.ps1 -Server deploy@1.2.3.4 -Ref main
#   .\deploy\deploy.ps1 -Server deploy@1.2.3.4 -Ref main -BuildOnly
param(
  [Parameter(Mandatory = $true)][string]$Server,
  [string]$Ref = 'main',
  [switch]$BuildOnly
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true

function Invoke-Checked {
  param([string]$File, [string[]]$Arguments)
  & $File @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$File failed with exit code $LASTEXITCODE" }
}

$root = (git rev-parse --show-toplevel).Trim()
$sha = (git rev-parse --short=12 "$Ref^{commit}").Trim()
$out = Join-Path $root '.release'
New-Item -ItemType Directory -Force $out | Out-Null
$source = Join-Path $out "source-$sha.tar"
$bundle = Join-Path $out "noroset-$sha.tar.gz"

if (-not (Test-Path $bundle)) {
  Invoke-Checked git @('archive', '--format=tar', '-o', $source, $sha)
  $script = 'mkdir -p /build && tar -xf /out/source.tar -C /build && cd /build && bash deploy/build-in-container.sh ' + $sha
  Copy-Item $source (Join-Path $out 'source.tar') -Force
  Invoke-Checked docker @('run', '--rm', '-v', "${out}:/out", '-v', 'noroset-pnpm-store:/pnpm', 'node:22-bookworm', 'bash', '-c', $script)
  Remove-Item $source, (Join-Path $out 'source.tar')
}
Write-Host "release: $bundle"
if ($BuildOnly) { return }

Invoke-Checked scp @($bundle, "${Server}:/srv/noroset/incoming/")
# اسکریپت‌ها از همان release می‌آیند تا نسخه‌ی کد و استقرار یکی باشد.
$remote = "tar -xzf /srv/noroset/incoming/noroset-$sha.tar.gz -O ./deploy/ops/activate.sh | bash -s -- $sha"
Invoke-Checked ssh @($Server, $remote)
