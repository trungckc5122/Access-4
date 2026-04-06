$utf8NoBOM = New-Object System.Text.UTF8Encoding($false)
$directory = $PSScriptRoot
if (-not $directory) { $directory = "." }
$skip = @("index.html", "dashboard.html", "access-theme.css", "test.html", "https.docx", "migrate_theme.py", "migrate_theme.ps1", "repair_encoding.ps1", "deep_fix_encoding.ps1")

# We need the 1252 encoding (Western European/ANSI)
$ansi = [System.Text.Encoding]::GetEncoding(1252)

# Use Unicode escapes for identification pattern to avoid script encoding issues
# This regex searches for common double-UTF8 markers like Ã (0xC3), Â (0xC2), etc.
$pattern = "[\\u00C3\\u00C2\\u00E1]"
$unescapedPattern = [regex]::Unescape($pattern)

Write-Host "Starting emergency encoding repair (ASCII-safe mode)..." -ForegroundColor Gold

$files = Get-ChildItem -Path $directory -Filter *.html
foreach ($file in $files) {
    if ($skip -contains $file.Name) { continue }

    $garbledText = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    
    if ($garbledText -match $unescapedPattern) {
        try {
            $bytes = $ansi.GetBytes($garbledText)
            $fixedText = [System.Text.Encoding]::UTF8.GetString($bytes)
            
            if ($fixedText -ne $garbledText) {
                [System.IO.File]::WriteAllText($file.FullName, $fixedText, $utf8NoBOM)
                Write-Host "Restored: $($file.Name)" -ForegroundColor Green
            }
        } catch {
            Write-Warning "Failed on $($file.Name)"
        }
    }
}

Write-Host "Repair complete." -ForegroundColor Cyan
