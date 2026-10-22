// 3.17 screenshots (fake names only), iPhone size (390 × 844 pt, 2×), WebKit: every stopwatch row state, the row's
// sheet, the runner picker (+), a swiped row, Compact rows, a large iOS text size, light and dark.
//   node tools/shots317.js <before|after> [url]   →   docs/screenshots-stopwatch-v2/<label>-*.png
// "before" runs against the 3.16.0 code (serve the before-3.17.0 tag on another port): its rows, two columns, its ⋯ menu
// and its + New sheet.
const TS=require('./tilestates.js'), path=require('path'), fs=require('fs');
const label=process.argv[2]||'after', URL=process.argv[3]||'http://localhost:8765/';
const OUT=path.join(__dirname,'..','..','docs','screenshots-stopwatch-v2'); fs.mkdirSync(OUT,{recursive:true});
const {W}=TS; const shot=(p,f,full)=>p.screenshot({path:path.join(OUT,`${label}-${f}.png`),fullPage:!!full});
(async()=>{ const b=await TS.webkit.launch();
for(const dark of [false,true]){ const tg=dark?'dark':'light';
  const p=await TS.open(b,{url:URL,dark}); const T=await TS.build(p); await W(400); const isNew=await p.evaluate(()=>!!document.querySelector('#grid .watch.wr2'));
  await p.evaluate(()=>window.scrollTo(0,0)); await shot(p,`rows-${tg}`); await shot(p,`rows-all-${tg}`,true);
  if(!dark){
    if(isNew){ await p.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] .w-main`).click(),T.rest); await W(500); await shot(p,'row-sheet-group-resting-light');
      await p.evaluate(()=>document.querySelector('#modal [data-x=no]').click()); await W(300);
      await p.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] .w-main`).click(),T.running); await W(500); await shot(p,'row-sheet-running-light');
      await p.evaluate(()=>document.querySelector('#modal [data-x=no]').click()); await W(300);
      await p.evaluate(id=>{ const n=document.querySelector(`.watch[data-id="${id}"]`); n.scrollIntoView({block:'center'}); n.classList.add('sw-open'); n.querySelector('.sw-front').style.transform=`translateX(-${n.querySelector('.sw-trail').offsetWidth}px)`; },T.group); await W(300); await shot(p,'row-swiped-stop-remove-light');
      await p.evaluate(id=>{ const n=document.querySelector(`.watch[data-id="${id}"]`); n.classList.remove('sw-open'); n.querySelector('.sw-front').style.transform=''; },T.group); }
    else { await p.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] [data-act=menu]`).click(),T.rest); await W(500); await shot(p,'row-menu-group-resting-light');
      await p.evaluate(()=>document.querySelector('#modal [data-x=no]').click()); await W(300); }
    await p.evaluate(()=>{ window.scrollTo(0,0); document.querySelector('#newBtn').click(); }); await W(600); await shot(p,isNew?'picker-busy-runners-light':'new-sheet-light');
  }
  if(p.errs.length) console.log('page errors:',p.errs.join(' | ')); await p.context().close(); }
{ const p=await TS.open(b,{url:URL}); if(await p.evaluate(()=>!!document.querySelector('[data-pick]'))){ // the picker on a fresh practice: nobody on a stopwatch yet
    await p.evaluate(()=>document.querySelector('[data-pick]').click()); await W(600); await shot(p,'picker-light');
    await p.evaluate(()=>{ document.querySelector('#modal .rp-all').click(); }); await W(300); await shot(p,'picker-girls-selected-light');
    await p.evaluate(()=>{ [...document.querySelectorAll('#modal .rp-row')].slice(4,6).forEach(x=>x.click()); document.querySelector('#modal [data-mode=group]').click(); }); await W(300); await shot(p,'picker-one-group-light'); }
  await p.context().close(); }
for(const [o,f] of [[{compact:true},'compact-rows-light'],[{text:23},'large-text-23px-light'],[{text:14},'small-text-14px-light']]){
  const p=await TS.open(b,{url:URL,...o}); if(o.compact) await p.evaluate(()=>document.body.classList.add('compact')); await TS.build(p); await W(400); await p.evaluate(()=>window.scrollTo(0,0)); await shot(p,o.compact&&label==='before'?'two-columns-light':f); await p.context().close(); } // compact: "two columns" before 3.17
await b.close(); console.log('saved to',OUT); })().catch(e=>{ console.error(e); process.exit(1); });
