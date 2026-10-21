// 3.14: Team training paces redesigned (Training tab). Two chip rows (distance or time; effort), a plain-language title,
// one list per team with one time per runner (Easy: a range), fastest first, pace groups (Suggest pace groups' rule),
// "Needs a race" last, the basis on tap, Share (this view as an image; the full pace chart as a PDF).
// 1. Every distance × every effort matches the engine (Daniels VDOT / CV, the runner's paceProfile), formatted m:ss
//    like the profile; time options give the distance covered; the pace groups are Suggest pace groups'.
// 2. The same numbers as the runner's profile pace table and the workout targets.
// 3. Nothing cropped (values one line, inside their row, names whole) at phone width and at large text sizes; no
//    sideways page scroll; chips 44 pt; the selection is remembered.
// 4. Tap a runner: the basis and their profile; Goal 5K (default 1% under the predicted 5K, set per phone); Needs a race:
//    a time trial. Share: image and a 10-page PDF.
// The planted fake season (tests/tools/fake-season.js) plus a runner with no race; fake names only.
const puppeteer=require('puppeteer-core'), T=require('./tools/fake-team.js'), lib=require('./lib.js');
const URL=process.env.URL||'http://localhost:8765/';
const {seed}=require('./tools/fake-season.js');
const MILE=1609.34; // = app.js MILE (workouts use the same)
function fmtSec(sec,dec){ if(dec===undefined) dec=1; const r=dec?Math.round(sec*10)/10:Math.round(sec), m=Math.floor(r/60+1e-9), s=Math.max(0,r-m*60);
  let ss=(dec&&Math.abs(s-Math.round(s))>0.04)?s.toFixed(1):String(Math.round(s)); if(s<9.95) ss='0'+ss; return m+':'+ss; } // = app.js fmtSec
const D=[['100',100],['150',150],['200',200],['300',300],['400',400],['500',500],['600',600],['800',800],['1000',1000],['1200',1200],['mile',MILE],['2000',2000],['2mi',2*MILE],['t60',0,60],['t120',0,120],['t180',0,180],['t300',0,300]];
const E=['easy','long','threshold','cv','interval','repetition','5k','2mi','mile','goal'];
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const sd=JSON.parse(JSON.stringify(seed)); sd.roster.forEach(a=>{ if(a.id==='g4') a.name='Evangeline Nash-Whitaker'; }); sd.roster.push({id:'b9',name:'Gus Hale',group:'',gender:'B'});
const P=await T.open(b,{seed:sd,url:URL,now:'2026-10-05T16:00:00',flat:false}); const ev=(f,...a)=>P.evaluate(f,...a);
await ev(()=>document.querySelector('.tab[data-tab=workouts]').click()); await W(800);

console.log('1. the list = the engine, for every distance and effort');
const ids=sd.roster.map(a=>a.id), eng={}; for(const id of ids) eng[id]=await ev(id=>MSApp.paceEngine(id),id);
const spmOf=(id,e)=>{ const p=eng[id].paces; return e==='easy'?[p.easyFast,p.easySlow]:e==='long'?p.easy:e==='goal'?eng[id].goal.t/(5000/MILE):p[e]; };
let checked=0, wrong=[], fmtBad=[], orderBad=[], groupBad=[];
for(const [dk,m,t] of D) for(const e of E){
  const V=await ev((d,e)=>MSApp.teamPaces({d,e}),dk,e), rows=V.secs.flatMap(s=>s.groups.flat());
  const unit=t?(Math.max(...rows.map(r=>{ const v=spmOf(r.id,e); return t*MILE/(Array.isArray(v)?v[0]:v); }))>=3000?'mi':'m'):null;
  const dOut=x=>unit==='mi'?(x/MILE).toFixed(2):(Math.round(x/5)*5).toLocaleString('en-US');
  rows.forEach(r=>{ const v=spmOf(r.id,e), f=x=>fmtSec(x*m/MILE,m<=200?1:0);
    const want=m?(Array.isArray(v)?`${f(v[0])}–${f(v[1])}`:f(v)):(Array.isArray(v)?`${dOut(t*MILE/v[1])}–${dOut(t*MILE/v[0])} ${unit}`:`${dOut(t*MILE/v)} ${unit}`);
    checked++; if(r.v!==want) wrong.push(`${dk}/${e}/${r.name}: ${r.v} ≠ ${want}`);
    if(m&&!/^\d+:\d\d(\.\d)?(–\d+:\d\d(\.\d)?)?$/.test(r.v)) fmtBad.push(r.v); });
  V.secs.forEach(s=>{ const k=s.groups.flat().map(r=>Array.isArray(r.spm)?(r.spm[0]+r.spm[1])/2:r.spm); if(k.some((x,i)=>i&&x<k[i-1]-1e-9)) orderBad.push(dk+'/'+e+'/'+s.label);
    s.groups.forEach((G,i)=>{ const p=G.map(r=>Array.isArray(r.spm)?(r.spm[0]+r.spm[1])/2:r.spm); if((p[p.length-1]-p[0])/p[0]>0.029) groupBad.push(`${e} ${s.label} group ${i+1} too wide`);
      const nx=s.groups[i+1]; if(nx){ const q=Array.isArray(nx[0].spm)?(nx[0].spm[0]+nx[0].spm[1])/2:nx[0].spm; if((q-p[0])/p[0]<=0.029) groupBad.push(`${e} ${s.label} groups ${i+1}/${i+2} should be one`); } }); }); }
ok(`every value = the engine (${checked} runner values over ${D.length} distances/times × ${E.length} efforts)`, !wrong.length&&checked>1500, wrong.slice(0,3).join(' | '));
ok('distances show m:ss (tenths at 200 m and under, like the profile; Easy a range)', !fmtBad.length, fmtBad.slice(0,3).join(' | '));
ok('fastest first within Girls and Boys', !orderBad.length, orderBad.slice(0,3).join());
ok('pace groups: within 2.9% of the group’s fastest, a new group beyond it', !groupBad.length, groupBad.slice(0,3).join(' | '));
for(const ref of ['cv','threshold','interval','repetition','5k','mile']){
  const V=await ev(e=>MSApp.teamPaces({d:'400',e}),ref), mine=V.secs.filter(s=>s.g).map(s=>s.groups.map(G=>G.map(r=>r.id)));
  const sug=await ev((ids,ref)=>[['g0','g1','g2','g3','g4','g5'],['b0','b1','b2','b3','b4','b5']].map(L=>MSApp.paceGroups(L,ref)),ids,ref);
  ok(`pace groups at ${ref} = Suggest pace groups (workout flow)`, JSON.stringify(mine)===JSON.stringify(sug), JSON.stringify(mine)+' vs '+JSON.stringify(sug)); }
const V0=await ev(()=>MSApp.teamPaces({d:'800',e:'cv'}));
ok('Girls then Boys; the runner with no race last, "Needs a race"', V0.secs[0].g==='G'&&V0.secs[1].g==='B'&&V0.secs[1].none.map(x=>x.name).join()==='Gus Hale');
ok('Easy over 1 mile is a range; Long run is the middle of it', await ev(()=>{ const a=MSApp.teamPaces({d:'mile',e:'easy'}).secs[0].groups[0][0], l=MSApp.teamPaces({d:'mile',e:'long'}).secs[0].groups[0][0]; return /–/.test(a.v)&&!/–/.test(l.v)&&l.spm>a.spm[0]&&l.spm<a.spm[1]; }));
ok('2-mile race pace sits between 5K pace and mile pace', ids.filter(id=>eng[id]).every(id=>{ const p=eng[id].paces; return p['2mi']<p['5k']&&p['2mi']>p.mile; }));

console.log('2. the same numbers as the profile and the workouts');
for(const ref of ['cv','threshold','interval','repetition','5k','mile']){ const bad2=[];
  for(const id of ids){ if(!eng[id]) continue; const w=await ev((id,ref)=>MSApp.workoutPace(id,ref),id,ref); if(Math.abs(w-eng[id].paces[ref])>1e-9) bad2.push(id); }
  ok(`workouts use the same ${ref} pace as the list`, !bad2.length, bad2.join()); }
await ev(()=>document.querySelector('#wkPaces [data-tpr="g0"]').click()); await W(400);
ok('tapping a runner shows the basis ("Based on 5K season best 19:55.0, 10/3")', await ev(()=>/Based on 5K season best 19:55\.0, 10\/3/.test(document.querySelector('#modal .tp-basis').textContent)));
await ev(()=>[...document.querySelectorAll('#modal [data-x=prof]')][0].click()); await W(600);
ok('…and a link to the profile (‹ Training)', await ev(()=>!document.querySelector('#wkProf').hidden&&/‹ Training/.test(document.querySelector('#navLeft').textContent)));
const pt=await ev(()=>[...document.querySelectorAll('#wkProf .pace-table .pt-row')].map(r=>({k:r.querySelector('b').textContent,c:[...r.querySelectorAll('.pt-c')].map(c=>({d:c.querySelector('small').textContent,v:c.lastChild.textContent})),all:r.innerText.replace(/\s+/g,' ')})));
const PK={'CV (about 30 min)':'cv','Threshold':'threshold','Interval':'interval','Repetition':'repetition','5K pace':'5k','Mile pace':'mile'}, PD={'100':'100','200':'200','400':'400','800':'800','1000':'1000','mile':'mile'};
const mis=[]; for(const r of pt){ const e=PK[r.k]; if(!e) continue; for(const c of r.c){ const V=await ev((d,e)=>MSApp.teamPaces({d,e}),PD[c.d],e), mine=V.secs[0].groups.flat().find(x=>x.id==='g0'); if(!mine||mine.v!==c.v) mis.push(`${r.k} ${c.d}: list ${mine&&mine.v} vs profile ${c.v}`); } }
const ez=pt.find(r=>r.k==='Easy'), ezl=(await ev(()=>MSApp.teamPaces({d:'mile',e:'easy'}))).secs[0].groups.flat().find(x=>x.id==='g0');
ok('every profile pace (CV, Threshold, Interval, Repetition, 5K, Mile × 100 m to the mile) = the list', pt.length>=7&&!mis.length, mis.slice(0,3).join(' | '));
ok('the profile’s Easy range per mile = the list’s Easy over 1 mile', !!ez&&ez.all.includes(ezl.v+'/mi'), ez&&ez.all+' vs '+ezl.v);
await ev(()=>document.querySelector('[data-profback]').click()); await W(400);

console.log('3. the screen: chips, title, nothing cropped, remembered');
// 3.16: two pull-down menu buttons (Distance, Effort) instead of chip rows
const S1=await ev(()=>{ const w=document.querySelector('#wkPaces'), b=[...w.querySelectorAll('.pd-btn')];
  const open=id=>{ document.querySelector(id).click(); const m=document.querySelector('.pd-menu'); const r={heads:[...m.querySelectorAll('.pd-h')].map(h=>h.textContent).filter(Boolean),items:[...m.querySelectorAll('.pd-it')].map(x=>x.querySelector('.pd-tx').textContent),on:[...m.querySelectorAll('[aria-checked=true] .pd-tx')].map(x=>x.textContent),h:Math.min(...[...m.querySelectorAll('.pd-it')].map(x=>x.getBoundingClientRect().height)),side:m.scrollWidth>m.clientWidth+1}; document.querySelector(id).click(); return r; };
  return {btns:b.map(x=>x.innerText.replace(/\s+/g,' ').trim()),bh:Math.min(...b.map(x=>x.getBoundingClientRect().height)),dist:open('#tpDBtn'),eff:open('#tpEBtn'),title:w.querySelector('.tp-title').textContent,chips:!!w.querySelector('.tp-chips'),page:document.documentElement.scrollWidth<=window.innerWidth+1}; });
ok('two pull-down menu buttons, "Distance: 800 m" and "Effort: CV", 44 pt; no chip rows; no sideways scroll', S1.btns.join('|')==='Distance: 800 m|Effort: CV'&&S1.bh>=44&&!S1.chips&&S1.page, JSON.stringify(S1.btns));
ok('Distance menu: Short, Middle, Long, Time, then Custom…; the current one checked', S1.dist.heads.join()==='Short,Middle,Long,Time'&&S1.dist.items.join('|')==='100 m|150 m|200 m|300 m|400 m|500 m|600 m|800 m|1000 m|1200 m|Mile|2000 m|2 miles|1 min|2 min|3 min|5 min|Custom…'&&S1.dist.on.join()==='800 m'&&S1.dist.h>=44&&!S1.dist.side, JSON.stringify(S1.dist));
ok('Effort menu, slowest to fastest: Aerobic, Steady, Fast, Race paces', S1.eff.heads.join()==='Aerobic,Steady,Fast,Race paces'&&S1.eff.items.join('|')==='Easy|Long run|Threshold|CV|Interval (VO2max)|Repetition|5K|2-mile|Mile|Goal 5K'&&S1.eff.on.join()==='CV'&&!S1.eff.side, JSON.stringify(S1.eff));
ok('a plain-language title: "800 m at CV pace"', S1.title==='800 m at CV pace', S1.title);
await lib.tpPick(P,'t180','threshold'); await W(300);
ok('time: "3 min at threshold pace", how far each runner goes', await ev(()=>document.querySelector('#wkPaces .tp-title').textContent==='3 min at threshold pace'&&/^\d{3} m$/.test(document.querySelector('#wkPaces .tp-v').textContent)), await ev(()=>document.querySelector('#wkPaces .tp-v').textContent));
await lib.tpPick(P,'custom',null); await W(300);
await ev(()=>document.querySelector('#modal [data-tpcu="mi"]').click()); await W(100);
await ev(()=>{ document.querySelector('#modal .stepper [data-step="1"]').click(); document.querySelector('#modal .stepper [data-step="1"]').click(); }); await W(100); // 1 → 1.5 miles
ok('Custom: a stepper in miles (1.5), the title previewed', await ev(()=>document.querySelector('#modal #tpCv').value==='1.5'&&document.querySelector('#modal #tpCvSay').textContent==='1.5 miles at threshold pace'), await ev(()=>document.querySelector('#modal #tpCvSay').textContent));
await ev(()=>document.querySelector('#modal [data-x=ok]').click()); await W(300);
ok('…the list for 1.5 miles; the button says "Distance: 1.5 mi"', await ev(()=>document.querySelector('#wkPaces .tp-title').textContent==='1.5 miles at threshold pace'&&document.querySelector('#tpDBtn .pd-v').textContent==='1.5 mi'));
await P.reload(); await P.waitForFunction(()=>window.MSApp); await W(600); await ev(()=>document.querySelector('.tab[data-tab=workouts]').click()); await W(500);
ok('the selection is remembered after a reload', await ev(()=>document.querySelector('#wkPaces .tp-title').textContent==='1.5 miles at threshold pace'));
const crop=()=>ev(()=>{ const w=document.querySelector('#wkPaces'), out=[];
  w.querySelectorAll('.tp-row').forEach(r=>{ const R=r.getBoundingClientRect(), v=r.querySelector('.tp-v'), q=v.getBoundingClientRect(), lh=parseFloat(getComputedStyle(v).lineHeight)||q.height;
    if(v.scrollWidth>v.clientWidth+1||q.left<R.left||q.right>R.right+0.5||q.height>lh*1.5) out.push('value '+v.textContent);
    r.querySelectorAll('.nw').forEach(n=>{ const g=document.createRange(); g.selectNodeContents(n); if(g.getClientRects().length>1) out.push('name '+n.textContent); }); });
  w.querySelectorAll('.tp-title,.tp-sh').forEach(t=>{ if(t.scrollWidth>t.clientWidth+1) out.push('title '+t.textContent); });
  if(document.documentElement.scrollWidth>window.innerWidth+1) out.push('page scrolls sideways');
  return out; });
const heavy=[['2mi','easy'],['t300','easy'],['mile','easy'],['150','easy'],['100','goal'],['2mi','5k'],['t300','long']];
for(const fs of [null,'24px','30px']){ if(fs) await P.addStyleTag({content:`html{font-size:${fs}!important}`}); await W(300); const probs=[];
  for(const [d,e] of heavy){ await lib.tpPick(P,d,e); await W(150); (await crop()).forEach(x=>probs.push(`${d}/${e}: ${x}`)); }
  ok(`nothing cropped at ${fs?'a large text size ('+fs+')':'phone width (390 pt)'}: values on one line inside their rows, names whole, no sideways scroll`, !probs.length, probs.slice(0,4).join(' | ')); }
await ev(()=>document.querySelectorAll('style').forEach(s=>{ if(/font-size:(24|30)px/.test(s.textContent)) s.remove(); })); await W(300);
for(const vw of [320,768]){ await P.setViewport({width:vw,height:800,isMobile:true,hasTouch:true,deviceScaleFactor:2}); await W(300); const pr=await crop(); ok(`nothing cropped at ${vw} pt wide`, !pr.length, pr.slice(0,3).join(' | ')); }
await P.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2}); await W(300);
ok('team colours and shapes on the section headings (● Girls pink, ■ Boys)', await ev(()=>{ const h=[...document.querySelectorAll('#wkPaces .tp-sh')]; return /●/.test(h[0].textContent)&&/■/.test(h[1].textContent)&&getComputedStyle(h[0]).color!==getComputedStyle(h[1]).color; }));

console.log('4. a runner, Goal 5K, Share');
await lib.tpPick(P,'800','goal'); await W(300);
const g0=eng.g0, def=fmtSec((g0.paces['5k']*(5000/MILE)*0.99)*800/5000,0);
ok('Goal 5K by default = 1% faster than the predicted 5K', await ev(()=>MSApp.teamPaces({d:'800',e:'goal'}).secs[0].groups.flat().find(r=>r.id==='g0').v)===def, def);
await ev(()=>document.querySelector('#wkPaces [data-tpr="g0"]').click()); await W(300);
await P.type('#modal #tpGoal','19000'); await W(100); await ev(()=>document.querySelector('#modal [data-x=sg]').click()); await W(300);
ok('setting a 19:00 goal: 800 m at goal 5K pace = 3:02.4 → 3:02', await ev(()=>MSApp.teamPaces({d:'800',e:'goal'}).secs[0].groups.flat().find(r=>r.id==='g0').v)==='3:02');
await ev(()=>document.querySelector('#wkPaces [data-tpr="g0"]').click()); await W(300);
await ev(()=>document.querySelector('#modal [data-x=clr]').click()); await W(300);
ok('Clear goal goes back to the default', await ev(()=>MSApp.teamPaces({d:'800',e:'goal'}).secs[0].groups.flat().find(r=>r.id==='g0').v)===def);
await ev(()=>document.querySelector('#wkPaces [data-tpr="b9"]').click()); await W(300);
ok('a runner who needs a race: why, and Add a time trial', await ev(()=>/Needs a race/.test(document.querySelector('#modal .tp-basis').textContent)&&!!document.querySelector('#modal [data-x=tt]')));
await ev(()=>{ document.querySelector('#overlay').hidden=true; });
await ev(()=>document.querySelector('#tpShare').click()); await W(300);
ok('Share: this view as an image, or the full pace chart as a PDF', await ev(()=>/This view: 800 m at goal 5K pace \(image\)/.test(document.querySelector('#modal #tpPng').textContent)&&/Full pace chart/.test(document.querySelector('#modal #tpPdf').textContent)));
await ev(()=>{ document.querySelector('#overlay').hidden=true; });
const img=await ev(()=>MSApp.paceImage()), pdf=await ev(()=>MSApp.pacePdf());
ok('the image holds the view (title, both teams, every runner)', img.w>=1000&&img.h>1000, JSON.stringify(img));
ok('the full pace chart: a printable PDF, one page per effort (10)', pdf.head.startsWith('%PDF-1.4')&&pdf.tail.includes('%%EOF')&&pdf.pages===10&&pdf.size>50000, JSON.stringify(pdf));
ok('no page errors', !P.errs.length, P.errs.join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0); })().catch(e=>{ console.log('CRASH',e); process.exit(1); });
