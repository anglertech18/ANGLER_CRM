# Read the file
$filePath = "src/cron/quadrantCron.ts"
$content = Get-Content $filePath -Raw

# Replace the line
$content = $content -replace "if \(\!lead\.expected_closure_date\) continue;", "if (!lead || !lead.expected_closure_date) continue;"

# Write back
$content | Set-Content $filePath -NoNewline

Write-Host "Cron job fixed successfully"
