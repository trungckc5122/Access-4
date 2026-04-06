$utf8NoBOM = New-Object System.Text.UTF8Encoding($false)
$dir = $PSScriptRoot
if (-not $dir) { $dir = "c:\Users\trungckc5122\Desktop\Giáo trình\ôn theo module\html" }

# 1. Surgical fix for Toggle Button in all files
$title = [regex]::Unescape("Chuy\u1ec3n ch\u1ebf \u0111\u1ed9 S\u00e1ng/T\u1ed1i")
$sun = [regex]::Unescape("\u2600\uFE0F")
$moon = [regex]::Unescape("\uD83C\uDF19")

$correctToggle = @"
<button class="theme-toggle-btn" id="theme-toggle" title="$title">
    <span class="icon-sun">$sun</span>
    <span class="icon-moon">$moon</span>
</button>
"@

Write-Host "Re-applying correct Toggle Button..."
$files = Get-ChildItem "$dir\*.html"
foreach ($f in $files) {
    if ($f.Name -match "index|dashboard|access-theme") { continue }
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    if ($content -match "theme-toggle-btn") {
        $content = [regex]::Replace($content, "(?is)<button class=`"theme-toggle-btn`".*?</button>", $correctToggle)
        [System.IO.File]::WriteAllText($f.FullName, $content, $utf8NoBOM)
    }
}

# 2. Fix 1b.html duplication
$path1b = "$dir\1b.html"
if (Test-Path $path1b) {
    $c = [System.IO.File]::ReadAllText($path1b, [System.Text.Encoding]::UTF8)
    if ($c.StartsWith("<!DOCTYPE html>")) {
        $firstHeadEnd = $c.IndexOf("</head>")
        if ($firstHeadEnd -gt 0) {
            $afterFirstHead = $c.Substring($firstHeadEnd + 7).TrimStart()
            if ($afterFirstHead.StartsWith("<!DOCTYPE html>")) {
                # Yes, it's duplicated. Remove the first part.
                $c = $afterFirstHead
                [System.IO.File]::WriteAllText($path1b, $c, $utf8NoBOM)
                Write-Host "Cleaned up 1b.html."
            }
        }
    }
}

Write-Host "Done."
