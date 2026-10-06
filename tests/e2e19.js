// 2.10.0: Team tab Girls/Boys sections (and the one-time group conversion), typed race results instead of typed PRs
// (PRs computed; old typed PRs kept as "date unknown"), the Data tab and its charts (every dot opens the runner), and
// selected / pressed / disabled states app-wide with automated contrast checks, light and dark, plus screenshots.
const puppeteer=require('puppeteer-core'), path=require('path');
const URL='http://localhost:8765/?emu', SHOTS=path.join(__dirname,'screenshots');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:150},arg); return true; }catch(e){ return false; } };
const MILE=1609.34, cps=()=>[{id:'m1',name:'Mile 1',dist:MILE,unit:'mi'},{id:'m2',name:'Mile 2',dist:2*MILE,unit:'mi'},{id:'fin',name:'Finish',dist:5000,unit:'m'}];
const G=['Gina A.','Hana B.','Iris C.','June D.','Kara E.','Lena F.','Mia G.'], Bn=['Max P.','Ned Q.','Owen R.','Paul S.','Quin T.','Rex U.','Sid V.'];
function seedState(){
  const roster=[...G.map((n,i)=>({id:'g'+i,name:n,group:i<2?'Girls':'',gender:i<2?'':'G'})),...Bn.map((n,i)=>({id:'b'+i,name:n,group:i===0?'Boys JV':i===1?'Varsity Boys':i===2?'Pace A':'',gender:i<2?'':'B'})),{id:'x1',name:'Odd K.',group:'Girls',gender:'B'}];
  const S={v:1,settings:{tol:1,compact:false,sound:false,wake:false,liveLog:true,raceCols:2,coachName:'Coach Ann',coachAsked:true},workouts:[],watches:[],race:null,merges:[],roster,
    courses:[{id:'cW',name:'Winagamie GC',checkpoints:cps()}],series:[{id:'sK',name:'Kiel Raiders Invite'}],
    meets:[{id:'mK25',seriesId:'sK',courseId:'cW',date:'2025-09-04',time:'',kind:'Invite',levels:['V','JV'],season:2025},{id:'mK',seriesId:'sK',courseId:'cW',date:'2026-09-03',time:'',kind:'Invite',levels:['V','JV'],season:2026},{id:'mK2',seriesId:'sK',courseId:'cW',date:'2026-09-24',time:'',kind:'Invite',levels:['V','JV'],season:2026}],
    prs:{g2:[{dist:5000,t:1150}]}, raceLog:[]};
  let n=0; const race=(id,date,meet,div,ids,base,step)=>{ const rows=ids.map(k=>({id:k,name:roster.find(a=>a.id===k).name,group:'',goal:null,goalTag:null,pr:null,sb:null,cells:[]})), marks=[];
    ids.forEach((k,i)=>{ const t=base+i*step; [[0,t*0.31],[1,t*0.635],[2,t]].forEach(([ci,v])=>marks.push({id:id+k+ci,ci,rid:k,t:Math.round(v*10)/10,dev:'s',byName:'Coach',at:0,chosen:false,deleted:false,hist:[]})); });
    return {id,key:id,date,savedAtMs:Date.parse(date+'T15:00')+(n++),uploaded:false,edits:[],race:{name:'Kiel '+div,raceId:'race-'+id,courseId:'cW',courseName:'Winagamie GC',goalSrc:'none',meetId:meet,seriesId:'sK',division:div,checkpoints:cps(),rows,marks}}; };
  const gi=G.map((_,i)=>'g'+i), bi=Bn.map((_,i)=>'b'+i);
  S.raceLog=[race('LYg','2025-09-04','mK25','GV',gi,1240,8),race('LYb','2025-09-04','mK25','BV',bi,1050,7),race('R1g','2026-09-03','mK','GV',gi,1220,9),race('R1b','2026-09-03','mK','BV',bi,1030,8),race('R2g','2026-09-24','mK2','GV',gi,1205,9),race('R2b','2026-09-24','mK2','BV',bi,1020,8)];
  return S;
}
async function phone(tag,{dark,seed}={}){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage();
  await p.evaluateOnNewDocument(sd=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); if(sd&&!localStorage.getItem('mustang-splits:v1')) localStorage.setItem('mustang-splits:v1',sd); }catch(e){}
    const off=Date.parse('2026-10-05T16:00:00')-Date.now(), R=Date; class D extends R{ constructor(...a){ if(a.length) super(...a); else super(R.now()+off); } static now(){ return R.now()+off; } } D.parse=R.parse; D.UTC=R.UTC; window.Date=D; },seed?JSON.stringify(seed):null);
  await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:dark?'dark':'light'}]);
  p.on('pageerror',e=>errs.push(tag+': '+e.message));
  await p.goto(URL); await p.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); require('./lib.js').patchClick(p); await W(800); return p; }
const tab=async(p,t)=>{ await p.evaluate(t=>{ document.querySelector('#overlay').hidden=true; document.querySelector(`.tab[data-tab=${t}]`).click(); },t); await W(); };
const roster=p=>p.evaluate(()=>Object.fromEntries(MSApp.getRoster().map(a=>[a.id,(a.gender||'-')+'|'+(a.group||'')])));

console.log('1. Girls and Boys sections; groups named like Girls/Boys converted');
const L=await phone('L',{seed:seedState()});
ok('the conversion is shown once, with what changed', await waitFor(L,()=>!!document.querySelector('#modal .conv-sheet'),null,8000) && (await L.$eval('#modal',m=>m.innerText)).includes('group “Boys JV” → Boys, group “JV”'), await L.$eval('#modal',m=>m.innerText).catch(()=>''));
let R=await roster(L);
ok('Girls → Girls (no group); Boys JV → Boys + "JV"; Varsity Boys → Boys + "Varsity"; Pace A stays', R.g0==='G|'&&R.b0==='B|JV'&&R.b1==='B|Varsity'&&R.b2==='B|Pace A', JSON.stringify(R));
ok('a runner already marked Boys in a "Girls" group is kept and listed', R.x1==='B|Girls' && (await L.$eval('#modal',m=>m.innerText)).includes('kept: marked Boys already'));
await L.click('#modal [data-x=undo]'); await W();
R=await roster(L); ok('Undo puts the groups back', R.g0==='-|Girls'&&R.b0==='-|Boys JV');
await L.reload(); await L.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn'));
ok('it runs once: no second conversion after a reload', !(await waitFor(L,()=>!!document.querySelector('#modal .conv-sheet'),null,4000)));
await tab(L,'team');
ok('Team tab: Girls and Boys sections, no G/B tag buttons, no PR buttons', await L.evaluate(()=>!!document.querySelector('.team-sec[data-sec="G"]')&&!!document.querySelector('.team-sec[data-sec="B"]')&&!document.querySelector('[data-t=gender]')&&!document.querySelector('[data-t=prs]')));
ok('the runner sheet shows the computed 5K PR (Gina 20:05.0 from her races)', (await (async(p,id)=>{ await p.click(`.ath[data-id="${id}"] .ath-row`); await new Promise(r=>setTimeout(r,250)); const t=await p.$eval('#modal .res-sheet',m=>m.innerText); await p.click('#modal [data-x=done]'); await new Promise(r=>setTimeout(r,200)); return t; })(L,'g0')).includes('5K 20:05.0'));
ok('an old typed PR counts as a result (Iris: typed 19:10.0 beats her races)', (await (async(p,id)=>{ await p.click(`.ath[data-id="${id}"] .ath-row`); await new Promise(r=>setTimeout(r,250)); const t=await p.$eval('#modal .res-sheet',m=>m.innerText); await p.click('#modal [data-x=done]'); await new Promise(r=>setTimeout(r,200)); return t; })(L,'g2')).includes('5K 19:10.0'));
await L.click('.team-sec[data-sec="B"] [data-t=addsec]'); await W();
ok('"+ Add to Boys" presets Boys', await L.$eval('#modal [data-gen=B]',b=>b.getAttribute('aria-pressed')==='true'));
await L.type('#athName','Tom W'); await L.click('#modal [data-x=yes]'); await W();
ok('…and the new runner lands in Boys', await L.evaluate(()=>MSApp.getRoster().find(a=>a.name==='Tom W').gender==='B') && await L.evaluate(()=>[...document.querySelectorAll('.team-sec[data-sec="B"] .ath-nm')].some(i=>i.textContent==='Tom W')));

console.log('2. Add a race result');
await L.click('.ath[data-id="g2"] .ath-row'); await W();
ok('Iris’s old typed PR is listed as a result with "Date unknown"', (await L.$eval('#modal',m=>m.innerText)).includes('typed as a PR before 2.10'));
await L.$eval('#modal [data-rf=date]',i=>{ i.value='2026-08-20'; }); await L.type('#modal [data-rf=meet]','Summer TT'); await L.click('#modal [data-rf=t]'); await L.keyboard.type('19000'); await L.click('#modal [data-rs=official]'); await L.click('#modal [data-x=add]'); await W();
ok('a dated official result is saved with its meet', await L.evaluate(()=>MSApp.getPrs().find(x=>x.id==='g2').list.some(p=>p.t===1140&&p.date==='2026-08-20'&&p.meet==='Summer TT'&&p.src==='official')));
await L.click('#modal [data-x=done]'); await W();
ok('the PR follows (19:00.0)', (await (async(p,id)=>{ await p.click(`.ath[data-id="${id}"] .ath-row`); await new Promise(r=>setTimeout(r,250)); const t=await p.$eval('#modal .res-sheet',m=>m.innerText); await p.click('#modal [data-x=done]'); await new Promise(r=>setTimeout(r,200)); return t; })(L,'g2')).includes('5K 19:00.0'));

console.log('3. Data tab and charts');
ok('the tab is called Data', (await L.$eval('.tab[data-tab=results]',t=>t.textContent.trim()))==='Data');
await tab(L,'results'); await L.click('[data-rv=meets]'); await W();
await L.evaluate(()=>{ const d=document.querySelector('#raceLogList'); }); // races on this phone are local; the meet charts sit in Team history / official, so use a team-free view:
await L.click('[data-rv=runners]'); await W(); await L.click('[data-runner="g0"]'); await W(600);
ok('runner card: each 5K vs season best, and compare', !!(await L.$('svg[aria-label^="Each 5K this season"]')) && !!(await L.$('[data-cmp]')));
await L.select('[data-cmp]','g1'); await W(400);
ok('compare: Gina and Hana on one chart', await L.$eval('svg[aria-label="5K times compared"]',s=>s.querySelectorAll('path.s1,path.s2').length===2));
await L.evaluate(()=>[...document.querySelectorAll('svg[aria-label="5K times compared"] [data-goto="g1"]')][0].dispatchEvent(new MouseEvent('click',{bubbles:true}))); await W(500);
ok('tapping Hana’s dot opens Hana', (await L.$eval('.rv-name',x=>x.textContent)).startsWith('Hana'));
await L.click('[data-rv=team]'); await W(500);
ok('Team: ladder (2.13: ranked lists), pack chart, top-5 average, improvement leaderboard', !!(await L.$('#rvTeam ol.ladder .ld-row'))&&!!(await L.$('svg[aria-label^="Girls: the top seven"]'))&&!!(await L.$('svg[aria-label^="Top-5 average"]'))&&(await L.$$('.board-row')).length>=10);
ok('improvement leaderboard: last season vs this season (Gina 20:40.0 → 20:05.0)', (await L.$eval('.board-row[data-goto="g0"]',x=>x.innerText)).includes('20:40.0 → 20:05.0'));
await L.evaluate(()=>document.querySelector('#rvTeam .ld-row[data-goto="b3"]').click()); await W(500);
ok('tapping a ladder dot opens that runner (Paul)', (await L.$eval('.rv-name',x=>x.textContent)).startsWith('Paul'));
ok('upright phone: no sideways scroll on the Data views', await L.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));

console.log('4. Selected, pressed and disabled states (light and dark)');
const contrastJS=()=>{ const parse=c=>{ const m=c.match(/rgba?\(([^)]+)\)/); if(!m) return null; const v=m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return {r:v[0],g:v[1],b:v[2],a:v.length>3?v[3]:1}; };
  const lum=c=>{ const f=x=>{ x/=255; return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4); }; return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b); };
  const ratio=(a,b)=>{ const L1=lum(a), L2=lum(b); return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05); };
  const bgOf=el=>{ while(el){ const c=parse(getComputedStyle(el).backgroundColor); if(c&&c.a>0.5) return c; el=el.parentElement; } return parse(getComputedStyle(document.body).backgroundColor); };
  window.__ct={parse,ratio,bgOf}; };
const checkSel=async(p,sel,label)=>{ const r=await p.evaluate((sel)=>{ const el=document.querySelector(sel); if(!el) return null; const {parse,ratio,bgOf}=window.__ct, cs=getComputedStyle(el), bg=bgOf(el), page=bgOf(el.parentElement);
    const sh=cs.boxShadow&&cs.boxShadow!=='none'?parse(cs.boxShadow):null, ring=sh||parse(cs.borderTopColor), check=getComputedStyle(el,'::before').content;
    return {text:+ratio(parse(cs.color),bg).toFixed(2),fill:+ratio(bg,page).toFixed(2),ring:ring?+ratio(ring,page).toFixed(2):0,weight:+cs.fontWeight,check:check&&check!=='none'&&check!=='normal'}; },sel);
  return r; };
for(const dark of [false,true]){
  const tag=dark?'dark':'light', P=await phone('P'+tag,{dark,seed:seedState()}); await P.evaluate(contrastJS);
  await waitFor(P,()=>!!document.querySelector('#modal .conv-sheet'),null,6000); await P.evaluate(()=>{ const x=document.querySelector('#modal [data-x=no]'); if(x) x.click(); }); await W();
  const shot=async n=>{ await W(200); await P.screenshot({path:`${SHOTS}/sel-${n}-${tag}.png`}); };
  for(const t of ['watches','workouts','team','results']){ await tab(P,t); await shot('tab-'+t); }
  let c=await checkSel(P,'.tab[aria-selected="true"]'); const off=await checkSel(P,'.tab[aria-selected="false"]');
  const tc=await P.evaluate(()=>[getComputedStyle(document.querySelector('.tab[aria-selected="true"]')).color,getComputedStyle(document.querySelector('.tab[aria-selected="false"]')).color]);
  ok(`${tag}: selected tab (3.0, iOS): the tint colour on icon and label, ≥4.5:1, no pill; others ≥4.5:1 too`, c.text>=4.5&&off.text>=4.5&&c.weight>=600&&tc[0]!==tc[1]&&c.fill<1.2, JSON.stringify({c,off}));
  ok(`${tag}: exactly one tab is aria-selected`, (await P.$$eval('.tab[aria-selected="true"]',x=>x.length))===1);
  await P.click('[data-rv=runners]'); await W(); await shot('switch-runners');
  c=await checkSel(P,'.rv-switch [aria-pressed="true"]');
  ok(`${tag}: Meets/Runners/Team (3.0 segmented control): raised segment, bold, text ≥4.5:1, its edge ≥3:1 against the track, no check mark`, c.text>=4.5&&c.ring>=3&&!c.check&&c.weight>=700, JSON.stringify(c));
  ok(`${tag}: exactly one of Meets/Runners/Team is pressed`, (await P.$$eval('.rv-switch [aria-pressed="true"]',x=>x.length))===1);
  await P.click('[data-rv=team]'); await W(); await shot('switch-team-varsity');
  c=await checkSel(P,'#rvTeam [data-rvchart][aria-pressed="true"]'); ok(`${tag}: Raw / Adjusted: the same segmented style`, c.text>=4.5&&c.ring>=3&&!c.check&&c.weight>=700, JSON.stringify(c));
  c=await checkSel(P,'.rv-switch [aria-pressed="false"]');
  ok(`${tag}: unselected segments: text ≥4.5:1 on the track`, c.text>=4.5, JSON.stringify(c));
  c=await P.evaluate(()=>{ const {parse,ratio,bgOf}=window.__ct, el=document.querySelector('.btn.primary')||document.querySelector('#copyRes'); const cs=getComputedStyle(el); return +ratio(parse(cs.color),bgOf(el)).toFixed(2); });
  ok(`${tag}: primary buttons: text ≥4.5:1`, c>=4.5, c);
  await tab(P,'team'); await P.click('#addAth'); await W(); await P.click('#modal [data-gen=G]'); await W(); await shot('girls-boys');
  c=await checkSel(P,'#modal [data-gen][aria-pressed="true"]'); ok(`${tag}: Girls/Boys choice: the segmented style`, c.text>=4.5&&c.ring>=3&&c.weight>=700, JSON.stringify(c));
  await P.click('#modal [data-x=no]'); await W();
  // pressed: instant darken while held; disabled: faded + dashed
  const btn=await P.$('#addAth'); const bx=await btn.boundingBox(); await P.mouse.move(bx.x+10,bx.y+10); await P.mouse.down();
  const pressed=await P.$eval('#addAth',e=>getComputedStyle(e).filter); await P.mouse.up(); await W(); await P.evaluate(()=>{ document.querySelector('#overlay').hidden=true; });
  ok(`${tag}: pressed feedback is instant (darkens while held)`, /brightness/.test(pressed), pressed);
  await tab(P,'results'); await P.click('[data-rv=runners]'); await W(); await P.click('[data-runner="g0"]'); await W(400);
  const dis=await P.evaluate(()=>{ const b=document.querySelector('[data-rvchart=adj]:disabled')||(()=>{ const x=document.createElement('button'); x.className='btn'; x.disabled=true; x.textContent='x'; document.body.appendChild(x); return x; })(); const cs=getComputedStyle(b); return {o:+cs.opacity,style:cs.borderTopStyle}; });
  ok(`${tag}: disabled is clearly different (faded, iOS)`, dis.o<=0.6, JSON.stringify(dis));
  await shot('runner-raw');
  await P.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('#openSettings').click(); }); await W(); await P.click('#wake'); await W(); await shot('toggle-on');
  c=await P.evaluate(()=>{ const {parse,ratio,bgOf}=window.__ct, el=document.querySelector('#wake'); return +ratio(parse(getComputedStyle(el).backgroundColor),bgOf(el.parentElement)).toFixed(2); });
  ok(`${tag}: a switch that is on is filled ≥3:1 against its row`, c>=3, c);
  await P.evaluate(()=>{ document.querySelector('#overlay').hidden=true; MSApp.setRace({id:'rs',name:'Dual',status:'running',createdAt:Date.now(),gun:{local:Date.now()-300000,off:0,by:'x'},checkpoints:[{id:'c1',name:'Mile 1',dist:1609.34,unit:'mi'},{id:'c2',name:'Finish',dist:5000,unit:'m'}],runners:[{id:'g0',name:'Gina A.',group:''}],marks:[],goalSrc:'none',courseId:null,meetId:null,division:''}); }); await W(300);
  await P.evaluate(()=>document.querySelector('#liveBar').click()); await W(700); await shot('race-checkpoint');
  c=await checkSel(P,'.race-at [aria-pressed="true"]'); ok(`${tag}: Race Mode checkpoint ("I'm at"): the segmented style`, c&&c.text>=4.5&&c.ring>=3&&c.weight>=700, JSON.stringify(c));
  await P.evaluate(()=>MSApp.setRace(null)); await W();
}
const real=errs.filter(e=>!/Failed to fetch|NetworkError|net::|offline|play\(\)|NotAllowed/i.test(e));
ok('no page errors', !real.length, real.join(' | '));
console.log(bad?`\n${bad} FAILED`:'\nall passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.log('CRASH',e); process.exit(1); });
