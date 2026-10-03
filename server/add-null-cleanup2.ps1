# Read the file
$filePath = "src/controllers/leadController.ts"
$lines = Get-Content $filePath

# Find the line with "const lead = await prisma.lead.create"
$lineIndex = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "const lead = await prisma\.lead\.create") {
        $lineIndex = $i
        break
    }
}

if ($lineIndex -gt 0) {
    # Insert null cleanup before the create line
    $newLines = $lines[0..($lineIndex-1)]
    $newLines += ""
    $newLines += "        // Remove all null and undefined values to avoid Prisma validation errors"
    $newLines += "        Object.keys(data).forEach(key => {"
    $newLines += "            if (data[key] === null || data[key] === undefined || data[key] === '') {"
    $newLines += "                delete data[key];"
    $newLines += "            }"
    $newLines += "        });"
    $newLines += $lines[$lineIndex..($lines.Length-1)]
    
    $newLines | Set-Content $filePath
    Write-Host "Null cleanup added at line $lineIndex"
} else {
    Write-Host "Line not found"
}
