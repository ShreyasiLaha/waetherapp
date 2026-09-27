import os, glob, re

files = glob.glob('*.html')

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Replace radial gradients
    content = re.sub(
        r'background:\s*radial-gradient\([^)]+\);',
        "background: url('bg.jpg') center/cover no-repeat fixed;",
        content
    )
    
    # For map.html which has background-color: var(--bg-dark);
    content = re.sub(
        r'background-color:\s*var\(--bg-dark\);',
        "background: url('bg.jpg') center/cover no-repeat fixed;",
        content
    )
    
    # Write back
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
        print(f'Updated {f}')
