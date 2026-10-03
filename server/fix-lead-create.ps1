# Read the file
$filePath = "src/controllers/leadController.ts"
$content = Get-Content $filePath -Raw

# Replace the problematic line
$content = $content -replace "const lead = await prisma.lead.create\(\{ data \}\);", "const lead = await prisma.lead.create({ data: data as any });"

# Write back
$content | Set-Content $filePath -NoNewline

Write-Host "File patched successfully"
