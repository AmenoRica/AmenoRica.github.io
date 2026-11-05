"""Run with fonttools + brotli installed; generated WOFF2 files are committed."""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
import re
root=Path(__file__).resolve().parents[1]/'public'
fonts=root/'assets/fonts'
def save(source,target,unicodes=None,text=None):
 font=TTFont(source)
 if unicodes is not None or text is not None:
  options=subset.Options();options.layout_features=['*']
  sub=subset.Subsetter(options=options)
  if text is not None:sub.populate(text=text)
  else:sub.populate(unicodes=unicodes)
  sub.subset(font)
 font.flavor='woff2';font.save(target)
for source in fonts.glob('*.ttf'):
 save(source,source.with_suffix('.woff2'),text='weB*LOGALLAmenoRicaW' if source.name=='blog-bodoni-moda.ttf' else None)
source=fonts/'pretendard-variable.woff2'
points=set(TTFont(source).getBestCmap())
parts=fonts/'pretendard';parts.mkdir(exist_ok=True)
faces=[]
for block in sorted({point//256 for point in points}):
 chars={point for point in points if point//256==block}
 name='latin' if block==0 else f'{block:04x}'
 save(source,parts/(name+'.woff2'),unicodes=chars)
 ranges=f'U+{block*256:X}-{block*256+255:X}'
 faces.append(f"@font-face {{ font-family: 'Pretendard'; font-style: normal; font-weight: 100 900; font-display: block; src: url('./fonts/pretendard/{name}.woff2') format('woff2'); unicode-range: {ranges}; }}")
for path in [root/'assets/fonts.css',root/'style.css',root/'blog/list.css',root/'blog/article.css',root/'blog/logos.css']:
 css=path.read_text()
 css=re.sub(r"@font-face\s*\{[^}]*font-family: 'Pretendard'[^}]*\}",'',css)
 css=re.sub(r'\.ttf(?:\?v=subset)?', '.woff2',css).replace("format('truetype')","format('woff2')").replace('font-display: swap','font-display: block')
 if path.name=='fonts.css':
  css+='\n'+'\n'.join(faces)+'\n'
  if 'html.font-loading' not in css:css+='html.font-loading [data-fonts]:not(.fonts-ready) { visibility: hidden; }\n'
 path.write_text(css)
