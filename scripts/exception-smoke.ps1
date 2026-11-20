$ErrorActionPreference = "Stop"
$base = "http://localhost:4000"

function Post($path, $body, $token=$null) {
  $headers = @{ "Content-Type"="application/json" }
  if ($token) { $headers.Authorization = "Bearer $token" }
  try {
    return Invoke-RestMethod -Uri "$base$path" -Method POST -Headers $headers -Body ($body | ConvertTo-Json -Depth 6)
  } catch {
    return @{ __error = $true; message = $_.ErrorDetails.Message }
  }
}
function Get($path, $token=$null) {
  $headers = @{}
  if ($token) { $headers.Authorization = "Bearer $token" }
  try {
    return Invoke-RestMethod -Uri "$base$path" -Headers $headers
  } catch {
    return @{ __error = $true; message = $_.ErrorDetails.Message }
  }
}

$ts = [int](Get-Date -UFormat %s)
$a = Post "/api/auth/register" @{ email="ex_a$ts@seoro.test"; password="password123"; name="예외A" }
$b = Post "/api/auth/register" @{ email="ex_b$ts@seoro.test"; password="password123"; name="예외B" }
$c = Post "/api/auth/register" @{ email="ex_c$ts@seoro.test"; password="password123"; name="예외C" }

$room = Post "/api/couples" @{} $a.accessToken
$code = $room.invite.invitationCode
$token = $room.invite.token

# used invite twice
$null = Post "/api/couples/join" @{ invitationCode=$code } $b.accessToken
$dup = Post "/api/couples/join" @{ invitationCode=$code } $c.accessToken
Write-Host "DUP_INVITE_BLOCKED=$($null -ne $dup.__error)"

# regenerate then old code
$room2user = Post "/api/auth/register" @{ email="ex_d$ts@seoro.test"; password="password123"; name="예외D" }
$room2 = Post "/api/couples" @{} $room2user.accessToken
$oldCode = $room2.invite.invitationCode
$regen = Post "/api/couples/invites/regenerate" @{} $room2user.accessToken
$oldUse = Post "/api/couples/join" @{ invitationCode=$oldCode } $c.accessToken
Write-Host "OLD_CODE_AFTER_REGEN_BLOCKED=$($null -ne $oldUse.__error)"

# preview
$preview = Get "/api/couples/invites/preview?token=$([uri]::EscapeDataString($token))"
Write-Host "PREVIEW_USED_OR_UNUSABLE=$($preview.usable -eq $false)"

# IDOR: B cannot get A's submission file if any
$unauth = Get "/api/admin/users"
Write-Host "ADMIN_WITHOUT_TOKEN_BLOCKED=$($null -ne $unauth.__error)"

$nonAdminAdmin = Get "/api/admin/users" $a.accessToken
Write-Host "ADMIN_AS_USER_BLOCKED=$($null -ne $nonAdminAdmin.__error)"

# disclosure before mutual
$mutualEarly = Get "/api/reports/mutual" $a.accessToken
Write-Host "MUTUAL_BEFORE_CONSENT_BLOCKED=$($null -ne $mutualEarly.__error)"

Write-Host "EXCEPTION_SMOKE_DONE"
