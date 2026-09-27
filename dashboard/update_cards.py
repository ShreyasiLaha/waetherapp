import glob

css_block = """
    /* Universal Card Hover Effects */
    .summary-card, .model-card, .alert-card, .card, .viz-container {
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
      position: relative;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    }
    .summary-card::after, .model-card::after, .alert-card::after, .card::after, .viz-container::after {
      content: '';
      position: absolute;
      top: 0; left: -100%;
      width: 50%; height: 100%;
      background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1), transparent);
      transform: skewX(-20deg);
      transition: left 0.7s ease;
      z-index: 10;
      pointer-events: none;
    }
    .summary-card:hover, .model-card:hover, .alert-card:hover, .card:hover, .viz-container:hover {
      transform: translateY(-6px) !important;
      border-color: #38bdf8 !important;
      box-shadow: 0 10px 25px rgba(56, 189, 248, 0.2) !important;
    }
    .summary-card:hover::after, .model-card:hover::after, .alert-card:hover::after, .card:hover::after, .viz-container:hover::after {
      left: 200%;
    }
"""

files = glob.glob('*.html')
for f in files:
    if f == 'landing.html':
        continue
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    if 'Universal Card Hover Effects' not in content:
        content = content.replace('</style>', css_block + '</style>')
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
            print(f'Updated {f}')
