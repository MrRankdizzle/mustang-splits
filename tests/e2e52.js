// 3.23: the typography lint. Every text line drawn in the banquet book (print and screen, every page) and in every
// social graphic (every design × palette × background × size) is checked: headings in Title Case (AP style), no straight
// quotes or apostrophes, no hyphen in a number range, no hyphen-minus before a time difference, no emoji, no double
// spaces, nothing overflowing or clipped, and in the book nothing outside the safe margins. Fake names only.
const puppeteer=require('puppeteer-core'), T=require('./tools/fake-team.js');
const URL=process.env.URL||'http://localhost:8765/';
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const seed=T.seed(); seed.roster.forEach(a=>{ if(a.id==='g5') a.name="Sloane O'Hara-Whitcombe"; }); // an apostrophe and a hyphen in a name
const P=await T.open(b,{url:URL,seed,now:'2026-10-20T16:00:00'}); await T.load(P); const ev=(f,...a)=>P.evaluate(f,...a); await ev(()=>MSApp.renameRunner('f5',"Sloane O'Hara-Whitcombe")); await W(300); // the import gives the file's names back; an apostrophe and a hyphen for the lint
// the lint, in the page: every logged line against the rules
const LINT=`(lines,m,w,h)=>{ const out=[]; const emoji=/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2B50}\\u{2B06}\\u{2194}-\\u{21AA}]/u;
  lines.forEach(l=>{ const t=l.t, f=l.full||t; const bad=[];
    if(l.role==='h'&&MSApp.apTitle(f)!==f) bad.push('not Title Case');
    if(/["']/.test(t)) bad.push('straight quote'); if(/\\d-\\d/.test(t)) bad.push('hyphen in a range'); if(/(^|\\s)-\\d/.test(t)) bad.push('hyphen-minus before a number'); if(emoji.test(t)) bad.push('emoji'); if(/  /.test(t)) bad.push('double space');
    if(l.w>l.box[1]+0.5||l.x<l.box[0]-0.5) bad.push('overflows its box'); if(!l.pill&&!f.replace(/\\s/g,'').includes(t.replace(/\\s/g,''))) bad.push('clipped');
    if(m&&(l.x<m-0.5||l.x+l.w>w-m+0.5||l.y>h-m+0.5)) bad.push('outside the safe margin');
    if(bad.length) out.push(bad.join(', ')+': “'+t.slice(0,70)+'”'); }); return out; }`;
console.log('1. The banquet book, print and screen');
for(const fmt of ['print','screen']){ for(const full of [false,true]){ const r=await ev(async(fmt,full,LINT)=>{ const lint=eval(LINT); const r=await MSApp.bookPages(2026,{team:'both',full,awards:true,ms:true,fmt}); return {n:r.n,lines:r.log.length,heads:r.log.filter(l=>l.role==='h').length,bad:lint(r.log,fmt==='print'?75:72,r.w,r.h)}; },fmt,full,LINT);
  ok(`${fmt}, ${full?'full stats':'celebrations'}: ${r.n} pages, ${r.lines} lines, ${r.heads} headings, all clean`, r.lines>500&&r.heads>50&&!r.bad.length, r.bad.slice(0,6).join(' | ')); } }
const quotes=await ev(async()=>{ const r=await MSApp.bookPages(2026,{team:'G',full:false,awards:false,ms:false,fmt:'print'}); return r.log.filter(l=>/O’Hara/.test(l.t)).length; });
ok('a name with an apostrophe is set with a curly one (O’Hara)', quotes>0, String(quotes));
ok('Title Case follows AP style (articles, short prepositions and conjunctions stay lowercase inside)', await ev(()=>MSApp.apTitle('the season by the numbers')==='The Season by the Numbers'&&MSApp.apTitle('biggest improvements: opener to season best')==='Biggest Improvements: Opener to Season Best'&&MSApp.apTitle('girls: the season at a glance')==='Girls: The Season at a Glance'&&MSApp.apTitle('5K PR at WIAA state')==='5K PR at WIAA State'&&MSApp.apTitle('results here this season')==='Results Here This Season'));
ok('typography: curly quotes, en dash in ranges, em dash, a true minus', await ev(t=>MSApp.typo(t)==='\u201ctop 1\u20135\u201d \u2014 it\u2019s \u22123.2s','"top 1-5" - it\'s -3.2s'));
console.log('2. Every social graphic');
const G=await ev(async LINT=>{ const lint=eval(LINT); const out=[]; let n=0; for(const pal of Object.keys(MSApp.gfxCombos())) for(const bg of MSApp.gfxCombos()[pal]) for(const design of MSApp.gfxDesigns()) for(const size of ['sq','story']){ if(bg==='photo'&&design!=='photo') continue; const g=await MSApp.gfx(2026,{design,size,names:'full',team:'both',pal,bg}); n++; const bad=lint(g.log,0,g.w,g.h); if(bad.length) out.push(`${design}/${pal}/${bg}/${size}: ${bad[0]}`); if(size==='story'&&g.log.some(l=>l.y-l.s<250||l.y>1920-250)) out.push(`${design}/${pal}/${bg}/story: text in the top or bottom 250 px`); } return {n,out}; },LINT);
ok(`every graphic clean (${G.n} graphics; stories keep the top and bottom 250 px clear)`, G.n>=300&&!G.out.length, G.out.slice(0,6).join(' | '));
ok('names and times use the display face, at most three nominal sizes per graphic besides the brand lockup (every design)', await ev(async()=>{ for(const design of MSApp.gfxDesigns()) for(const size of ['sq','story']){ const g=await MSApp.gfx(2026,{design,size,names:'full',team:'both'}); const sizes=new Set(g.log.filter(l=>!l.pill&&l.role!=='brand').map(l=>l.sz)); const names=g.log.filter(l=>/^\d+:\d\d\.\d$/.test(l.t)); if(!names.every(l=>l.fam==='display')||sizes.size>3) return false; } return true; }), JSON.stringify(await ev(async()=>{ const g=await MSApp.gfx(2026,{design:'recap',size:'sq',names:'full',team:'both'}); return [...new Set(g.log.filter(l=>!l.pill&&l.role!=='brand').map(l=>l.sz))]; })));
ok('no page errors', !P.errs.length, P.errs.slice(0,3).join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
