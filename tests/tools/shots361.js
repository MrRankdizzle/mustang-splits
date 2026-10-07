// Phone-size screenshots of every stopwatch tile state (3.6.1), in WebKit: each state on its own, both layouts, at
// the default iOS text size (17 px) and the largest regular one (23 px), plus Edit mode. Fake names.
// node tools/shots361.js <before|after> [url]  ->  docs/screenshots-tiles/<label>-<layout>-<text>-<state>.png
const S=require('./tilestates.js'), path=require('path'), fs=require('fs');
const label=process.argv[2]||'after', url=process.argv[3]||'http://localhost:8765/', OUT=path.join(__dirname,'..','..','docs','screenshots-tiles');
fs.mkdirSync(OUT,{recursive:true});
(async()=>{ const b=await S.webkit.launch(); let n=0;
  for(const compact of [false,true]) for(const text of [17,23]){ const L=`${compact?'compact':'regular'}-${text}`;
    const ctxOpts={compact,text,url}; const p=await S.open(b,ctxOpts); await p.setViewportSize({width:390,height:844});
    const T=await S.build(p);
    for(const [k,id] of Object.entries(T)){ const el=await p.$(`.watch[data-id="${id}"]`); if(!el) continue; await el.evaluate(n=>{ n.scrollIntoView({block:'start'}); window.scrollBy(0,-110); }); await S.W(200); await el.screenshot({path:path.join(OUT,`${label}-${L}-${k}.png`)}); n++; }
    await S.editMode(p,[T.running,T.split]); await p.evaluate(()=>window.scrollTo(0,0)); await S.W(300);
    await p.screenshot({path:path.join(OUT,`${label}-${L}-edit-top.png`)}); await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight)); await S.W(400);
    await p.screenshot({path:path.join(OUT,`${label}-${L}-edit-bottom.png`)}); n+=2;
    await p.context().close(); }
  await b.close(); console.log('screenshots in',OUT,n); })();
