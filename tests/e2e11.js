// 2.7: meets, seasons, divisions, Girls/Boys, goals from history with fallback and tags. Needs the emulators (run.sh).
// The local phone's date is faked (localStorage 'fakeNow') so a race can be recorded "last season".
const puppeteer=require('puppeteer-core');
const URL='http://localhost:8765/?emu', PW='gravel otter lantern 44', AD='quiet falcon harbor 12';
const REST='http://127.0.0.1:8181/v1/projects/mustang-splits/databases/(default)/documents';
const owner=(path,opt={})=>fetch(REST+'/'+path,{headers:{'Authorization':'Bearer owner','Content-Type':'application/json'},...opt}).then(r=>r.json());
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:150},arg); return true; }catch(e){ return false; } };
async function phone(tag,{block}={}){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage();
  await p.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); }catch(e){}
    const f=localStorage.getItem('fakeNow'); if(f){ const off=Date.parse(f)-Date.now(), R=Date; class D extends R{ constructor(...a){ if(a.length) super(...a); else super(R.now()+off); } static now(){ return R.now()+off; } } D.parse=R.parse; D.UTC=R.UTC; window.Date=D; } });
  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(tag+': '+e.message));
  if(block){ await p.setRequestInterception(true); p.on('request',r=>r.url().includes('gstatic.com/firebasejs')?r.abort():r.continue()); }
  await p.goto(URL); await p.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); require('./lib.js').patchClick(p); p.tag=tag; return p; }
const reloadAt=async(p,when)=>{ await p.evaluate(w=>{ localStorage.setItem('fakeNow',w); },when); await p.reload(); await p.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); await W(500); };
const tab=async(p,t)=>{ await p.click(`.tab[data-tab=${t}]`); await W(); };
const paste=async(p,txt)=>{ await tab(p,'team'); await p.click('#pasteAth'); await W(); await p.$eval('#pasteTxt',(t,v)=>t.value=v,txt); await p.click('[data-x=yes]'); await W(300); };
const snackText=p=>p.$eval('#snack',s=>s.hidden?'':s.textContent);
const closeModal=async p=>{ if(!(await p.$eval('#overlay',o=>o.hidden))){ const x=await p.$('#modal [data-x=done],#modal [data-x=no]'); if(x) await x.click(); else await p.evaluate(()=>document.querySelector('#overlay').hidden=true); await W(); } };
const settings=async(p,btn)=>{ await closeModal(p); await p.click('#openSettings'); await W(); if(btn){ await p.click(btn); await W(400); } };
const race=p=>p.evaluate(()=>MSApp.getRace());
const rid=(p,n)=>p.evaluate(n=>(MSApp.getRoster().find(a=>a.name.startsWith(n))||{}).id,n);
const meets=p=>p.evaluate(()=>MSApp.getMeets());
const meetId=(p,series,date)=>p.evaluate((s,d)=>{ const se=MSApp.getSeries().find(x=>x.name===s); const m=MSApp.getMeets().find(x=>x.seriesId===(se&&se.id)&&(!d||x.date===d)); return m&&m.id; },series,date);
const newRaceScreen=async p=>{ await closeModal(p); await tab(p,'watches'); await p.click('#newBtn'); await W(); await p.click('[data-new=race]'); await W(); };
// finish times at the last checkpoint: [[name, seconds]]
const finish=(p,list)=>p.evaluate(list=>{ const r=MSApp.getRace(), ci=r.checkpoints.length-1; MSApp.applyRemote({marks:{upsert:list.map(([n,t])=>({id:'f'+n+Math.random().toString(36).slice(2,6),cp:r.checkpoints[ci].id,local:r.gun.local+t*1000,off:r.gun.off,runnerId:r.runners.find(x=>x.name.startsWith(n)).id,by:'o',byName:'Coach'})),remove:[]}}); },list);
const runAndSave=async(p,list)=>{ await p.click('#readyBtn').then(()=>new Promise(r=>setTimeout(r,150))).then(()=>p.click('[data-ra=gun]')); await W(500); await finish(p,list); await W(300); await p.click('[data-ra=end]'); await W(); await p.click('#modal [data-x=save]'); await W(900); if(await p.$('#modal .pr-offer')){ await p.click('#modal [data-x=no]'); await W(); } await p.click(await p.$('#raceClose:not([hidden])')?'#raceClose':'.tab[data-tab=watches]'); await W(); };
const goals=p=>p.evaluate(()=>Object.fromEntries(MSApp.getRace().runners.map(x=>[x.name.split(' ')[0],[x.goal,x.goalTag]])));

console.log('1. schedule, Girls/Boys, divisions, goals from history (one phone, date faked)');
const L=await phone('L',{block:true});
await reloadAt(L,'2026-10-02T12:00:00');
await paste(L,'Maya Lopez, JV, Girls\nAva Chen, JV, G\nZoe Park, JV, girls\nIvy Long, JV\nJonah Kim, JV, Boys\nSam Ortiz, JV, B');
ok('Paste a list reads Girls/Boys from a third column', (await L.evaluate(()=>MSApp.getRoster().map(a=>a.gender||'-').join('')))==='GGG-BB');
const ivy=await rid(L,'Ivy');
ok('Team tab: Ivy (no Girls/Boys) is in "No Girls/Boys yet"', await L.evaluate(id=>!!document.querySelector(`.team-sec[data-sec=""] .ath[data-id="${id}"]`),ivy));
await L.click(`.ath[data-id="${ivy}"] [data-t=sec][data-g=G]`); await W();
ok('Team tab: tapping Girls moves Ivy into the Girls section (2.10)', (await L.evaluate(id=>MSApp.getRoster().find(a=>a.id===id).gender,ivy))==='G' && await L.evaluate(id=>!!document.querySelector(`.team-sec[data-sec="G"] .ath[data-id="${id}"]`),ivy));
await settings(L,'#openMeets');
ok('Settings > Meets, empty, offers the 2026 schedule', !!(await L.$('#modal [data-mx=seed]')));
await L.click('#modal [data-mx=seed]'); await W();
let M=await meets(L);
ok('2026 schedule loaded: 11 meets', M.length===11 && M.every(m=>m.season===2026), M.length);
ok('one course per location: 10 courses, Winagamie GC shared by two meets', (await L.evaluate(()=>MSApp.getCourses().length))===10 && (await L.evaluate(()=>{ const c=MSApp.getCourses().find(x=>x.name==='Winagamie GC'); return MSApp.getMeets().filter(m=>m.courseId===c.id).length; }))===2);
const wantSeries=['Albany Baertschi Invite','Brillion Invite','Kiel Raiders Invite','Jim Bremser Memorial','NEC Championship','Waupaca Invitational','Smiley Invitational','WIAA Sectional','WIAA State','Appleton West Terror Invite','Nightfall Classic'].sort().join('|'); // official names since 2.9.0
ok('series names as approved', (await L.evaluate(()=>MSApp.getSeries().map(s=>s.name).sort().join('|')))===wantSeries);
ok('levels and times match the schedule (Brillion JV 4:00 PM, Albany V TBA)', await L.evaluate(()=>{ const s=n=>MSApp.getSeries().find(x=>x.name===n).id, m=n=>MSApp.getMeets().find(x=>x.seriesId===s(n)); return m('Brillion Invite').levels.join()==='JV'&&m('Brillion Invite').time==='4:00 PM'&&m('Albany Baertschi Invite').time===''&&m('NEC Championship').levels.join()==='JV,V'; }));
ok('the load button is gone once loaded', !(await L.$('#modal [data-mx=seed]')));
await closeModal(L);
// a race "last season" (10/9/2025) with no meet, to link later
await reloadAt(L,'2025-10-09T16:30:00');
await newRaceScreen(L);
ok('2025: no meet on the schedule for that day', !(await race(L)).meetId);
await L.type('[data-rname]','Brillion 2025'); for(const n of ['Maya','Ava','Zoe']){ await L.click(`[data-rr="${await rid(L,n)}"]`); await W(); }
await runAndSave(L,[['Maya',1260],['Ava',1300],['Zoe',1240]]);
// this season: Kiel (9/3/2026), Girls JV
await reloadAt(L,'2026-09-03T15:30:00');
await newRaceScreen(L);
ok('today’s meet is picked (Kiel Invite, 9/3)', (await race(L)).meetId===(await meetId(L,'Kiel Raiders Invite')));
ok('the meet loads its course and checkpoints', (await L.evaluate(()=>{ const r=MSApp.getRace(); return MSApp.getCourses().find(c=>c.id===r.courseId).name+':'+r.checkpoints.length; }))==='Kiel HS:3');
ok('divisions from the meet’s levels', (await L.$$eval('[data-div]',bs=>bs.map(b=>b.textContent).join()))==='Girls Varsity,Boys Varsity,Girls JV,Boys JV,Open');
await L.click('[data-div="GJV"]'); await W(400);
ok('first Girls JV race: the runners marked Girls are picked', (await race(L)).runners.map(x=>x.name.split(' ')[0]).sort().join()==='Ava,Ivy,Maya,Zoe', (await race(L)).runners.map(x=>x.name).join());
ok('race named after the meet and division', (await race(L)).name==='Kiel Raiders Invite, Girls JV');
ok('Compare to defaults to Season best', (await L.$eval('[data-goalsrc]',s=>s.value))==='sb');
const mayaId=await rid(L,'Maya');
await runAndSave(L,[['Maya',1230],['Ava',1280],['Zoe',1250],['Ivy',1330]]);
// Maya gets a PR at 5K that is faster than her season best; Jonah only has a PR
await tab(L,'team');
for(const [n,t] of [['Jonah','19000'],['Ivy','20500']]){ await L.click(`.ath[data-id="${await rid(L,n)}"] [data-t=res]`); await W(); await L.$eval('#modal [data-rf=unknown]',c=>{ c.checked=true; c.dispatchEvent(new Event('change')); }); await L.click('#modal [data-rf=t]'); await L.keyboard.type(t); await L.click('#modal [data-x=add]'); await W(); await closeModal(L); } // typed results (2.10)
// next meet: Brillion (10/8/2026), Girls JV: who ran Girls JV last time, goals with fallback and tags
await reloadAt(L,'2026-10-02T12:00:00');
await newRaceScreen(L);
ok('not a meet day: the next meet is picked (Brillion Invite, 10/8)', (await race(L)).meetId===(await meetId(L,'Brillion Invite')));
ok('JV-only meet: Girls JV, Boys JV, Open', (await L.$$eval('[data-div]',bs=>bs.map(b=>b.textContent).join()))==='Girls JV,Boys JV,Open');
await L.click('[data-div="GJV"]'); await W(400);
ok('preselects who ran Girls JV at the last meet', (await race(L)).runners.length===4 && (await L.$eval('#raceBody',x=>x.innerText)).includes('who ran Girls JV at the last meet'));
let g=await goals(L);
ok('Season best goals with SB tags (Maya 20:30, Zoe 20:50, Ava 21:20); Zoe’s faster 2025 time is last season', g.Maya[0]===1230&&g.Maya[1]==='SB'&&g.Zoe[0]===1250&&g.Zoe[1]==='SB'&&g.Ava[0]===1280, JSON.stringify(g));
ok('tags show in setup', (await L.$$eval('#ordList .gtag',xs=>xs.map(x=>x.textContent).join()))!=='' , await L.$$eval('#ordList .gtag',xs=>xs.map(x=>x.textContent).join()));
await L.click(`[data-rr="${await rid(L,'Jonah')}"]`); await W(400);
g=await goals(L);
ok('fallback: Jonah has no race, so his PR (19:00, tag PR)', g.Jonah[0]===1140 && g.Jonah[1]==='PR', JSON.stringify(g.Jonah));
await L.click(`[data-goal="${mayaId}"]`); await L.$eval(`[data-goal="${mayaId}"]`,i=>{ i.focus(); i.select(); }); await L.keyboard.type('2000'); await L.click('[data-rname]'); await W(300);
ok('typing a goal makes it Custom', JSON.stringify((await goals(L)).Maya)==='[1200,"Custom"]');
await L.select('[data-goalsrc]','pr'); await W(400); g=await goals(L);
ok('Compare to PR: the fastest result (2.10): Maya 20:30 from her race, Ivy 20:50 typed', g.Ivy[0]===1250&&g.Ivy[1]==='PR'&&g.Maya[0]===1230&&g.Maya[1]==='PR', JSON.stringify(g));
await L.select('[data-goalsrc]','none'); await W(300);
ok('None clears goals and tags', Object.values(await goals(L)).every(x=>x[0]===null&&x[1]===null));
const opts=await L.$$eval('[data-goalsrc] option',os=>os.map(o=>o.textContent).join('|'));
ok('dropdown order: Season best, PR, Last race, Course, Last year at this meet, Custom, None', opts==='Season best at this distance|PR at this distance|Last race at this distance|Last time on this course|Last year at this meet|Custom (type them)|None', opts);
// link the 2025 race to a 2025 Brillion meet, then compare to last year
await closeModal(L); await L.click('[data-ra=meets]'); await W();
await L.click('#modal [data-mx=add]'); await W();
await L.select('#modal [data-me=series]',await L.evaluate(()=>MSApp.getSeries().find(x=>x.name==='Brillion Invite').id));
await L.select('#modal [data-me=course]',await L.evaluate(()=>MSApp.getCourses().find(x=>x.name==='Brillion / Deer Run GC').id));
await L.$eval('#modal [data-me=date]',i=>i.value='2025-10-09'); await L.evaluate(()=>{ const v=document.querySelector('#modal [data-lv=V]'); if(v.getAttribute('aria-pressed')==='true') v.click(); });
await L.click('#modal [data-x=yes]'); await W();
ok('a 2025 meet can be added (its own season)', (await L.$eval('#modal',m=>m.innerText)).includes('2025 season'));
await L.click('#modal [data-mx=link]'); await W();
ok('Link past races suggests the meet by date', await L.evaluate(()=>{ const r=[...document.querySelectorAll('#modal .link-row')].find(x=>x.textContent.includes('Brillion 2025')); return r&&r.querySelector('[data-lm]').selectedOptions[0].textContent.startsWith('Brillion Invite'); }));
await L.evaluate(()=>{ const r=[...document.querySelectorAll('#modal .link-row')].find(x=>x.textContent.includes('Brillion 2025')); r.querySelector('[data-ld]').value='GJV'; r.querySelector('[data-lk=link]').click(); }); await W();
ok('linked (append-only edit on the saved race)', (await snackText(L)).includes('Linked to Brillion Invite') && await L.evaluate(()=>![...document.querySelectorAll('#modal .link-row')].some(x=>x.textContent.includes('Brillion 2025'))));
// rename the series: links follow the id
await L.click('#modal [data-x=no]'); await W();
await L.evaluate(()=>{ const b=[...document.querySelectorAll('#modal [data-meet-ed]')].find(x=>x.textContent.includes('Brillion Invite')&&x.textContent.includes('10/8')); b.click(); }); await W();
await L.$eval('#modal [data-me=rename]',i=>i.value='Brillion XC Invite'); await L.click('#modal [data-x=yes]'); await W(); await closeModal(L);
await L.select('[data-goalsrc]','meet'); await W(400); g=await goals(L);
ok('Last year at this meet (by series id, after a rename): 2025 times, tag Meet', g.Maya[0]===1260&&g.Maya[1]==='Meet'&&g.Ava[0]===1300&&g.Zoe[0]===1240, JSON.stringify(g));
ok('…runners with no race last year fall back (Ivy: season best 22:10)', g.Ivy[0]===1330&&g.Ivy[1]==='SB', JSON.stringify(g.Ivy));
await L.select('[data-goalsrc]','course'); await W(400); g=await goals(L);
ok('Last time on this course (Brillion GC, from the linked 2025 race): tag Course', g.Maya[0]===1260&&g.Maya[1]==='Course', JSON.stringify(g.Maya));
await L.select('[data-goalsrc]','sb'); await W(300);
await L.click('#readyBtn').then(()=>new Promise(r=>setTimeout(r,150))).then(()=>L.click('[data-ra=gun]')); await W(400); await finish(L,[['Maya',1220],['Zoe',1235]]); await W(300);
const card=await L.evaluate(()=>[...document.querySelectorAll('.race-cards .rcard')].map(c=>c.innerText.replace(/\s+/g,' ')).find(t=>t.includes('Maya')));
ok('results card shows the goal tag', card.includes('SB'), card);
await L.click('[data-ra=end]'); await W(); await L.click('#modal [data-x=discard]'); await W(); // keep history simple
// Meets: new season, soft delete and restore
await settings(L,'#openMeets');
await L.click('#modal [data-mx=season]'); await W(); await L.click('#modal [data-x=yes]'); await W(800);
M=await meets(L);
ok('Start a new season copies the 2026 meets to 2027 with blank dates', M.filter(m=>m.season===2027&&m.date==='').length===11);
const snaps=await L.evaluate(()=>new Promise(r=>{ const q=indexedDB.open('mustang-splits'); q.onsuccess=()=>{ const g=q.result.transaction('snapshots').objectStore('snapshots').getAll(); g.onsuccess=()=>r(g.result.map(x=>x.reason)); }; }));
ok('…after a snapshot', snaps.some(x=>x.startsWith('Before starting the 2027')));
await L.evaluate(()=>{ const b=[...document.querySelectorAll('#modal [data-meet-ed]')].find(x=>x.textContent.includes('Jim Bremser')); b.click(); }); await W();
await L.click('#modal [data-x=del]'); await W();
ok('deleting a meet: Undo, and it leaves the schedule', (await snackText(L)).startsWith('Deleted Jim Bremser') && (await meets(L)).length===M.length-1);
await closeModal(L); await settings(L,'#openDeleted');
ok('the meet is in Recently deleted and restores', await L.evaluate(()=>{ const r=[...document.querySelectorAll('#modal .del-row')].find(x=>x.textContent.startsWith('Meet: Jim Bremser')); if(!r) return false; r.querySelector('[data-rs]').click(); return true; }) && (await W(400), (await meets(L)).length===M.length));
await closeModal(L);
await L.close();

console.log('2. team: two coaches load the schedule at once; meets, Girls/Boys and race divisions sync');
const form=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [x,v] of vals) await p.$eval(x,(i,v)=>i.value=v,v); await p.click('[data-x=yes]'); await waitFor(p,()=>document.querySelector('#overlay').hidden||document.querySelector('[data-x=mine]'),null,20000); };
const merge=async p=>{ if(await waitFor(p,()=>document.querySelector('[data-x=mine]'),null,8000)){ await p.click('[data-x=mine]'); await W(1500); } };
const A=await phone('A'), B=await phone('B');
await paste(A,'Maya Lopez, JV, Girls\nJonah Kim, JV, Boys');
await form(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1',AD]]); await merge(A); await W(1500);
await form(B,'#tmJoin',[['#tmPw1',PW]]); await merge(B); await W(2500);
ok('B gets Girls/Boys from the team', await waitFor(B,()=>MSApp.getRoster().map(a=>a.gender).sort().join()==='B,G',null,10000));
await settings(A,'#openMeets'); await settings(B,'#openMeets');
await Promise.all([A.click('#modal [data-mx=seed]'),B.click('#modal [data-mx=seed]')]); await W(5000);
const T=JSON.parse(await A.evaluate(()=>localStorage.getItem('mustang-splits:sync'))).teamId;
const fm=await owner(`teams/${T}/meets`), fc=await owner(`teams/${T}/courses`), fs=await owner(`teams/${T}/series`);
ok('both phones loaded it at once: still one schedule in Firestore (11 meets, 10 courses, 11 series)', (fm.documents||[]).length===11 && (fc.documents||[]).length===10 && (fs.documents||[]).length===11, `${(fm.documents||[]).length}/${(fc.documents||[]).length}/${(fs.documents||[]).length}`);
ok('…and on both phones', (await A.evaluate(()=>MSApp.getMeets().length+'/'+MSApp.getCourses().length))==='11/10' && (await B.evaluate(()=>MSApp.getMeets().length+'/'+MSApp.getCourses().length))==='11/10');
await closeModal(A); await closeModal(B);
await newRaceScreen(A); if(await A.$('#coachName')){ await A.type('#coachName','Coach Ann'); await A.click('[data-x=yes]'); await W(); }
await A.select('[data-meet]',await meetId(A,'NEC Championship')); await W(); await A.click('[data-div="BV"]'); await W(600);
ok('first Boys Varsity race: the boys are picked', (await race(A)).runners.map(x=>x.name).join()==='Jonah Kim');
await A.click('#readyBtn').then(()=>new Promise(r=>setTimeout(r,150))).then(()=>A.click('[data-ra=gun]')); await W(2500);
const RID=JSON.parse(await A.evaluate(()=>localStorage.getItem('mustang-splits:sync'))).raceId, rd=await owner(`teams/${T}/races/${RID}`);
ok('race doc carries the meet and division', rd.fields && rd.fields.division.stringValue==='BV' && rd.fields.meetId.stringValue===(await meetId(A,'NEC Championship')));
await tab(B,'watches'); await waitFor(B,()=>!document.querySelector('#raceBanner').hidden,null,10000); await B.click('#raceBannerOpen'); await W(); if(await B.$('[data-x=open]')) await B.click('[data-x=open]');
ok('B opens it with the same meet and division', await waitFor(B,()=>MSApp.getRace()&&MSApp.getRace().division==='BV',null,10000));

console.log('\nerrors', errs); console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
