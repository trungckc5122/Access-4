$utf8NoBOM = New-Object System.Text.UTF8Encoding($false)
$directory = $PSScriptRoot
if (-not $directory) { $directory = "." }
$skipFiles = @("index.html", "dashboard.html", "access-theme.css", "test.html", "https.docx", "migrate_theme.py", "migrate_theme.ps1")

# Create the correct strings using Unicode escapes to bypass script encoding issues
$toggleTitle = [regex]::Unescape("Chuy\u1ec3n ch\u1ebf \u0111\u1ed9 S\u00e1ng/T\u1ed1i")
$sunIcon = [regex]::Unescape("\u2600\uFE0F")
$moonIcon = [regex]::Unescape("\uD83C\uDF19")

$correctToggle = @"
<button class="theme-toggle-btn" id="theme-toggle" title="$toggleTitle">
    <span class="icon-sun">$sunIcon</span>
    <span class="icon-moon">$moonIcon</span>
</button>
"@

Write-Host "Unscrambling encoding for all HTML files..." -ForegroundColor Cyan

$files = Get-ChildItem -Path $directory -Filter *.html
$scanned = 0
$fixed = 0

foreach ($file in $files) {
    if ($skipFiles -contains $file.Name) { continue }
    $scanned++

    # Explicitly read bytes and convert to UTF8 to avoid being "helpful"
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $content = [System.Text.Encoding]::UTF8.GetString($bytes)
    
    if ($content -match "theme-toggle-btn") {
        $original = $content
        # Replace whatever is inside the button block with the correct Unicode strings
        $content = [regex]::Replace($content, "(?is)<button class=`"theme-toggle-btn`".*?</button>", $correctToggle)
        
        if ($content -ne $original) {
            # Write back as UTF8 No BOM
            [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBOM)
            Write-Host "Restored encoding for: $($file.Name)" -ForegroundColor Green
            $fixed++
        }
    }
}

Write-Host "Completed. Scanned $scanned files, fixed $fixed." -ForegroundColor Cyan
