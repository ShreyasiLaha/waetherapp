import os, glob

files = glob.glob('*.html')

video_html = '<video id="bg-video" autoplay loop muted playsinline style="position: fixed; top: 50%; left: 50%; min-width: 100%; min-height: 100%; width: auto; height: auto; z-index: -3; transform: translateX(-50%) translateY(-50%); object-fit: cover; opacity: 0.3;"></video>\n'
script_html = '<script src="weather-bg.js"></script>\n</body>'

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    if 'bg-video' not in content:
        # Inject video after body tag
        content = content.replace('<body>', '<body>\n' + video_html)
        
        # Inject script before closing body tag
        content = content.replace('</body>', script_html)
        
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
            print(f'Updated {f}')
