$body = @{ email = 'test+dev@example.com'; name = 'Dev User'; type = 'signup' } | ConvertTo-Json
try {
    $resp = Invoke-RestMethod -Uri http://localhost:8000 -Method Post -ContentType 'application/json' -Body $body -UseBasicParsing
    Write-Output "RESPONSE: $($resp | ConvertTo-Json -Depth 5)"
} catch {
    Write-Error "Request failed: $_"
}
