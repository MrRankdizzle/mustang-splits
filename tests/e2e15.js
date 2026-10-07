// 2.9.0 career history import (fixture with fake names: tests/fixtures/fake-history-fixture.json).
// Preview (runners, results, duplicates, new meets), runner matching (alias, nickname = confirm, remembered), names
// stored with full names (2.11.1), meet-name variants as one series, duplicates, official vs hand-timed,
// career sections and team view, re-import adds nothing, Undo as one action and restore, team sync (admin only),
// Delete permanently, and performance with 600 results.
const puppeteer=require('puppeteer-core'), fs=require('fs'), path=require('path');
const URL='http://localhost:8765/?emu', PW='gravel otter lantern 44', AD='quiet falcon harbor 12';
const FIX=path.join(__dirname,'fixtures','fake-history-fixture.json'), OUT=process.argv[2]||path.join(__dirname,'out');
const FULL=['Fakerson','Testwood','Newfield','Pastman','Fillmore','Quill','Benjamin','Isabella'];
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:150},arg); return true; }catch(e){ return false; } };
const shot=(p,n)=>p.screenshot({path:`${OUT}/shots/e2e15-${n}.png`,fullPage:true}).catch(()=>{});
async function phone(tag,seed){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage();
  await p.evaluateOnNewDocument(sd=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:test-flat-settings','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); if(sd&&!localStorage.getItem('mustang-splits:v1')) localStorage.setItem('mustang-splits:v1',sd); }catch(e){}
    const off=Date.parse('2026-10-04T12:00:00')-Date.now(), R=Date; class D extends R{ constructor(...a){ if(a.length) super(...a); else super(R.now()+off); } static now(){ return R.now()+off; } } D.parse=R.parse; D.UTC=R.UTC; window.Date=D; },seed?JSON.stringify(seed):null);
  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(tag+': '+e.message));
  await p.goto(URL); await p.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); require('./lib.js').patchClick(p); await W(800); return p; }
const MILE=1609.34, cps=()=>[{id:'m1',name:'Mile 1',dist:MILE,unit:'mi'},{id:'m2',name:'Mile 2',dist:2*MILE,unit:'mi'},{id:'fin',name:'Finish',dist:5000,unit:'m'}];
const seed={v:1,settings:{tol:1,compact:false,sound:false,wake:false,liveLog:true,raceCols:2,coachName:'Coach Ann',coachAsked:true},workouts:[],watches:[],courses:[],prs:{},series:[],meets:[],race:null,
  roster:[{id:'ben',name:'Ben F.',group:'',gender:'B'},{id:'izzy',name:'Izzy Q.',group:'',gender:'G'},{id:'maya',name:'Maya T.',group:'',gender:'G'},{id:'sam',name:'Sam D.',group:'',gender:'B'},{id:'sammy',name:'Sammy D.',group:'',gender:'B'}],
  raceLog:[{id:'HK',key:'HK',date:'2026-09-03',savedAtMs:Date.parse('2026-09-03T18:00'),uploaded:false,edits:[],race:{name:'Kiel hand-timed',raceId:'race-HK',courseId:null,courseName:'',goalSrc:'none',meetId:null,seriesId:null,division:'GV',checkpoints:cps(),
    rows:[{id:'izzy',name:'Izzy Q.',group:'',goal:null,goalTag:null,pr:null,sb:null,cells:[]}],marks:[{id:'hk1',ci:2,rid:'izzy',t:1241.0,dev:'x',byName:'Coach',at:0,chosen:false,deleted:false,hist:[]}]}}]};
const upload=async(p,file)=>{ await p.$eval('#histFile',i=>{ i.value=''; }); const inp=await p.$('#histFile'); await inp.uploadFile(file); await waitFor(p,()=>!!document.querySelector('#modal .imp-prev'),null,15000); await W(300); };
const prevText=p=>p.$eval('#modal',m=>m.innerText);
const rowOf=(p,name)=>p.evaluate(n=>{ const r=[...document.querySelectorAll('#modal .imp-row')].find(x=>x.querySelector('b').textContent===n); return r?{st:r.dataset.st,txt:r.innerText,opts:r.querySelector('select')?[...r.querySelector('select').options].map(o=>o.textContent):null,sel:r.querySelector('select')?r.querySelector('select').selectedOptions[0].textContent:null}:null; },name);
const stats=p=>p.evaluate(()=>MSApp.officialStats());
const fullNameLeak=p=>p.evaluate(async F=>{ const parts=[JSON.stringify(localStorage)];
  const d=await new Promise(r=>{ const q=indexedDB.open('mustang-splits'); q.onsuccess=()=>r(q.result); q.onerror=()=>r(null); });
  for(const n of ['official','trash','races']) parts.push(JSON.stringify(await new Promise(r=>{ try{ const q=d.transaction(n).objectStore(n).getAll(); q.onsuccess=()=>r(q.result); q.onerror=()=>r([]); }catch(e){ r([]); } })));
  const all=parts.join(' '); return F.filter(x=>all.includes(x)); },FULL);

console.log('Local phone: preview');
const L=await phone('L',seed);
await L.click('#openSettings'); await W();
ok('Settings has "Import history file" on a phone without a team', !!(await L.$('#openImport'))); await L.click('#openImport'); await W();
ok('Official results sheet with Import history file', !!(await L.$('#modal #impPick')));
await upload(L,FIX); await shot(L,'01-preview');
const pt=await prevText(L);
ok('preview counts: 9 runners, 29 new results, 1 duplicate skipped', /9\s+runners · 29\s+new results · 1 duplicate skipped/.test(pt.replace(/\n/g,' ')), pt.split('\n').slice(1,3).join(' | '));
ok('preview lists new meet series and past meets', /New: \d+ meet series, \d+ past meets/.test(pt));
const ben=await rowOf(L,'Benjamin Fakerson'), izzy=await rowOf(L,'Isabella Quill'), maya=await rowOf(L,'Maya Testwood'), nora=await rowOf(L,'Nora Newfield'), oli=await rowOf(L,'Oliver Pastman'), sam=await rowOf(L,'Sam Doe');
ok('Benjamin → Ben F. (his alias): suggested, and asked (2.9.2: plausible matches are always confirmed)', ben.st==='check'&&ben.sel.startsWith('Ben F.'), JSON.stringify(ben));
ok('Isabella → Izzy Q. is a nickname: needs confirming', izzy.st==='check'&&izzy.sel.startsWith('Izzy Q.')&&izzy.sel.includes('nickname'), JSON.stringify(izzy));
ok('Maya → Maya T. suggested and asked; her duplicate is counted', maya.st==='check'&&maya.sel.startsWith('Maya T.')&&maya.txt.includes('1 duplicate'), maya&&maya.txt);
ok('Nora (grade 10 now) is offered as a new runner', nora.st==='new'&&nora.sel==='Add as a new runner', JSON.stringify(nora));
ok('Oliver (graduated) is not added by default', oli.st==='new'&&oli.sel.startsWith('Don’t link')&&oli.txt.includes('graduated'), JSON.stringify(oli));
ok('Sam Doe: two possible runners, coach picks', sam.st==='check'&&sam.opts.includes('Sam D.')&&sam.opts.some(o=>o.startsWith('Sammy D.')), JSON.stringify(sam));
const meets=await L.$$eval('#modal .imp-meet',x=>x.map(e=>({names:e.querySelector('span').childNodes[0].textContent,sel:e.querySelector('select').selectedOptions[0].textContent})));
const mFind=s=>meets.find(m=>m.names.includes(s));
ok('Kiel Invite / Kiel Invitational / Kiel Raiders Invite are one series: Kiel Raiders Invite', (()=>{ const m=mFind('Kiel Invitational'); return m&&m.names.includes('Kiel Invite')&&m.names.includes('Kiel Raiders Invite')&&m.sel.startsWith('Kiel Raiders Invite'); })(), JSON.stringify(meets));
ok('Smiley Invite / Bill Smiley Invite → Smiley Invitational', (()=>{ const m=mFind('Bill Smiley Invite'); return m&&m.names.includes('Smiley Invite')&&m.sel.startsWith('Smiley Invitational'); })());
ok('Red Raider Invite / 44th Annual Red Raider Invitational → one new series', (()=>{ const m=mFind('Red Raider Invite'); return m&&m.names.includes('44th Annual Red Raider Invitational')&&m.sel.startsWith('Red Raider Invite'); })());
ok('cut-off "Appleton West Terror Inv" → Appleton West Terror Invite', (()=>{ const m=mFind('Appleton West Terror Inv'); return m&&m.sel.startsWith('Appleton West Terror Invite'); })());
ok('NEC Conference Championship → NEC Championship; a sectional → WIAA Sectional', mFind('NEC Conference Championship').sel.startsWith('NEC Championship')&&mFind('WIAA Division 2 Sectional').sel.startsWith('WIAA Sectional'));
// coach picks Sammy for Sam Doe
await L.evaluate(()=>{ const r=[...document.querySelectorAll('#modal .imp-row')].find(x=>x.querySelector('b').textContent==='Sam Doe'), s=r.querySelector('select'); s.value='sammy'; s.dispatchEvent(new Event('change')); });
ok('Save waits until the matches are confirmed', await L.$eval('#modal [data-x=yes]',b=>b.disabled&&/^Confirm \d+ match/.test(b.textContent)));
await L.click('#modal [data-confirmall]'); await W();
const t0=Date.now(); await L.click('#modal [data-x=yes]');
ok('saved: "Imported 29 official results, 4 new runners" with Undo', await waitFor(L,()=>!document.querySelector('#snack').hidden&&document.querySelector('#snack').textContent.includes('Imported 29 official results, 4 new runners'),null,15000), await L.$eval('#snack',s=>s.textContent));
let st=await stats(L); ok('29 results stored as one import', st.live===29&&st.records===1, JSON.stringify(st));
ok('a snapshot was taken first', await L.evaluate(async()=>{ const d=await new Promise(r=>{ const q=indexedDB.open('mustang-splits'); q.onsuccess=()=>r(q.result); }); const L2=await new Promise(r=>{ const q=d.transaction('snapshots').objectStore('snapshots').getAll(); q.onsuccess=()=>r(q.result); }); return L2.some(x=>x.reason==='Before importing history'); }));
const roster=await L.evaluate(()=>MSApp.getRoster().map(a=>a.name));
ok('new runners saved with their full names (2.11.1): Nora Newfield, Ada/Bea/Cora Fillmore; Oliver (graduated) not added', ['Nora Newfield','Ada Fillmore','Bea Fillmore','Cora Fillmore'].every(n=>roster.includes(n))&&!roster.some(n=>/Oliver/.test(n)), roster.join(', '));
ok('short roster names get their full last name (Ben F. → Ben Fakerson)', roster.includes('Ben Fakerson')&&roster.includes('Izzy Quill'), roster.join(', '));
ok('remembered matches are stored as scrambled codes of names, never the names', await L.evaluate(()=>MSApp.backupData().then(d=>Object.keys(d.official[0].matches).every(k=>/^[0-9a-f]{24}$|^f[0-9a-f]+$/.test(k)))));
const ser=await L.evaluate(()=>MSApp.getSeries().map(s=>s.id+'='+s.name));
ok('series created with official names and fixed ids', ser.includes('s-kiel-invite=Kiel Raiders Invite')&&ser.includes('s-red-raider-invite=Red Raider Invite')&&ser.includes('s-wausau-east-invite=Smiley Invitational')&&ser.filter(s=>/kiel/i.test(s)&&!/middle/i.test(s)).length===1&&ser.includes('s-kiel-middle-school-invite=Kiel Middle School Invite'), ser.join(' | ')); // a middle school meet keeps its own series
const mts=await L.evaluate(()=>MSApp.getMeets().map(m=>m.id+'|'+m.courseId+'|'+m.levels.join('/')));
ok('past meets created per series and date, with this season’s course', mts.includes('mh-2025-09-04-kiel-invite|c-kiel-hs|V/JV')&&mts.some(m=>m.startsWith('mh-2024-10-17-nec-conference|c-uwgb')), mts.join(' '));

console.log('Meets view, runner cards, team view');
await L.click('.tab[data-tab=results]'); await W(600); await L.click('[data-rv=meets]'); await W(400);
ok('Official results show in Results (no team needed), grouped by season and meet', await L.evaluate(()=>{ const h=document.querySelector('#histTitle').textContent, s=[...document.querySelectorAll('#histList .hist-season')].map(x=>x.textContent); return h==='Official results'&&s[0].startsWith('2026 season')&&s.includes('2024 season')&&s.some(x=>x.startsWith('Middle school')); }));
ok('Kiel 2026: the hand-timed race and the official results are one race; the hand time shows as a note (2.11.1)', await L.evaluate(()=>{ const d=[...document.querySelectorAll('#histList details.div-race')].find(x=>x.textContent.includes('hand 20:41.0')); if(!d) return false; d.closest('details.hist-meet').open=true; d.open=true; return d.innerText.includes('20:40.5')&&d.innerText.includes('hand 20:41.0')&&/Official/.test(d.querySelector('summary').textContent); }));
await L.click('[data-rv=runners]'); await W(400);
await L.click('[data-runner="ben"]'); await W(500); await shot(L,'02-career-ben');
const card=await L.$eval('#rvRunners',e=>e.innerText);
ok('Ben: PR from the data 17:00.4 (the file’s PR flags ignored)', card.includes('17:00.4')&&/5K\s+17:00\.4/.test(card), card.slice(0,400));
ok('Ben: career sections (PR progression step line, season by season, year over year, season arc)', await L.evaluate(()=>{ const c=document.querySelector('.career'); return !!c&&!!c.querySelector('svg[aria-label="5K PR progression"] path.s1')&&c.innerText.includes('Season by season')&&c.innerText.includes('Same meet, year over year')&&c.innerText.includes('Season arc'); }));
ok('Ben: Kiel Raiders Invite three years running (2024 → 2026) with changes', /Kiel Raiders Invite\s*2024: 17:55\.0 · 2025: 17:29\.6 −25\.4 · 2026: 17:00\.4 −29\.2/.test(card.replace(/\n/g,' ')), (card.match(/Kiel Raiders Invite[^\n]*\n[^\n]*/)||[''])[0]);
ok('Ben: grades by season (10, 11, 12)', /2024\s*grade 10/.test(card)&&/2026\s*grade 12/.test(card));
ok('upright phone: no sideways page scroll on the card', await L.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
await L.click('[data-rvback]'); await W(); await L.click('[data-runner="izzy"]'); await W(500);
ok('Izzy: "Official vs hand-timed" 20:40.5 / 20:41.0', await L.evaluate(()=>{ const t=document.querySelector('.career').innerText; return t.includes('Official vs hand-timed')&&t.includes('20:40.5')&&t.includes('20:41.0'); }));
ok('Izzy: this season’s race shows Official with the hand-timed time', (await L.$eval('#rvRunners .rv-race',e=>e.innerText)).includes('(hand-timed 20:41.0)'));
const nora2=await L.evaluate(()=>MSApp.getRoster().find(a=>a.name==='Nora Newfield').id);
await L.click('[data-rvback]'); await W(); await L.click(`[data-runner="${nora2}"]`); await W(500); await shot(L,'03-career-ms');
ok('Nora: middle school in its own section (3200m best 12:32.0), not in high school PRs', await L.evaluate(()=>{ const c=document.querySelector('.career').innerText, top=document.querySelector('#rvRunners').innerText.split('Career')[0]; return c.includes('Middle school')&&c.includes('12:32.0')&&!top.includes('12:32.0'); }));
await L.click('[data-rv=team]'); await W(500);
await L.select('[data-tvseason]','2025'); await W(500); await shot(L,'04-team-2025');
const tv=await L.$eval('#rvTeam',e=>e.innerText);
ok('Team view 2025–26: Girls Varsity top-5 at Kiel from official results (21:19.5)', tv.includes('21:19.5')&&tv.includes('official'), tv.slice(0,500));
ok('Team view: season-by-season table', tv.includes('Season by season'));

console.log('Re-import, Undo, restore');
await upload(L,FIX);
ok('re-importing the same file adds nothing ("Nothing new", Save disabled, 29 already imported)', (await prevText(L)).includes('Nothing new and nothing to update')&&await L.$eval('#modal [data-x=yes]',x=>x.disabled)&&/29 already imported/.test(await prevText(L)));
const benRow=await rowOf(L,'Benjamin Fakerson'); ok('confirmed matches are remembered', benRow.st==='remembered', benRow.st);
await L.click('#modal [data-x=no]'); await W();
await L.click('#openSettings'); await W(); await L.click('#openImport'); await W();
await L.click('#modal [data-impundo]'); await W(600);
st=await stats(L); ok('Remove takes the whole import away as one action', st.live===0&&!(await L.evaluate(()=>MSApp.getRoster().some(a=>a.name==='Nora Newfield'))), JSON.stringify(st));
ok('…with Undo, and it waits in Recently deleted', (await L.$eval('#snack',s=>s.textContent)).includes('Removed 29 official results'));
await L.evaluate(()=>{ document.querySelector('#openSettings').click(); document.querySelector('#openDeleted').click(); }); await W(500);
ok('Recently deleted lists the import', (await L.$eval('#modal',m=>m.innerText)).includes('Imported history: 29 official results'));
await L.evaluate(()=>[...document.querySelectorAll('#modal [data-rs]')].find(b=>b.dataset.rs.startsWith('import:')).click()); await W(600);
st=await stats(L); ok('restore brings back all 29 results and the new runners', st.live===29&&await L.evaluate(()=>MSApp.getRoster().some(a=>a.name==='Nora Newfield')), JSON.stringify(st));
await L.evaluate(()=>{ document.querySelector('#overlay').hidden=true; });
await L.evaluate(id=>MSApp.purgeRunner(id),nora2); await W(800);
st=await stats(L); ok('Delete permanently also removes that runner’s official results', st.live===25, JSON.stringify(st));

console.log('Team: admin imports, coaches see it; only the admin can import');
const A=await phone('A',seed), B2=await phone('B',null);
const form=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [x,v] of vals) await p.$eval(x,(i,v)=>i.value=v,v); await p.click('[data-x=yes]'); await waitFor(p,()=>document.querySelector('#overlay').hidden||document.querySelector('[data-x=mine]'),null,20000); };
const merge=async p=>{ if(await waitFor(p,()=>document.querySelector('[data-x=mine]'),null,8000)){ await p.click('[data-x=mine]'); await W(1500); } };
await form(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1',AD]]); await merge(A); await W(1200);
await form(B2,'#tmJoin',[['#tmPw1',PW]]); await merge(B2); await W(1500);
ok('admin has Import history (3.0: Settings > Data)', await A.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('#openSettings').click(); const y=!!document.querySelector('#modal #openImport'); document.querySelector('#overlay').hidden=true; return y; }));
ok('a coach (not admin) does not', await B2.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('#openSettings').click(); const n=!document.querySelector('#modal #openImport'); document.querySelector('#overlay').hidden=true; return n; }));
await A.evaluate(()=>(document.querySelector('#openSettings').click(),document.querySelector('#openImport').click())); await W(); await upload(A,FIX); const caA=await A.$('#modal [data-confirmall]'); if(caA){ await caA.click(); await W(); } await A.click('#modal [data-x=yes]'); await W(1500);
ok('B receives the official results (29)', await waitFor(B2,()=>MSApp.officialStats().live===29,null,20000), JSON.stringify(await stats(B2)));
ok('B gets the new runners (full names)', await waitFor(B2,()=>MSApp.getRoster().some(a=>a.name==='Nora Newfield'),null,15000));
ok('B gets the full names too (2.11.1)', await B2.evaluate(()=>MSApp.getRoster().some(a=>a.name==='Ben Fakerson')));
await A.evaluate(()=>{ const s=document.querySelector('#snack'); if(!s.hidden) s.querySelector('button').click(); }); await W(1500);
ok('admin Undo removes it for B too', await waitFor(B2,()=>MSApp.officialStats().live===0,null,20000), JSON.stringify(await stats(B2)));

console.log('Performance: 600 results');
const big={format:'mustang-splits-history/v1',generated:'x',source:'perf',athletes:[]};
const meetsP=['Kiel Invite','Smiley Invite','Red Raider Invite','Waupaca Invite','NEC Conference','WIAA Sectional'];
for(let i=0;i<40;i++){ const res=[]; for(let y=2022;y<=2026;y++) for(let j=0;j<3;j++) res.push({season:String(y),grade:9+(y-2022)%4,level:'HS',distance:'5K',distance_m:5000,date:`${y}-09-${String(3+j*9).padStart(2,'0')}`,time_s:1100+i*5-(y-2022)*12+j*3,place:i+1,meet:meetsP[(j+y)%6],division:(i%2?'Boys':'Girls')+' Varsity'});
  big.athletes.push({name:`Perf${i} Runner${i}`,aliases:[],school:'X',results:res}); }
fs.writeFileSync(path.join(OUT,'perf-fixture.json'),JSON.stringify(big));
const P=await phone('P',{...seed,raceLog:[]});
await P.click('.tab[data-tab=results]'); await W();
let t1=Date.now(); await P.evaluate(()=>(document.querySelector('#openSettings').click(),document.querySelector('#openImport').click())); await W(); await upload(P,path.join(OUT,'perf-fixture.json')); const tPrev=Date.now()-t1;
t1=Date.now(); await P.click('#modal [data-x=yes]'); await waitFor(P,()=>MSApp.officialStats().live===600,null,20000); const tSave=Date.now()-t1;
ok('600 results: preview and save are quick', tPrev<6000&&tSave<6000, `preview ${tPrev} ms, save ${tSave} ms`);
const tm=await P.evaluate(async()=>{ const q=s=>document.querySelector(s), T=f=>{ const a=performance.now(); f(); return Math.round(performance.now()-a); };
  const r={}; r.meets=T(()=>q('[data-rv=meets]').click()); r.runners=T(()=>q('[data-rv=runners]').click()); r.card=T(()=>q('[data-runner]').click()); r.team=T(()=>q('[data-rv=team]').click()); return r; });
ok('600 results: Meets, Runners, a runner card and Team each render in under 1.5 s', Object.values(tm).every(v=>v<1500), JSON.stringify(tm));
const real=errs.filter(e=>!/Failed to fetch|NetworkError|net::|offline/i.test(e));
ok('no page errors', !real.length, real.join(' | '));
console.log(bad?`\n${bad} FAILED`:'\nall passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.log('CRASH',e); process.exit(1); });
