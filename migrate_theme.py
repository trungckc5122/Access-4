import os
import re

directory = r'c:\Users\trungckc5122\Desktop\Giáo trình\ôn theo module\html'
files_to_skip = ['index.html', 'dashboard.html', 'access-theme.css', 'test.html', 'https.docx']

# Regex patterns
style_regex = re.compile(r'<style>.*?</style>', re.DOTALL)
body_regex = re.compile(r'<body.*?>', re.IGNORECASE)
script_end_regex = re.compile(r'</body>', re.IGNORECASE)
h1_style_regex = re.compile(r'<h1[^>]*style=["\'][^"\']*["\'][^>]*>', re.IGNORECASE)
h1_align_regex = re.compile(r'<h1[^>]*align=["\'][^"\']*["\'][^>]*>', re.IGNORECASE)

toggle_html = """
<button class="theme-toggle-btn" id="theme-toggle" title="Chuyển chế độ Sáng/Tối">
    <span class="icon-sun">☀️</span>
    <span class="icon-moon">🌙</span>
</button>
"""

theme_script = """
<script>
// ==================== DARK MODE TOGGLE ====================
(function() {
    const toggle = document.getElementById('theme-toggle');
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.setAttribute('data-theme', 'dark');
    toggle.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
})();
</script>
"""

print(f"Starting migration in {directory}...")

processed_count = 0
for filename in os.listdir(directory):
    if filename.endswith(".html") and filename not in files_to_skip:
        filepath = os.path.join(directory, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Skip if already migrated
            if 'href="access-theme.css"' in content or 'href=\'access-theme.css\'' in content:
                # Still check for H1/Toggle/Script injection though if needed, 
                # but standard practice is to assume if CSS link is there, it's done.
                continue

            # 1. Replace style with link
            new_content = style_regex.sub('<link rel="stylesheet" href="access-theme.css">', content)
            
            # 2. Add toggle button after body
            if '<button class="theme-toggle-btn"' not in new_content:
                match = body_regex.search(new_content)
                if match:
                    body_tag = match.group(0)
                    new_content = new_content.replace(body_tag, body_tag + toggle_html)
            
            # 3. Add script before </body>
            if '// ==================== DARK MODE TOGGLE ====================' not in new_content:
                if '</body>' in new_content.lower():
                    new_content = script_end_regex.sub(theme_script + '</body>', new_content)
                else:
                    new_content += theme_script
                
            # 4. Clean up H1 styles
            new_content = h1_style_regex.sub('<h1>', new_content)
            new_content = h1_align_regex.sub('<h1>', new_content)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Successfully migrated: {filename}")
                processed_count += 1
            else:
                print(f"No changes needed for: {filename}")
                
        except Exception as e:
            print(f"Error processing {filename}: {e}")

print(f"Migration completed. Total files processed: {processed_count}")
