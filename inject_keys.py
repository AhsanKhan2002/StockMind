import os
import sys

finnhub_key = os.environ.get('FINNHUB_KEY', '')
groq_key = os.environ.get('GROQ_KEY', '')

if not finnhub_key or not groq_key:
    print('ERROR: Missing keys')
    sys.exit(1)

with open('js/services/finnhub.js', 'r') as f:
    content = f.read()
content = content.replace('FINNHUB_KEY_PLACEHOLDER', finnhub_key)
with open('js/services/finnhub.js', 'w') as f:
    f.write(content)
print('Finnhub key injected')

with open('js/services/gemini.js', 'r') as f:
    content = f.read()
content = content.replace('GROQ_KEY_PLACEHOLDER', groq_key)
with open('js/services/gemini.js', 'w') as f:
    f.write(content)
print('Groq key injected')
