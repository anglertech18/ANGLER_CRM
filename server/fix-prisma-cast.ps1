# Read the file
$filePath = "src/controllers/leadController.ts"
$content = Get-Content $filePath -Raw

# Replace to ensure proper casting - this time targeting the exact line
$oldPattern = "const lead = await prisma\.lead\.create\(\{ data: data as any \}\);"
$newPattern = "const lead = await prisma.lead.create({ data } as any);"

$content = $content -replace [regex]::Escape($oldPattern), $newPattern

# Write back
$content | Set-Content $filePath -NoNewline

Write-Host "Prisma create fixed with proper casting"
