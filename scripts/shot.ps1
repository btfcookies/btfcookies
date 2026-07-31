# Screenshot a local HTML file with the bundled Chromium. Dev helper only.
param(
  [Parameter(Mandatory = $true)][string]$Html,
  [Parameter(Mandatory = $true)][string]$Out,
  [int]$Width = 1400,
  [int]$Height = 900,
  [int]$DelayMs = 900,
  # Renders with prefers-reduced-motion, which is also how the fallback is verified.
  [switch]$Reduced
)

$chrome = Get-ChildItem "$env:USERPROFILE\AppData\Local\ms-playwright" -Recurse -Filter "chrome.exe" -ErrorAction SilentlyContinue |
  Select-Object -First 1 -ExpandProperty FullName
if (-not $chrome) { throw "Chromium not found under ms-playwright" }

$uri = ([System.Uri](Resolve-Path $Html).Path).AbsoluteUri
$args = @(
  '--headless', '--disable-gpu', '--hide-scrollbars', '--force-color-profile=srgb',
  "--virtual-time-budget=$DelayMs", "--window-size=$Width,$Height", "--screenshot=$Out"
)
if ($Reduced) { $args += '--force-prefers-reduced-motion' }
& $chrome @args $uri 2>$null | Out-Null
if (Test-Path $Out) { "shot: $Out ($((Get-Item $Out).Length) bytes)" } else { throw "screenshot failed" }
