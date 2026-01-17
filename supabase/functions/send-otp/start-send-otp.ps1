$env:SHOW_OTP_IN_RESPONSE = 'true'
$env:SKIP_DB = 'true'
Set-Location 'C:\Users\Admin\Desktop\agnel final\secure-access-hub-main\supabase\functions\send-otp'
deno run --allow-net --allow-env --allow-read index.ts
