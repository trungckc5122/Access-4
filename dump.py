import os
import re

folder = r"C:\Users\trungckc5122\Desktop\Giáo trình\ôn theo module\main html\Access 4"
for file in os.listdir(folder):
    if file.endswith('.html'):
        path = os.path.join(folder, file)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            match = re.search(r'function selectWordFromBank\(wordId\)\s*\{[^\}]+\}', content)
            if match:
                print("====================================")
                print(f"File: {file}")
                print(match.group(0))
            else:
                match2 = re.search(r'window\.selectWordFromBank = function\(wordId\)\s*\{[^\}]+\}', content)
                if match2:
                    print("====================================")
                    print(f"File: {file}")
                    print(match2.group(0))
