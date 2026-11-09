"""Build the V8 book collection from reviewed source excerpts, preserving existing reels.
Run from repository root. Existing V8 sections are replaced, so reruns are idempotent.
"""
import json,re,html
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE='https://chiefteller.github.io/Zuga'
data=json.loads((ROOT/'content/book-reels-v8.json').read_text())
rows=data['reels'];books=data['books'];new_ids={r['slug'] for r in rows}
esc=lambda s:html.escape(str(s),quote=True)
section_re=re.compile(r'<section\b[^>]*\bdata-reel="([^"]+)"[^>]*>.*?</section>',re.S)
index=(ROOT/'index.html').read_text()
old=[(m.group(1),m.group(0)) for m in section_re.finditer(index) if m.group(1) not in new_ids]
assert len(old)==36
order=[slug for slug,_ in old if slug!='tellerbp-library']+[r['slug'] for r in rows]+['tellerbp-library']
total=len(order)
ordinal={slug:i+1 for i,slug in enumerate(order)}
def renumber(section,slug):
 n=ordinal[slug]
 section=re.sub(r'aria-label="Reel \d+:',f'aria-label="Reel {n}:',section)
 section=re.sub(r'(<span class="reel-index"[^>]*>).*?</span>',rf'\g<1>{n:02} / {total}</span>',section)
 section=re.sub(r'aria-label="עמוד עצמאי לריל \d+"',f'aria-label="עמוד עצמאי לריל {n}"',section)
 return section

def reel(r,standalone=False):
 b=books[r['book']];slug=r['slug'];n=ordinal[slug];h='h1' if standalone else 'h2'
 theme=b['theme'];theme='dawn' if theme=='light' else theme
 quote=esc(r['quote']).replace('\n','<br>')
 return f'''<section class="reel reel-story reel-book-v8 reel--{slug}" data-reel="{slug}" data-title="{esc(r['title'])} | ZUGA" id="reel-{slug}" aria-label="Reel {n}: {esc(r['title'])}" lang="he"><div class="scene-visual" aria-hidden="true"></div><div class="scene-sweep" aria-hidden="true"></div><div class="noise" aria-hidden="true"></div><div class="story-reel story--{theme}" dir="rtl"><div class="story-light-scape" aria-hidden="true"><div class="story-geometry"></div><div class="story-glyph">{b['glyph']}</div><div class="story-orbit story-orbit--a"></div><div class="story-orbit story-orbit--b"></div></div>
<div class="story-content story-content--quote"><p class="story-kicker">{esc(b['title'])} <span aria-hidden="true">/</span> ZUGA STORIES</p><{h} class="story-title">{esc(r['title'])}</{h}><p class="story-hook">{esc(r['hook'])}</p><figure class="story-quotation"><blockquote>״{quote}״</blockquote><figcaption>מתוך הספר · {esc(r['chapter'])}</figcaption></figure><div class="story-answer"><span>קריאה בקטע</span><p>{esc(r['body'])}</p></div><div class="story-connection"><span>מחשבה להמשך</span><p>{esc(r['takeaway'])}</p></div><div class="story-source"><div class="story-source-meta"><span>{esc(b['title'])}</span><small>{esc(r['chapter'])}</small></div><a href="{b['url']}" target="_blank" rel="noopener noreferrer" class="source-pill">הספר המלא ↗</a></div><details class="story-editorial"><summary>על הקטע והעיבוד</summary><p>הציטוט מובא מתוך הספר. הכותרת, השאלה והפסקאות שסביבו הן עיבוד לקריאה קצרה.</p></details></div></div><span class="reel-index" aria-hidden="true">{n:02} / {total}</span><a class="reel-bottom" href="/Zuga/reels/{slug}/" aria-label="עמוד עצמאי לריל {n}"><span>עמוד הריל</span><svg viewBox="0 0 24 24" stroke-width="1.8"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></a></section>'''

# Build one shared directory, preserving the labels of existing entries.
dir_re=re.compile(r'(<div class="directory-list">)(.*?)(</div>)',re.S)
old_dir=dir_re.search(index).group(2)
items={}
for m in re.finditer(r'<a class="directory-item"[^>]*data-target="([^"]+)".*?</a>',old_dir,re.S):
 if m.group(1) not in new_ids:items[m.group(1)]=m.group(0)
for r in rows:
 b=books[r['book']];slug=r['slug']
 items[slug]=f'<a class="directory-item" href="/Zuga/reels/{slug}/" data-target="{slug}" data-search="{esc((r["title"]+" "+r["hook"]+" "+b["title"]+" "+r["chapter"]).lower())}"><span>{ordinal[slug]:02}</span><strong>{esc(r["title"])}</strong><small>{esc(b["title"])}</small></a>'
new_dir=''.join(re.sub(r'<span>\d+</span>',f'<span>{ordinal[s]:02}</span>',items[s],count=1) for s in order)
def common(s):
 s=dir_re.sub(lambda m:m.group(1)+new_dir+m.group(3),s)
 s=re.sub(r'aria-valuemax="\d+"',f'aria-valuemax="{total}"',s)
 s=re.sub(r'(id="reel-current"[^>]*>)\d+ / \d+',rf'\g<1>01 / {total}',s)
 return section_re.sub(lambda m:renumber(m.group(0),m.group(1)),s)
# Keep all existing content, with the library reel still last.
sections={slug:renumber(s,slug) for slug,s in old}
sections.update({r['slug']:reel(r) for r in rows})
first=next(section_re.finditer(index));last=list(section_re.finditer(index))[-1]
index=index[:first.start()]+''.join(sections[s] for s in order)+index[last.end():]
index=common(index)
ld_re=re.compile(r'(<script type="application/ld\+json">)(.*?)(</script>)',re.S)
def update_home_ld(m):
 ld=json.loads(m.group(2));collection=next(g for g in ld['@graph'] if g['@type']=='CollectionPage')
 olditems={v['url'].rstrip('/').split('/')[-1]:v for v in collection['mainEntity']['itemListElement']}
 for r in rows:olditems[r['slug']]={'@type':'ListItem','url':BASE+'/reels/'+r['slug']+'/','name':r['title']+' | ZUGA'}
 collection['mainEntity']['itemListElement']=[dict(olditems[s],position=ordinal[s]) for s in order]
 return m.group(1)+json.dumps(ld,ensure_ascii=False)+m.group(3)
index=ld_re.sub(update_home_ld,index)
(ROOT/'index.html').write_text(index)
# Existing standalone pages receive the expanded directory and correct counts.
for slug,_ in old:
 p=ROOT/'reels'/slug/'index.html';p.write_text(common(p.read_text()))
template=(ROOT/'reels/dao-empty/index.html').read_text()
head=re.search(r'<head>(.*?)</head>',template,re.S).group(1)
body=re.search(r'<body>(.*?)</body>',template,re.S).group(1)
body_before=body[:body.index('<main')]
for r in rows:
 b=books[r['book']];slug=r['slug'];title=r['title']+' | ZUGA — '+b['title'];url=BASE+'/reels/'+slug+'/'
 h=re.sub(r'<title>.*?</title>','<title>'+esc(title)+'</title>',head)
 for attr,key,value in [('name','description',r['hook']),('property','og:title',title),('property','og:description',r['hook']),('property','og:url',url),('property','og:image',BASE+'/assets/og-cover.png'),('name','twitter:title',title),('name','twitter:description',r['hook']),('name','twitter:image',BASE+'/assets/og-cover.png')]:
  h=re.sub(r'<meta '+attr+'="'+key+r'" content="[^"]*">',f'<meta {attr}="{key}" content="{esc(value)}">',h)
 h=re.sub(r'<link rel="canonical" href="[^"]*">',f'<link rel="canonical" href="{url}">',h)
 ld={'@context':'https://schema.org','@type':'CreativeWork','url':url,'name':title,'headline':r['title'],'description':r['hook'],'abstract':r['body'],'inLanguage':'he','isAccessibleForFree':True,'isBasedOn':b['url'],'citation':b['url'],'creator':{'@type':'Person','name':'Nadav Teller'},'isPartOf':{'@id':BASE+'/#website'}}
 h=ld_re.sub(lambda m:m.group(1)+json.dumps(ld,ensure_ascii=False)+m.group(3),h)
 nextslug=order[ordinal[slug]] if ordinal[slug]<total else 'intro'
 tail=f'<main id="main" class="single-reel">{reel(r,True)}<div class="screen-only-page" dir="rtl"><h2>עוד בעולם זוגא</h2><p>{esc(r["hook"])}</p><div class="footer-links"><a href="/Zuga/?reel={slug}">צפייה בריל בתוך הפיד</a><a href="/Zuga/reels/{nextslug}/">לריל הבא</a><a href="/Zuga/">כל הרילים</a></div></div></main><a href="/Zuga/?reel={slug}" class="detail-nav">לכל הרילים</a><script src="/Zuga/assets/app.js" defer></script><script src="/Zuga/assets/genesis.js" defer></script><script src="/Zuga/assets/story.js" defer></script>'
 # Match the original standalone main class exactly.
 orig_main=re.search(r'<main[^>]*>',body).group(0)
 tail=tail.replace('<main id="main" class="single-reel">',orig_main,1)
 p=ROOT/'reels'/slug/'index.html';p.parent.mkdir(exist_ok=True)
 p.write_text('<!doctype html><html lang="he" dir="rtl" class="detail"><head>'+h+'</head><body>'+common(body_before+tail)+'</body></html>')
(ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join('<url><loc>'+BASE+path+'</loc></url>\n' for path in ['/']+['/reels/'+s+'/' for s in order])+'</urlset>\n')
p=ROOT/'llms.txt';text=p.read_text().split('\n## Book excerpts — V8')[0]
text+='\n## Book excerpts — V8\n\n34 additional source-grounded reels. Quoted excerpts are separate from editorial explanations. Humanity reels use prose, without formal notation.\n\n'
text+='\n'.join(f'- [{r["title"]}]({BASE}/reels/{r["slug"]}/): {books[r["book"]]["title"]}, {r["chapter"]}. {r["body"]}' for r in rows)+'\n'
p.write_text(text)
print(f'Built {len(rows)} new reels; {total} reels total; {total+1} HTML pages.')
