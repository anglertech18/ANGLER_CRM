# Read the file
$filePath = "src/controllers/leadController.ts"
$lines = Get-Content $filePath

# Remove lines 13-19 (0-indexed: 13-19)
$newLines = $lines[0..12] + $lines[20..($lines.Length-1)]

# Write back
$newLines | Set-Content $filePath

Write-Host "Validation block removed successfully"
