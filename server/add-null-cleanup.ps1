# Read the file
$filePath = "src/controllers/leadController.ts"
$content = Get-Content $filePath -Raw

# Add null cleanup before Prisma create
$oldPattern = "        const lead = await prisma.lead.create\(\{"
$newPattern = @"
        // Remove all null and undefined values to avoid Prisma validation errors
        Object.keys(data).forEach(key => {
            if (data[key] === null || data[key] === undefined || data[key] === '') {
                delete data[key];
            }
        });

        const lead = await prisma.lead.create({
"@

$content = $content -replace [regex]::Escape($oldPattern), $newPattern

# Write back
$content | Set-Content $filePath -NoNewline

Write-Host "Null cleanup added successfully"
