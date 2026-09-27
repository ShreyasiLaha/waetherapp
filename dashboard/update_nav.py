import os

new_links = """      <a href="regional.html" class="nav-link">📍 Regional Forecast</a>
      <a href="skill.html" class="nav-link">🧠 Model Skill</a>
      <a href="report.html" class="nav-link">📋 Forecast Report</a>
"""

files = ['index.html', 'map.html', 'comparison.html', 'weights.html', 'analysis.html', 'alerts.html']
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    if 'regional.html' not in content:
        content = content.replace('    </nav>', new_links + '    </nav>')
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
            print(f'Updated {f}')
