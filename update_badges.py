import os
import re
import glob

files = glob.glob('lis-pet1-*.html')

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update correct-answer-badge CSS
    # Change "display: inline-block;" to "display: none;" inside .correct-answer-badge
    content = re.sub(
        r'(\.correct-answer-badge\s*\{[^}]*?display:\s*)inline-block(;)',
        r'\1none\2',
        content,
        flags=re.DOTALL
    )

    # 2. Add an explicit class to make eye-icon display none by default
    # Some files have .eye-icon { display: none; } but just to be safe:
    content = re.sub(
        r'(\.eye-icon\s*\{[^}]*?display:\s*)inline-block(;)',
        r'\1none\2',
        content,
        flags=re.DOTALL
    )

    # 3. Inside submitBtn.addEventListener('click', ...), remove eye-icon logic
    content = re.sub(
        r'document\.querySelectorAll\([\',"]\.eye-icon[\',"]\)\.forEach\(icon => icon\.style\.display = [\',"]inline-block[\',"]\);',
        r'',
        content
    )

    # 4. Modify the explanation alert inside submitBtn.addEventListener to just guide the user
    # "Nhấn vào biểu tượng 👁️ để xem vị trí đáp án trong transcript." or similar varying texts.
    content = re.sub(
        r'<p>Nhấn vào biểu tượng 👁️[^<]*</p>',
        r'<p>Nhấn nút <strong>Xem giải thích</strong> để hiện đáp án đúng và chi tiết.</p>',
        content
    )

    # 5. Inside explainBtn.addEventListener('click', ...), add the logic back
    # Find: explanationMode = true;
    # Replace with: explanationMode = true; \n            document.querySelectorAll('.eye-icon, .correct-answer-badge').forEach(el => el.style.display = 'inline-block');
    content = re.sub(
        r'(explanationMode\s*=\s*true;)',
        r"\1\n            document.querySelectorAll('.eye-icon, .correct-answer-badge').forEach(el => el.style.display = 'inline-block');",
        content
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Updated {filepath}")
