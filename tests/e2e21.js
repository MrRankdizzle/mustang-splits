// 2.11.1 data organization, recreating the coach's real situation with fake names:
// - "Ben Tollefsrud" (fake) was imported onto a duplicate "Ben To." (Girls) because the file labeled his 2026 results
//   "Girls Varsity", while his teammates' results had no label; then "Ben To." was merged into "Ben T." (Boys). In 2.11.0
//   that left Ben in his own one-runner "Boys Varsity" race at each meet. (Regression test for the cause.)
// - Hand-timed races and official results for the same meet and division (Waupaca 10/1: 4 races -> 2), a hand-timed
//   race not linked to its meet (Jim Bremser 9/24 attaches by date), JV runners mixed into a gender-only group.
// - One race per division per meet, naming, seasons "2026", charts inside the meet, re-import updates (levels from
//   cut-off labels, links, full names) with one Undo and no duplicates, Data health with one-tap fixes, full names,
//   and long names on the Race Mode buttons.
const puppeteer=require('puppeteer-core'), fs=require('fs'), path=require('path');
const URL='http://localhost:8765/?emu', PW='gravel otter lantern 44', AD='quiet falcon harbor 12', OUT=process.argv[2]||path.join(__dirname,'out');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:150},arg); return true; }catch(e){ return false; } };
const MILE=1609.34, cps=()=>[{id:'m1',name:'Mile 1',dist:MILE,unit:'mi'},{id:'m2',name:'Mile 2',dist:2*MILE,unit:'mi'},{id:'fin',name:'Finish',dist:5000,unit:'m'}];
const roster=[{id:'ben',name:'Ben T.',gender:'B'},{id:'benTo',name:'Ben To.',gender:'G'},{id:'max',name:'Max P.',gender:'B'},{id:'ned',name:'Ned Q.',gender:'B'},{id:'jake',name:'Jake N.',gender:'B'},{id:'lin',name:'Lin B.',gender:'B'},
  {id:'gia',name:'Gia A.',gender:'G'},{id:'hal',name:'Hal B.',gender:'G'},{id:'zed',name:'Zed Z.',gender:''}].map(a=>({group:'',...a}));
const hand=(id,name,date,meetId,div,times)=>{ const ids=Object.keys(times), rows=ids.map(k=>({id:k,name:roster.find(a=>a.id===k).name,group:'',goal:null,goalTag:null,pr:null,sb:null,cells:[]})), marks=[];
  ids.forEach(k=>{ const t=times[k]; [[0,t*0.31],[1,t*0.635],[2,t]].forEach(([ci,v])=>marks.push({id:id+k+ci,ci,rid:k,t:Math.round(v*10)/10,dev:'s',byName:'Coach',at:0,chosen:false,deleted:false,hist:[]})); });
  return {id,key:id,date,savedAtMs:Date.parse(date+'T18:00'),uploaded:false,edits:[],race:{name,raceId:'race-'+id,courseId:null,courseName:'',goalSrc:'none',meetId,seriesId:null,division:div,checkpoints:cps(),rows,marks}}; };
const seed={v:1,settings:{tol:1,compact:false,sound:false,wake:false,liveLog:true,raceCols:2,coachName:'Coach Ann',coachAsked:true,genderGroups2100:true},workouts:[],watches:[],courses:[],prs:{},series:[],meets:[],merges:[],race:null,roster,
  raceLog:[hand('HW1','Waupaca Boys','2026-10-01','m26-2026-10-01-waupaca-invite','BV',{ben:1000,max:1120,ned:1146}),hand('HW2','Waupaca Girls','2026-10-01','m26-2026-10-01-waupaca-invite','GV',{gia:1392,hal:1478}),
    hand('HB1','Bremser Varsity Boys','2026-09-24',null,'',{ben:1050,max:1184,ned:1184}),hand('HB2','Bremser JV Boys','2026-09-24',null,'',{jake:1452,lin:1556})]};
const R=(date,meet,div,t)=>({season:'x',grade:11,level:'HS',distance:'5K',distance_m:5000,date,time:'',time_s:t,place:1,flag:'',meet,division:div,meet_name_cut_off:false,possible_duplicate_of:null});
// File A: as the coach's file: Ben's 2026 results printed "Girls Varsity", the teammates' with no label.
const A=[{name:'Ben Tollefsrud',res:[['2026-10-01','Waupaca Invitational','Girls Varsity',998.4],['2026-09-24','Jim Bremser Memorial XC Meet','Girls Varsity',1048.1]]},
  {name:'Max Pavlov',res:[['2026-10-01','Waupaca Invitational','',1119.4],['2026-09-24','Jim Bremser Memorial XC Meet','',1183.8]]},
  {name:'Ned Quist',res:[['2026-10-01','Waupaca Invitational','',1145],['2026-09-24','Jim Bremser Memorial XC Meet','',1183.2]]},
  {name:'Jake Norby',res:[['2026-09-24','Jim Bremser Memorial XC Meet','',1452.3],['2026-08-28','Appleton West Terror Invite','',1470]]},{name:'Lin Bauer',res:[['2026-09-24','Jim Bremser Memorial XC Meet','',1555.5],['2026-08-28','Appleton West Terror Invite','',1570]]},
  {name:'Gia Ames',res:[['2026-10-01','Waupaca Invitational','',1391.7]]},{name:'Hal Berg',res:[['2026-10-01','Waupaca Invitational','',1477.1],['2025-10-11','Albany Baertschi Invite','',1500]]}];
// File B: the same times, now with (cut-off) labels: the re-import must update, never duplicate.
const B=A.map(x=>({...x,res:x.res.map(r=>[r[0],r[1],x.name==='Ben Tollefsrud'?'Boys Varsity':['Jake Norby','Lin Bauer'].includes(x.name)?(x.name==='Jake Norby'?'Junior Varsi':'Junior V'):r[0]==='2025-10-11'?'':'Varsity D2/3',r[3]])}));
const file=(nm,L)=>{ const f=path.join(OUT,nm); fs.writeFileSync(f,JSON.stringify({format:'mustang-splits-history/v1',generated:'x',source:nm,athletes:L.map(x=>({name:x.name,aliases:[],school:'X',results:x.res.map(r=>R(...r))}))})); return f; };
const upload=async(p,f)=>{ await p.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=results]').click(); document.querySelector('#resImport').click(); }); await W(); await p.$eval('#histFile',i=>{ i.value=''; }); await (await p.$('#histFile')).uploadFile(f); await waitFor(p,()=>!!document.querySelector('#modal .imp-prev'),null,15000); await W(300); };
const pick=(p,name,id)=>p.evaluate((n,id)=>{ const r=[...document.querySelectorAll('#modal .imp-row')].find(x=>x.querySelector('b').textContent===n); const s=r&&r.querySelector('select'); if(s){ s.value=id; s.dispatchEvent(new Event('change')); } },name,id);
const meets=p=>p.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=meets]').click();
  const out={}; document.querySelectorAll('#histList details.hist-meet').forEach(m=>{ m.open=true; const head=m.querySelector(':scope>summary .mt-name').textContent.trim()+' '+m.querySelector(':scope>summary .n').textContent.trim();
    out[head]=[...m.querySelectorAll('details.div-race')].map(d=>{ d.open=true; return {title:d.querySelector('summary .dr-name').textContent.replace(/\s+/g,' ').trim(),runners:[...d.querySelectorAll('.race-cards .rcard .rc-head b')].map(x=>x.textContent),text:d.innerText}; }); });
  return out; });
const find=(M,pre)=>Object.entries(M).find(([k])=>k.startsWith(pre))||[null,[]];

const P=await (await b.createBrowserContext()).newPage();
await P.evaluateOnNewDocument(sd=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); if(!localStorage.getItem('mustang-splits:v1')) localStorage.setItem('mustang-splits:v1',sd); }catch(e){}
  const off=Date.parse('2026-10-05T16:00:00')-Date.now(), Rr=Date; class D extends Rr{ constructor(...a){ if(a.length) super(...a); else super(Rr.now()+off); } static now(){ return Rr.now()+off; } } D.parse=Rr.parse; D.UTC=Rr.UTC; window.Date=D; },JSON.stringify(seed));
await P.setViewport({width:390,height:844,isMobile:true,hasTouch:true}); P.on('pageerror',e=>errs.push(e.message));
await P.goto(URL); await P.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); require('./lib.js').patchClick(P); await W(800);
// the 2026 schedule, then the team (races on this phone go up to Team history)
await P.click('#openSettings'); await W(); await P.click('#openMeets'); await W(); await P.click('#modal [data-mx=seed]'); await W(); await P.evaluate(()=>document.querySelector('#overlay').hidden=true);
const form=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [x,v] of vals) await p.$eval(x,(i,v)=>i.value=v,v); await p.click('[data-x=yes]'); await waitFor(p,()=>document.querySelector('#overlay').hidden||document.querySelector('[data-x=mine]'),null,20000); };
await form(P,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1',AD]]); if(await waitFor(P,()=>document.querySelector('[data-x=mine]'),null,8000)){ await P.click('[data-x=mine]'); await W(1500); }
if(await waitFor(P,()=>document.querySelector('#modal .up-sheet'),null,6000)){ await P.click('#modal [data-x=yes]'); await W(2500); }
ok('4 hand-timed races in Team history', await waitFor(P,()=>MSApp.version()&&document.querySelectorAll('#histList details').length>=0&&true,null,2000) && await P.evaluate(()=>JSON.parse(localStorage.getItem('mustang-splits:v1')).raceLog.every(x=>x.uploaded)));

console.log('1. Import as 2.9 did: Ben onto the duplicate "Ben To.", then merge into "Ben T."');
await upload(P,file('a.json',A));
await pick(P,'Ben Tollefsrud','benTo'); await P.click('#modal [data-confirmall]').catch(()=>{}); await W();
for(const [n,id] of [['Max Pavlov','max'],['Ned Quist','ned'],['Jake Norby','jake'],['Lin Bauer','lin'],['Gia Ames','gia'],['Hal Berg','hal']]) await pick(P,n,id);
await P.click('#modal [data-x=yes]'); await W(1800); await P.evaluate(()=>document.querySelector('#overlay').hidden=true);
ok('Ben’s results came in labeled Girls Varsity (stored division GV), teammates unlabeled', await P.evaluate(()=>MSApp.backupData().then(d=>{ const r=d.official[0].results; return r.filter(x=>x.aid==='benTo').every(x=>x.division==='GV')&&r.filter(x=>x.aid==='max').every(x=>x.division===''); })));
await P.evaluate(()=>{ document.querySelector('.tab[data-tab=team]').click(); document.querySelector('#mergeAth').click(); }); await W(); await P.select('#modal [data-mg=dup]','benTo'); await P.select('#modal [data-mg=real]','ben'); await W(); await P.click('#modal [data-x=yes]'); await W(1200);

console.log('2. One race per division per meet');
let M=await meets(P);
let [wk,wr]=find(M,'Waupaca'); ok('Waupaca: 2 races (Girls Varsity, Boys Varsity), not 4', wr.length===2&&wr.map(x=>x.title.split(' ').slice(0,2).join(' ')).join()==='Girls Varsity,Boys Varsity', wk+' '+JSON.stringify(wr.map(x=>x.title)));
const wb=wr.find(x=>x.title.startsWith('Boys Varsity'));
ok('Boys Varsity: hand-timed and official in one race (badges Official, Splits), each runner once', wb&&/Official/.test(wb.title)&&/Splits/.test(wb.title)&&wb.runners.join()==='Ben T.,Max P.,Ned Q.', wb&&wb.title+' | '+wb.runners.join());
ok('the official finish is the result; the hand time shows as a note where they differ', wb&&wb.text.includes('16:38.4')&&wb.text.includes('hand 16:40.0'));
ok('the last split runs to the official finish (Mile 2 → official finish)', await P.evaluate(()=>{ const d=[...document.querySelectorAll('details.div-race')].find(x=>x.dataset.combo&&x.dataset.combo.includes('waupaca')&&x.dataset.combo.endsWith('|BV')); const c=d&&[...d.querySelectorAll('.race-cards .rcard')].find(x=>x.querySelector('.rc-head b').textContent==='Ben T.'); const rows=c?[...c.querySelectorAll('.rc-row')]:[]; const fin=rows[2]; return !!fin&&/16:38\.4/.test(fin.innerText)&&/\b6:03\b/.test(fin.innerText); })); // Mile 2 hand 10:35.0 → official 16:38.4 = 6:03
let [jk,jr]=find(M,'Jim Bremser'); const jb=jr.filter(x=>x.title.startsWith('Boys'));
ok('Jim Bremser (9/24): the unlinked hand-timed races attach to the scheduled meet by date', jr.some(x=>/Splits/.test(x.title)), jk+' '+JSON.stringify(jr.map(x=>x.title)));
ok('Jim Bremser boys: 2 races (Varsity with Ben, JV with Jake and Lin), not 3; Ben not stranded', jb.length===2&&jb[0].title.startsWith('Boys Varsity')&&jb[0].runners.includes('Ben T.')&&jb[1].title.startsWith('Boys JV')&&jb[1].runners.join()==='Jake N.,Lin B.', JSON.stringify(jb.map(x=>x.title+':'+x.runners.join('/'))));
ok('names: header = meet + date; rows = division only (no meet name in row titles)', /^Jim Bremser Memorial Thu, 9\/24/.test(jk)&&jr.every(x=>!/Bremser|Memorial|Waupaca/.test(x.title)));
ok('seasons labeled by the fall year ("2026 season")', await P.evaluate(()=>[...document.querySelectorAll('#histList .hist-season')].map(x=>x.textContent.trim())[0]==='2026 season'));
ok('no "Charts" headings between meets; charts sit inside each meet', await P.evaluate(()=>![...document.querySelectorAll('#histList > details:not(.hist-meet) > summary,#histList > summary')].some(s=>/Charts/.test(s.textContent))&&!!document.querySelector('#histList details.hist-meet .mt-charts')));
// re-sort after a Girls/Boys change
await P.evaluate(()=>{ document.querySelector('.tab[data-tab=team]').click(); }); await W(); await P.click('.ath[data-id="max"] .ath-row'); await W(); await P.click('#modal [data-rg=G]'); await W(); await P.click('#modal [data-x=done]'); await W();
M=await meets(P); [wk,wr]=find(M,'Waupaca');
ok('Max set to Girls: his Waupaca result moves to Girls Varsity at once', wr.find(x=>x.title.startsWith('Girls Varsity')).runners.includes('Max P.')&&!wr.find(x=>x.title.startsWith('Boys Varsity')).runners.includes('Max P.'));
await P.click('.ath[data-id="max"] .ath-row').catch(async()=>{ await P.evaluate(()=>document.querySelector('.tab[data-tab=team]').click()); await W(); await P.click('.ath[data-id="max"] .ath-row'); }); await W(); await P.click('#modal [data-rg=B]'); await W(); await P.click('#modal [data-x=done]'); await W();
ok('Runners view follows the merge (Ben T.’s card has his Waupaca and Bremser results)', await P.evaluate(()=>{ document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=runners]').click(); document.querySelector('[data-runner="ben"]').click(); const t=document.querySelector('#rvRunners').innerText; return t.includes('16:38.4')&&t.includes('17:28.1'); }));

console.log('3. Re-import: updates, not just new times');
await upload(P,file('b.json',B)); await P.click('#modal [data-confirmall]').catch(()=>{}); await W();
const pv=await P.$eval('#modal',m=>m.innerText);
ok('preview shows Updates with counts: 2 levels (Jake "Junior Varsi", Lin "Junior V" at 8/28: no hand-timed race there), 1 full name; no new results', /Updates for results already imported: 2 Varsity\/JV levels · 1 full name/.test(pv)&&/0\s+new results/.test(pv), (pv.match(/Updates[^\n]*/)||[''])[0]);
const before=await P.evaluate(()=>MSApp.officialStats().live);
await P.click('#modal [data-x=yes]'); await W(1500);
ok('applied: both 8/28 results JV; no duplicates', (await P.evaluate(()=>MSApp.officialStats().live))===before && await P.evaluate(()=>MSApp.backupData().then(d=>{ const L=[]; d.official.forEach(o=>(o.edits||[]).forEach(v=>{ if(v.op==='level') L.push(v.k.split('|')[1]+':'+v.level); })); return L.join()==='2026-08-28:JV,2026-08-28:JV'; })));
M=await meets(P); ok('Appleton West 8/28: Jake and Lin in Boys JV', (find(M,'Appleton West')[1].find(x=>x.title.startsWith('Boys JV'))||{runners:[]}).runners.join()==='Jake Norby,Lin Bauer', JSON.stringify(find(M,'Appleton West')[1].map(x=>x.title+':'+x.runners.join('/'))));
ok('full names filled in from the file (Ben T. → Ben Tollefsrud), no new runners', await P.evaluate(()=>MSApp.getRoster().some(a=>a.id==='ben'&&a.name==='Ben Tollefsrud')&&MSApp.getRoster().length===8), await P.evaluate(()=>MSApp.getRoster().map(a=>a.name).join()));
await P.evaluate(()=>[...document.querySelectorAll('#snack button')].find(x=>x.textContent==='Undo').click()); await W(800);
ok('one Undo reverses every update', await P.evaluate(()=>MSApp.getRoster().find(a=>a.id==='ben').name==='Ben T.'));
await upload(P,file('b.json',B)); await P.click('#modal [data-confirmall]').catch(()=>{}); await W(); await P.click('#modal [data-x=yes]'); await W(1500);
ok('re-importing again applies them again, still nothing duplicated', (await P.evaluate(()=>MSApp.officialStats().live))===before && await P.evaluate(()=>MSApp.getRoster().find(a=>a.id==='ben').name==='Ben Tollefsrud'));

console.log('4. Data health');
await P.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=results]').click(); }); await W(400);
ok('a badge shows on the Data tab', await P.$eval('.tab[data-tab=results]',t=>+t.dataset.badge>0), await P.$eval('.tab[data-tab=results]',t=>t.dataset.badge));
await P.click('#resHealth'); await W(500);
const ht=await P.$eval('#modal',m=>m.innerText);
ok('lists: a runner with no Girls/Boys (Zed), results with no level (Albany 2025)', ht.includes('Zed Z. has no Girls/Boys setting')&&/official results? ha(s|ve) no Varsity\/JV level/.test(ht), ht.split('\n').slice(0,12).join(' | '));
await P.click('#modal [data-hfix="g:zed:B"]'); await W(500);
ok('one tap fixes it (Zed → Boys) and the list updates', !(await P.$eval('#modal',m=>m.innerText)).includes('Zed Z. has no Girls/Boys') && await P.evaluate(()=>MSApp.getRoster().find(a=>a.id==='zed').gender==='B'));
await P.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=team]').click(); }); await W();
await P.click('.team-sec[data-sec="B"] [data-t=addsec]'); await W(); await P.type('#athName','Max Pavlov'); await P.click('#modal [data-x=yes]'); await W(500);
await P.evaluate(()=>document.querySelector('#resHealth').click()); await W(500);
ok('suspected duplicates: the two "Max Pavlov"s, with Merge…', (await P.$eval('#modal',m=>m.innerText)).includes('Max Pavlov and Max Pavlov may be the same runner') && !!(await P.$('#modal [data-hfix^="merge:"]')));
await P.evaluate(()=>document.querySelector('#overlay').hidden=true);

console.log('5. Full names and the Race Mode buttons');
ok('a full name typed on the Team tab is kept (team mode)', await P.evaluate(()=>MSApp.getRoster().some(a=>a.name==='Max Pavlov')));
await P.evaluate(()=>{ const long=['Christopher Vanderwerff','Alexandrina Montgomery-Smith','Bartholomew Kowalczykowski','Guinevere Oyelaran','Maximiliano Castellanos','Ben Tollefsrud','Max Pavlov'];
  MSApp.setRace({id:'rl',name:'Long names',status:'running',createdAt:Date.now(),gun:{local:Date.now()-60000,off:0,by:'x'},checkpoints:[{id:'f',name:'Finish',dist:5000,unit:'m'}],runners:long.map((n,i)=>({id:'L'+i,name:n,group:''})),marks:[],goalSrc:'none',courseId:null,meetId:null,division:''}); });
for(const cols of [2,3]){ await P.evaluate(c=>{ const s=JSON.parse(localStorage.getItem('mustang-splits:v1')); },cols);
  await P.evaluate(()=>document.querySelector('#liveBar').click()); await W(700);
  await P.evaluate(c=>{ const g=document.querySelector('#raceGrid'); g.classList.remove('cols-2','cols-3'); g.classList.add('cols-'+c); },cols); await P.evaluate(()=>window.dispatchEvent(new Event('resize'))); await W(300);
  const measure=()=>P.evaluate(()=>[...document.querySelectorAll('#raceGrid [data-rn]')].map(b=>{ const nm=b.querySelector('.nm'), B=b.getBoundingClientRect(), r=nm.getBoundingClientRect(), t=b.querySelector('.t').getBoundingClientRect(), by=b.querySelector('.by');
    const inside=x=>!x.height||(x.top>=B.top-0.5&&x.bottom<=B.bottom+0.5&&x.left>=B.left-0.5&&x.right<=B.right+0.5);
    return {n:nm.textContent,fs:parseFloat(getComputedStyle(nm).fontSize),w:nm.scrollWidth<=nm.clientWidth+1,in:inside(r)&&inside(t)&&inside(by.getBoundingClientRect()),lines:Math.round(nm.offsetHeight/parseFloat(getComputedStyle(nm).lineHeight))}; }));
  await P.screenshot({path:path.join(__dirname,'screenshots',`race-long-names-${cols}col.png`)}).catch(()=>{});
  let fit=await measure();
  ok(`${cols} columns, upright phone: every long name fully inside its button (≤ 2 lines, text ≥ 10 px, nothing cut off)`, fit.every(f=>f.w&&f.in&&f.fs>=10&&f.lines<=2), JSON.stringify(fit.map(f=>f.n.split(' ')[0]+':'+f.fs+'px/'+f.lines+'l'+(f.w&&f.in?'':' CUT'))));
  await P.evaluate(()=>{ const r=MSApp.getRace(); r.runners.forEach((x,i)=>r.marks.push({id:'mk'+i,cp:'f',local:Date.now()-1000*(10-i),off:0,runnerId:x.id,by:i%2?'other':'x',byName:i%2?'Coach Jennifer':'',hist:undefined})); MSApp.setRace(r); }); await W(500);
  await P.evaluate(()=>{ document.querySelector('#overlay').hidden=true; }); await P.evaluate(c=>{ const g=document.querySelector('#raceGrid'); if(g){ g.classList.remove('cols-2','cols-3'); g.classList.add('cols-'+c); } },cols); await W(300);
  fit=await measure();
  ok(`${cols} columns, recorded (name + "✓ time" + coach): still nothing cut off`, fit.every(f=>f.w&&f.in&&f.lines<=2), JSON.stringify(fit.map(f=>f.n.split(' ')[0]+':'+f.fs.toFixed(1)+'px/'+f.lines+'l'+(f.w&&f.in?'':' CUT'))));
  await P.screenshot({path:path.join(__dirname,'screenshots',`race-long-names-${cols}col-recorded.png`)}).catch(()=>{});
  await P.evaluate(()=>{ const r=MSApp.getRace(); r.marks=[]; MSApp.setRace(r); }); await W(300);
  await P.evaluate(c=>{ const g=document.querySelector('#raceGrid'); },cols); }
await P.evaluate(()=>MSApp.setRace(null));
const real=errs.filter(e=>!/Failed to fetch|NetworkError|net::|offline|play\(\)|NotAllowed/i.test(e)); ok('no page errors', !real.length, real.join(' | '));
console.log(bad?`\n${bad} FAILED`:'\nall passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.log('CRASH',e); process.exit(1); });
