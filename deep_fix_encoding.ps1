$utf8NoBOM = New-Object System.Text.UTF8Encoding($false)
$directory = $PSScriptRoot
if (-not $directory) { $directory = "." }
$skipFiles = @("index.html", "dashboard.html", "access-theme.css", "test.html", "https.docx", "migrate_theme.py", "migrate_theme.ps1")

# Use a simpler replacement list for the most common garbled characters
# We use .Replace() with literals first
$replacements = @(
    @("Ã ", "à"), @("Ã¡", "á"), @("Ã¢", "â"), @("Ã£", "ã"), @("Ã¨", "è"), @("Ã©", "é"), @("Ãª", "ê"), @("Ã¬", "ì"), @("Ã­", "í"), @("Ã²", "ò"), @("Ã³", "ó"), @("Ã´", "ô"), @("Ãµ", "õ"), @("Ã¹", "ù"), @("Ãº", "ú"), @("Ã½", "ý"),
    @("Ä‘", "đ"), @("Ä ", "Đ"), @("Æ¡", "ơ"), @("Æ°", "ư"), @("Æ ", "Ơ"), @("Æ¯", "Ư"),
    @("áº¡", "ạ"), @("áº£", "ả"), @("áº¥", "ấ"), @("áº§", "ầ"), @("áº©", "ẩ"), @("áº«", "ẫ"), @("áº­", "ậ"),
    @("áº®", "ắ"), @("áº°", "ằ"), @("áº²", "ẳ"), @("áº´", "ẵ"), @("áº¶", "ặ"),
    @("áº¹", "ẹ"), @("áº»", "ẻ"), @("áº½", "ẽ"), @("áº¿", "ế"), @("á» ", "ề"), @("á»ƒ", "ể"), @("á»…", "ễ"), @("á»‡", "ệ"),
    @("á»‹", "ị"), @("á»‰", "ỉ"), @("á»‹", "ĩ"),
    @("á» ", "ọ"), @("á» ", "ỏ"), @("á»‘", "ố"), @("á»“", "ồ"), @("á»•", "ổ"), @("á»—", "ỗ"), @("á»™", "ộ"),
    @("á»›", "ớ"), @("á» ", "ờ"), @("á»Ÿ", "ở"), @("á»¡", "ỡ"), @("á»£", "ợ"),
    @("á»¥", "ụ"), @("á»§", "ủ"), @("á»©", "ứ"), @("á»«", "ừ"), @("á»­", "ử"), @("á»¯", "ữ"), @("á»±", "ự"),
    @("á»³", "ỳ"), @("á»µ", "ỵ"), @("á»·", "ỷ"), @("á»¹", "ỹ"),
    @("â˜€ï¸ ", "☀️"), @("ðŸŒ™", "🌙"), @("ðŸ‘ ï¸ ", "👁️"), @("ðŸ”Š", "🔊"), @("âˆ’", "−"), @("â–¼", "▼")
)

Write-Host "Unscrambling Vietnamese text..." -ForegroundColor Cyan

$files = Get-ChildItem -Path $directory -Filter *.html
foreach ($file in $files) {
    if ($skipFiles -contains $file.Name) { continue }

    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $original = $content

    foreach ($pair in $replacements) {
        $old = $pair[0]
        $new = $pair[1]
        if ($content.Contains($old)) {
            $content = $content.Replace($old, $new)
        }
    }

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBOM)
        Write-Host "Fixed: $($file.Name)" -ForegroundColor Green
    }
}

Write-Host "Encoding cleanup completed." -ForegroundColor Cyan
