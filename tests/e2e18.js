// 2.9.2 data fixes: the matcher always asks about plausible matches (the "Ben To." bug: a stray "Girls" label in the
// file hid "Ben T."), no runner defaults to Girls (divisions follow the Team tab's Girls/Boys; none = Unassigned with
// a prompt), and Merge runners (admin): results, marks, tags, PRs, stopwatches move; one Undo; team sync. Fake names.
const puppeteer=require('puppeteer-core'), fs=require('fs'), path=require('path');
const URL='http://localhost:8765/?emu', PW='gravel otter lantern 44', AD='quiet falcon harbor 12', OUT=process.argv[2]||path.join(__dirname,'out');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:150},arg); return true; }catch(e){ return false; } };
const MILE=1609.34, cps=()=>[{id:'m1',name:'Mile 1',dist:MILE,unit:'mi'},{id:'m2',name:'Mile 2',dist:2*MILE,unit:'mi'},{id:'fin',name:'Finish',dist:5000,unit:'m'}];
const seed={v:1,settings:{tol:1,compact:false,sound:false,wake:false,liveLog:true,raceCols:2,coachName:'Coach Ann',coachAsked:true},workouts:[],courses:[],series:[],meets:[],merges:[],race:null,
  roster:[{id:'ben',name:'Ben T.',group:'',gender:'B'},{id:'benTo',name:'Ben To.',group:'',gender:'G'},{id:'maya',name:'Maya T.',group:'',gender:'G'},{id:'sam',name:'Sam D.',group:'',gender:''}],
  prs:{benTo:[{dist:5000,t:1100}],ben:[{dist:5000,t:1120}]},
  watches:[{id:'w1',name:'Ben To.',workoutId:null,status:'idle',startAt:0,pausedT:0,run:{rep:0,repStartT:0,cp:0,phase:'run',restEndT:0,splits:[],laps:[]},athleteIds:['benTo'],athleteNames:['Ben To.'],autoName:'Ben To.',plan:null}],
  raceLog:[{id:'HB',key:'HB',date:'2026-09-24',savedAtMs:Date.parse('2026-09-24T18:00'),uploaded:false,edits:[{op:'tag',rid:'benTo',tags:['Fell'],note:'',uid:'x',dev:'x',byName:'Coach',at:1}],race:{name:'Dual',raceId:'race-HB',courseId:null,courseName:'',goalSrc:'none',meetId:null,seriesId:null,division:'BV',checkpoints:cps(),
    rows:[{id:'benTo',name:'Ben To.',group:'',goal:null,goalTag:null,pr:null,sb:null,cells:[]}],marks:[{id:'hb1',ci:2,rid:'benTo',t:1090.0,dev:'x',byName:'Coach',at:0,chosen:false,deleted:false,hist:[]}]}}]};
async function phone(tag,sd){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage();
  await p.evaluateOnNewDocument(sd=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); if(sd&&!localStorage.getItem('mustang-splits:v1')) localStorage.setItem('mustang-splits:v1',sd); }catch(e){}
    const off=Date.parse('2026-10-05T16:00:00')-Date.now(), R=Date; class D extends R{ constructor(...a){ if(a.length) super(...a); else super(R.now()+off); } static now(){ return R.now()+off; } } D.parse=R.parse; D.UTC=R.UTC; window.Date=D; },sd?JSON.stringify(sd):null);
  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(tag+': '+e.message));
  await p.goto(URL); await p.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); require('./lib.js').patchClick(p); await W(800); return p; }
const R=(date,meet,div,t)=>({season:'x',grade:11,level:'HS',distance:'5K',distance_m:5000,date,time:'',time_s:t,place:1,flag:'',meet,division:div,meet_name_cut_off:false,possible_duplicate_of:null});
const file=(name,ath)=>{ const f=path.join(OUT,name); fs.writeFileSync(f,JSON.stringify({format:'mustang-splits-history/v1',generated:'x',source:name,athletes:ath})); return f; };
const upload=async(p,f)=>{ await p.$eval('#histFile',i=>{ i.value=''; }); await (await p.$('#histFile')).uploadFile(f); await waitFor(p,()=>!!document.querySelector('#modal .imp-prev'),null,15000); await W(300); };
const rowOf=(p,name)=>p.evaluate(n=>{ const r=[...document.querySelectorAll('#modal .imp-row')].find(x=>x.querySelector('b').textContent===n); return r?{st:r.dataset.st,opts:r.querySelector('select')?[...r.querySelector('select').options].map(o=>o.textContent):null,sel:r.querySelector('select')?r.querySelector('select').selectedOptions[0].textContent:null}:null; },name);
const roster=p=>p.evaluate(()=>MSApp.getRoster().map(a=>a.name).sort().join(','));
const offNames=p=>p.evaluate(()=>{ document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=meets]').click();
  document.querySelectorAll('#histList details.hist-meet').forEach(m=>{ m.open=true; }); // 2.11.1: one race per division inside each meet
  return [...document.querySelectorAll('#histList details.div-race')].map(d=>d.querySelector('summary .dr-name').textContent.replace(/\s+/g,' ').trim()+' :: '+[...d.querySelectorAll('.race-cards .rcard .rc-head b')].map(t=>t.textContent).join('/')); });

console.log('1. The matcher asks; nothing is created silently');
const L=await phone('L',seed);
// "Ben Tollefsrud": one stray "Girls Varsity" label and one "Boys Varsity" (2.9.0 guessed Girls and hid "Ben T.")
const ath=[{name:'Ben Tollefsrud',aliases:[],school:'X',results:[R('2025-09-04','Kiel Invite','Girls Varsity',1080),R('2025-09-20','Smiley Invite','Boys Varsity',1070)]},
  {name:'Maya Testwood',aliases:[],school:'X',results:[R('2025-09-04','Kiel Invite','Girls Varsity',1250)]},
  {name:'Sam Doe',aliases:[],school:'X',results:[R('2025-09-04','Kiel Invite','Varsity',1150)]}];
await L.click('.tab[data-tab=results]'); await W(); await L.evaluate(()=>document.querySelector('#resImport').click()); await W(); await upload(L,file('m1.json',ath));
const ben=await rowOf(L,'Ben Tollefsrud');
ok('Ben Tollefsrud: "Ben T." and "Ben To." are both offered and nothing is preselected as new', ben.st==='check'&&ben.opts.some(o=>o.startsWith('Ben T.'))&&ben.opts.some(o=>o.startsWith('Ben To.'))&&!ben.sel.startsWith('Add as a new'), JSON.stringify(ben));
ok('Maya Testwood → Maya T. is asked too (same first name + last initial)', (await rowOf(L,'Maya Testwood')).st==='check');
ok('Save waits for the matches', await L.$eval('#modal [data-x=yes]',b=>b.disabled&&b.textContent.startsWith('Confirm 3 matches')), await L.$eval('#modal [data-x=yes]',b=>b.textContent));
await L.evaluate(()=>{ const r=[...document.querySelectorAll('#modal .imp-row')].find(x=>x.querySelector('b').textContent==='Ben Tollefsrud'), s=r.querySelector('select'); s.value='ben'; s.dispatchEvent(new Event('change')); });
await L.click('#modal [data-confirmall]'); await W(); await L.click('#modal [data-x=yes]'); await W(1500); await L.evaluate(()=>document.querySelector('#overlay').hidden=true);
ok('no runner was created (the matched ones got their full names, 2.11.1)', (await roster(L))==='Ben To.,Ben Tollefsrud,Maya Testwood,Sam Doe', await roster(L));

console.log('2. Divisions follow the Team tab; no Girls default');
let on=await offNames(L);
ok('Ben’s results are Boys (his setting), even the race printed "Girls Varsity"', on.some(x=>/Boys[^:]*:: [^|]*Ben Tollefsrud/.test(x))&&!on.some(x=>/Girls[^:]*:: [^|]*Ben Tollefsrud/.test(x)), on.join(' || '));
ok('Sam (no Girls/Boys setting) is Unassigned, with a prompt', on.some(x=>/Unassigned[^:]*:: [^|]*Sam Doe/.test(x)) && await L.evaluate(()=>!!document.querySelector('#histList [data-setg^="sam:"]')));
await L.evaluate(()=>{ const d=[...document.querySelectorAll('#histList details.div-race')].find(x=>x.textContent.includes('Unassigned')); d.open=true; d.querySelector('[data-setg="sam:B"]').click(); }); await W(500);
on=await offNames(L);
ok('setting Boys moves Sam into the Boys list right away', on.some(x=>/Boys[^:]*:: [^|]*Sam Doe/.test(x))&&!on.some(x=>x.includes('Unassigned')), on.join(' || '));

console.log('3. Merge runners');
// the duplicate also gets official results (as the 2.9.0 import did)
await L.evaluate(()=>document.querySelector('#resImport').click()); await W(); await upload(L,file('m2.json',[{name:'Benny Toe',aliases:[],school:'X',results:[R('2024-09-05','Kiel Invite','Boys Varsity',1110)]}]));
await L.evaluate(()=>{ const r=document.querySelector('#modal .imp-row'), s=r.querySelector('select'); s.value='benTo'; s.dispatchEvent(new Event('change')); }); await W();
await L.click('#modal [data-x=yes]'); await W(1500); await L.evaluate(()=>document.querySelector('#overlay').hidden=true);
await L.click('.tab[data-tab=team]'); await W();
ok('Team tab: Merge runners (admin / no team)', !(await L.$eval('#mergeAth',x=>x.hidden)));
await L.click('#mergeAth'); await W(); await L.select('#modal [data-mg=dup]','benTo'); await L.select('#modal [data-mg=real]','ben'); await W();
const sum=await L.$eval('#modal .mg-sum',x=>x.innerText);
ok('the sheet says what moves (1 official result, 1 hand-timed race, 1 PR, 1 stopwatch) and notes the Girls/Boys difference', /1 official result, 1 hand-timed race, 1 PR, 1 stopwatch/.test(sum)&&sum.includes('marked Girls'), sum);
await L.click('#modal [data-x=yes]'); await W(800);
ok('the duplicate is gone, the real runner stays Boys', (await roster(L))==='Ben Tollefsrud,Maya Testwood,Sam Doe' && await L.evaluate(()=>MSApp.getRoster().find(a=>a.id==='ben').gender==='B'));
ok('stopwatch link moved', await L.evaluate(()=>{ const w=JSON.parse(localStorage.getItem('mustang-splits:v1')).watches[0]; return w.athleteIds.join()==='ben'&&w.athleteNames.join()==='Ben Tollefsrud'; }));
ok('PRs merged (the faster 18:20 kept)', await L.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('mustang-splits:v1')).prs.ben)==='[{"dist":5000,"t":1100}]'));
await L.click('.tab[data-tab=results]'); await W(); await L.click('[data-rv=runners]'); await W(); await L.click('[data-runner="ben"]'); await W(600);
const card=await L.$eval('#rvRunners',e=>e.innerText);
ok('runner card: the duplicate’s official result (2024 Kiel 18:30) and hand-timed race (Dual 18:10, tag Fell) are Ben T.’s now', card.includes('18:30.0')&&/Dual[\s\S]*18:10\.0/.test(card)&&card.includes('Fell'), card.slice(0,600).replace(/\n/g,' | '));
on=await offNames(L);
ok('Meets: the duplicate’s results are Ben Tollefsrud’s, all in Boys races (never Girls, never "Ben Toe")', on.filter(x=>/^Boys[^:]*:: [^|]*Ben Tollefsrud/.test(x)).length===3&&!on.some(x=>x.includes('Ben Toe/')||/Ben Toe$/.test(x)||/^Girls[^:]*:: [^|]*Ben Tollefsrud/.test(x)), on.join(' || '));
ok('Recently deleted has the merge', await L.evaluate(()=>MSApp.trashCount()>=1));
await L.evaluate(()=>[...document.querySelectorAll('#snack button')].find(b=>b.textContent==='Undo').click()); await W(800);
ok('one Undo reverses the whole merge', (await roster(L))==='Ben Toe,Ben Tollefsrud,Maya Testwood,Sam Doe' && await L.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('mustang-splits:v1')); return s.watches[0].athleteIds.join()==='benTo'&&s.prs.benTo[0].t===1100&&s.prs.ben[0].t===1120&&!s.merges.length; }));
on=await offNames(L); ok('…and the duplicate’s results are its own again', on.some(x=>/Ben Toe(\/|$)/.test(x)));

console.log('4. Team: admin merges, every coach follows');
const A=await phone('A',seed), B2=await phone('B',{...seed,roster:[],raceLog:[],prs:{}}); // B has only a stopwatch linked to the duplicate
const form=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [x,v] of vals) await p.$eval(x,(i,v)=>i.value=v,v); await p.click('[data-x=yes]'); await waitFor(p,()=>document.querySelector('#overlay').hidden||document.querySelector('[data-x=mine]'),null,20000); };
const merge=async p=>{ if(await waitFor(p,()=>document.querySelector('[data-x=mine]'),null,8000)){ await p.click('[data-x=mine]'); await W(1500); } };
await form(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1',AD]]); await merge(A); await W(1200);
await form(B2,'#tmJoin',[['#tmPw1',PW]]); await merge(B2); await W(2000);
const ids={'Ben To.':'benTo','Ben T.':'ben'}; // (joining a team shortens both names to "Ben T."; the ids stay)
await B2.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=team]').click(); }); await W(); ok('a coach (not admin) has no Merge runners', await B2.$eval('#mergeAth',x=>x.hidden));
await A.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=team]').click(); }); await W(); await A.evaluate(()=>document.querySelector('#mergeAth').click()); await W(); await A.select('#modal [data-mg=dup]',ids['Ben To.']); await A.select('#modal [data-mg=real]',ids['Ben T.']); await W(); await A.click('#modal [data-x=yes]'); await W(1500);
ok('B: the duplicate leaves the roster', await waitFor(B2,()=>!MSApp.getRoster().some(a=>a.id==='benTo')&&MSApp.getRoster().some(a=>a.id==='ben'),null,20000), await roster(B2));
ok('B: its own stopwatch link follows the merge', await waitFor(B2,id=>{ const w=JSON.parse(localStorage.getItem('mustang-splits:v1')).watches[0]; return w.athleteIds.join()===id; },ids['Ben T.'],15000));
const real=errs.filter(e=>!/Failed to fetch|NetworkError|net::|offline|play\(\)|NotAllowed/i.test(e));
ok('no page errors', !real.length, real.join(' | '));
console.log(bad?`\n${bad} FAILED`:'\nall passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.log('CRASH',e); process.exit(1); });
