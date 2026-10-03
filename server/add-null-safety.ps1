# Read the file
$filePath = "src/controllers/leadController.ts"
$content = Get-Content $filePath -Raw

# Add null safety before quadrant calculation
$oldPattern = "        // Auto-calculate quadrant based on score \+ BANT\r\n        try \{\r\n            data\.quadrant = calculateQuadrant\(data\);"

$newPattern = @"
        // Auto-calculate quadrant based on score + BANT
        try {
            // Ensure data is valid before passing to calculateQuadrant
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid data object for quadrant calculation');
            }
            data.quadrant = calculateQuadrant(data);
"@

$content = $content -replace [regex]::Escape($oldPattern), $newPattern

# Write back
$content | Set-Content $filePath -NoNewline

Write-Host "Null safety added successfully"
