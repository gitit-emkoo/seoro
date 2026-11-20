$ErrorActionPreference = "Stop"
$base = "http://localhost:4000"

function Post($path, $body, $token=$null) {
  $headers = @{ "Content-Type"="application/json" }
  if ($token) { $headers.Authorization = "Bearer $token" }
  return Invoke-RestMethod -Uri "$base$path" -Method POST -Headers $headers -Body ($body | ConvertTo-Json -Depth 8)
}
function Get($path, $token=$null) {
  $headers = @{}
  if ($token) { $headers.Authorization = "Bearer $token" }
  return Invoke-RestMethod -Uri "$base$path" -Headers $headers
}

Write-Host "== Scenario A: discoverer =="
$cards = Get "/api/onboarding/cards"
if ($cards.Count -lt 4) { throw "cards missing" }
Write-Host "CARDS_OK=$($cards.Count)"

$ts = [int](Get-Date -UFormat %s)
$a = Post "/api/auth/register" @{ email="ja$ts@seoro.test"; password="password123"; name="여정A" }
$null = Post "/api/onboarding/complete" @{ selectedCodes=@("IDENTITY","ASSETS"); source="SELF" } $a.accessToken
$meA = Get "/api/auth/me" $a.accessToken
if (-not $meA.onboardingCompleted) { throw "onboarding not linked" }
Write-Host "ONBOARDING_LINKED=True"
$nextA = Get "/api/onboarding/next" $a.accessToken
Write-Host "NEXT_AFTER_ONBOARD=$($nextA.path)/$($nextA.reason)"

$room = Post "/api/couples" @{} $a.accessToken
$token = $room.invite.token
$code = $room.invite.invitationCode
Write-Host "INVITE_READY code=$code"

Write-Host "== Scenario B: invitee =="
$preview = Get "/api/couples/invites/preview?token=$([uri]::EscapeDataString($token))"
if (-not $preview.usable) { throw "preview not usable" }
$b = Post "/api/auth/register" @{ email="jb$ts@seoro.test"; password="password123"; name="여정B" }
$null = Post "/api/onboarding/complete" @{ selectedCodes=@(); source="INVITE" } $b.accessToken
$null = Post "/api/couples/join" @{ token=$token } $b.accessToken

$items = Get "/api/verification-items" $a.accessToken
$plans = Get "/api/product-plans" $a.accessToken
$basic = $plans | Where-Object { $_.code -eq "BASIC" }
$ids = @($basic.items | ForEach-Object { $_.verificationItem.id })
$null = Post "/api/scope" @{ itemIds=$ids; planCode="BASIC" } $a.accessToken
$null = Post "/api/scope" @{ itemIds=$ids; planCode="BASIC" } $b.accessToken
$null = Post "/api/scope/approve" @{ approvedItemIds=$ids } $a.accessToken
$agree = Post "/api/scope/approve" @{ approvedItemIds=$ids } $b.accessToken
if ($agree.status -ne "AGREED") { throw "not agreed" }

$order = Post "/api/orders" @{ productPlanId=$basic.id } $a.accessToken
$null = Post "/api/payments/mock-pay" @{} $a.accessToken
$paid = Post "/api/payments/mock-pay" @{} $b.accessToken
if ($paid.status -ne "PAID") { throw "not paid" }

$subsA = Get "/api/submissions/me" $a.accessToken
$tmp = Join-Path $env:TEMP "seoro-journey.png"
[IO.File]::WriteAllBytes($tmp, [Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="))
curl.exe -s -X POST "$base/api/submissions/upload" -H "Authorization: Bearer $($a.accessToken)" -F "verificationItemId=$($subsA[0].verificationItemId)" -F "file=@$tmp;type=image/png" | Out-Null

$admin = Post "/api/auth/login" @{ email="admin@seoro.local"; password="admin1234!" }
$adminSubs = Get "/api/admin/submissions" $admin.accessToken
if ($adminSubs.Count -gt 0) {
  Invoke-RestMethod -Uri "$base/api/admin/submissions/$($adminSubs[0].id)/review" -Method PATCH -Headers @{ Authorization="Bearer $($admin.accessToken)"; "Content-Type"="application/json" } -Body (@{ status="VERIFIED"; resultSummary="관리자 검토(공식 진위 아님)" } | ConvertTo-Json) | Out-Null
}

$null = Post "/api/disclosure/consent" @{} $a.accessToken
$null = Post "/api/disclosure/consent" @{} $b.accessToken
$mutual = Get "/api/reports/mutual" $a.accessToken
Write-Host "MUTUAL_OK items=$($mutual.items.Count)"

$nextFinal = Get "/api/onboarding/next" $a.accessToken
Write-Host "NEXT_FINAL=$($nextFinal.path)/$($nextFinal.reason)"
Write-Host "JOURNEY_SMOKE_PASS"
