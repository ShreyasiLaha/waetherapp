import glob
import re

files = glob.glob('*.html')

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    changed = False
    
    # 1. Remove glowing-box class
    if 'glowing-box' in content:
        content = content.replace(' glowing-box', '')
        content = content.replace('glowing-box ', '')
        content = content.replace('glowing-box', '')
        changed = True
        
    # 2. Remove the old spin-glow CSS block
    if '@property --angle' in content:
        # We can just use a regex to strip the block, or string replacement
        # Let's find the start of the block
        start_idx = content.find('/* Moving Glow Border Animation */')
        if start_idx != -1:
            end_idx = content.find('}', content.find('@keyframes spin-glow')) + 1
            if end_idx > 1:
                content = content[:start_idx] + content[end_idx:]
                changed = True
                
    if changed:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
            print(f'Cleaned up {f}')
