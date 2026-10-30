#!/usr/bin/env python3
"""Generate an absolute-URL sitemap after the real site domain is known."""
from pathlib import Path
from xml.sax.saxutils import escape
import sys
from urllib.parse import urlparse
if len(sys.argv)!=2:
    print('Usage: python generate_sitemap.py https://your-real-website-domain')
    raise SystemExit(2)
base=sys.argv[1].rstrip('/')
p=urlparse(base)
if p.scheme!='https' or not p.netloc:
    raise SystemExit('Use an HTTPS URL including the actual domain or GitHub Pages base path.')
root=Path(__file__).parent
pages=['index.html','about.html','programs.html','events.html','ambassadors.html','join.html','opportunities.html','team.html','media.html','contact.html','verify.html','privacy.html']
xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
for page in pages:
    location=base+'/' if page=='index.html' else base+'/'+page
    xml+=f'  <url><loc>{escape(location)}</loc></url>\n'
xml+='</urlset>\n'
(root/'sitemap.xml').write_text(xml, encoding='utf-8')
print('Generated',root/'sitemap.xml')
