import os
import glob

link = '      <a href="operations.html" class="nav-link">⚡ Operational Console</a>\n'

for f in glob.glob('dashboard/*.html'):
    if 'operations.html' in f:
        continue
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    if 'operations.html' not in content and 'index.html' in content:
        # insert after index.html line
        lines = content.splitlines(keepends=True)
        new_lines = []
        for line in lines:
            new_lines.append(line)
            if 'href="index.html"' in line:
                new_lines.append(link)
        with open(f, 'w', encoding='utf-8') as file:
            file.write(''.join(new_lines))
        print(f'Updated {f}')

