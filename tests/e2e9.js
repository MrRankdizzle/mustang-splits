// 2.5 Race Mode: split changes, distances, courses, goals from history, PRs, results cards, race log, cloud status.
const puppeteer=require('puppeteer-core');
const URL='http://localhost:8765/?emu', PW='gravel otter lantern 44';
const ROSTER='Maya Lopez, Varsity\nJonah Kim, Varsity\nSam Ortiz, JV';
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:100},arg); return true; }catch(e){ return false; } };
async function phone(tag,{block}={}){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage(); await p.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('mustang-splits:tour','1'); }catch(e){}
    try{ Object.defineProperty(navigator,'canShare',{value:undefined}); }catch(e){} HTMLAnchorElement.prototype.click=function(){ window.__dl=this.download; }; const oc=URL.createObjectURL; URL.createObjectURL=f=>{ window.__blob=f; return oc(f); };
    try{ Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{ window.__clip=t; }}}); }catch(e){} });
  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(tag+': '+e.message));
  if(block){ await p.setRequestInterception(true); p.on('request',r=>r.url().includes('gstatic.com/firebasejs')?r.abort():r.continue()); }
  await p.goto(URL); await p.waitForFunction(()=>window.MSApp&&document.querySelector('.watch')); require('./lib.js').patchClick(p); p.tag=tag; return p; }
const paste=async(p,txt)=>{ await p.click('.tab[data-tab=team]'); await W(); await p.click('#pasteAth'); await W(); await p.$eval('#pasteTxt',(t,v)=>t.value=v,txt); await p.click('[data-x=yes]'); await W(300); await p.click('.tab[data-tab=watches]'); await W(); };
const rid=(p,name)=>p.evaluate(n=>(MSApp.getRoster().find(a=>a.name.startsWith(n))||{}).id,name);
const noSideways=p=>p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth);
const race=p=>p.evaluate(()=>MSApp.getRace());
const EMPTY={athletes:{upsert:[],remove:[]},workouts:{upsert:[],remove:[]},courses:{upsert:[],remove:[]},prs:{upsert:[],remove:[]}};
// marks at exact race times: [name, checkpoint index, seconds]
const inject=(p,list)=>p.evaluate((list,E)=>{ const r=MSApp.getRace(); MSApp.applyRemote({...E,marks:{upsert:list.map(([n,ci,t])=>({id:'m'+n+ci+Math.random().toString(36).slice(2,6),cp:r.checkpoints[ci].id,local:r.gun.local+t*1000,off:r.gun.off,runnerId:r.runners.find(x=>x.name.startsWith(n)).id,by:'test',byName:'Coach T'})),remove:[]}}); },list,EMPTY);
const card=(p,name)=>p.$$eval('.race-cards .rcard',(cs,n)=>{ const c=cs.find(x=>x.querySelector('.rc-head b').textContent.startsWith(n)); return c?c.innerText.replace(/\s+/g,' '):''; },name);
const chgCls=(p,name,ci)=>p.$$eval('.race-cards .rcard',(cs,[n,ci])=>{ const c=cs.find(x=>x.querySelector('.rc-head b').textContent.startsWith(n)); const row=c&&c.querySelectorAll('.rc-row')[ci]; const s=row&&row.querySelector('.chg'); return s?s.className.replace('chg ','')+' '+s.textContent:''; },[name,ci]);
const retype=async(p,sel,text)=>{ await p.$eval(sel,i=>{ i.focus(); i.select(); }); if(text) await p.keyboard.type(text); else await p.keyboard.press('Backspace'); await W(); };
const startRace=async(p)=>{ await p.click('.tab[data-tab=watches]'); await W(); await p.click('#newBtn'); await W(); await p.click('[data-new=race]'); await W(); };

console.log('1. PRs on the Team tab');
const L=await phone('L',{block:true});
await paste(L,ROSTER);
await L.click('.tab[data-tab=team]'); await W();
ok('each runner has a PR button', (await L.$$('.ath [data-t=prs]')).length===3);
ok('Team tab: no sideways scroll', await noSideways(L));
const maya=await rid(L,'Maya'), jonah=await rid(L,'Jonah');
await L.click(`.ath[data-id="${maya}"] [data-t=prs]`); await W();
ok('PR sheet lists 5K, 2 mi, 4K, 3200m', (await L.$$eval('.pr-row .pl',x=>x.map(e=>e.textContent).join()))==='5K,2 mi,4K,3200m');
await L.click('[data-prt="5000"]'); await L.keyboard.type('1901'); await W();
ok('5K PR typed with the m:ss keypad (19:01)', (await L.evaluate(id=>JSON.stringify((JSON.parse(localStorage.getItem('mustang-splits:v1')).prs||{})[id]),maya)).includes('"t":1141'));
await L.click('[data-prnd]'); await L.keyboard.type('1.5'); await L.click('[data-pradd]'); await W();
ok('custom distance row added (1.5 mi)', (await L.$$eval('.pr-row .pl',x=>x.map(e=>e.textContent)))[4]==='1.5 mi');
await L.keyboard.type('812'); await W();
ok('custom PR saved', await L.evaluate(id=>MSApp.getPrs().find(x=>x.id===id).list.length===2,maya));
ok('PR sheet: no sideways scroll', await noSideways(L));
await L.click('[data-x=done]'); await W();
ok('PR button shows the count', (await L.$eval(`.ath[data-id="${maya}"] [data-t=prs]`,b=>b.textContent))==='PR2');

console.log('2. setup: distances, quick buttons, course, compare to');
await startRace(L);
ok('default checkpoints show their distances (1 mi, 2 mi, 5000 m)', (await L.$$eval('.cp-ed [data-cpd]',xs=>xs.map(x=>x.value+(x.closest('.df').dataset.unit)).join()))==='1mi,2mi,5000m');
await L.click('[data-cpadd]'); await W();
const cpd=i=>L.$$eval('.cp-ed [data-cpd]',(xs,i)=>xs[i].value,i);
await L.click('.race-cp:nth-child(4) [data-qd="4"]'); await W();
ok('quick 4K sets distance and name', (await race(L)).checkpoints[3].dist===4000 && (await race(L)).checkpoints[3].name==='4K');
ok('out-of-order distance warns', (await L.$eval('[data-cpwarn]',x=>x.textContent)).includes('check 4K'));
await L.click('.race-cp:nth-child(4) [data-cpmv="-1"]'); await W();
ok('↑ moves it before Finish; warning gone', (await race(L)).checkpoints.map(c=>c.name).join()==='Mile 1,Mile 2,4K,Finish' && (await L.$eval('[data-cpwarn]',x=>x.textContent))==='');
await L.click('.race-cp:nth-child(3) [data-du="mi"]'); await W();
ok('4K switched to miles shows 2.485', (await cpd(2))==='2.485', await cpd(2));
await retype(L,'.race-cp:nth-child(3) [data-cpd]','2.1');
ok('free entry in miles (2.1 mi)', Math.abs((await race(L)).checkpoints[2].dist-2.1*1609.34)<0.5);
await L.click('.race-cp:nth-child(3) [data-du="m"]'); await W();
ok('switching to meters converts (3380)', (await cpd(2))==='3380');
await retype(L,'.race-cp:nth-child(3) [data-cpd]','1200');
ok('free entry in meters (1200m), unit kept', (await race(L)).checkpoints[2].dist===1200 && (await race(L)).checkpoints[2].unit==='m');
ok('…and it warns (1200m after 2 mi)', (await L.$eval('[data-cpwarn]',x=>x.textContent)).length>0);
await L.click('.race-cp:nth-child(3) [data-cprm]'); await W();
ok('removed again', (await race(L)).checkpoints.length===3);
ok('setup: no sideways scroll', await noSideways(L));
await L.$eval('[data-ra=savecourse]',b=>b.scrollIntoView({block:'center'})); await L.click('[data-ra=savecourse]'); await W(); await L.$eval('#courseName',i=>i.value=''); await L.type('#courseName','Heritage Park'); await L.click('#modal [data-x=yes]'); await W();
ok('Save as course', (await L.evaluate(()=>MSApp.getCourses().map(c=>c.name+':'+c.checkpoints.length).join()))==='Heritage Park:3' && !!(await race(L)).courseId);
await L.click(`[data-rr="${maya}"]`); await W(); await L.click(`[data-rr="${jonah}"]`); await W(); await L.click(`[data-rr="${await rid(L,'Sam')}"]`); await W();
await L.select('[data-goalsrc]','pr'); await W(400);
ok('Compare to PR: Maya gets 19:01, others none', (await race(L)).runners.find(x=>x.id===maya).goal===1141 && !(await race(L)).runners.find(x=>x.id===jonah).goal);
ok('note says how many were filled', (await L.$eval('#goalNote',x=>x.textContent)).startsWith('Filled 1 of 3 runners from their PR at 5K'), await L.$eval('#goalNote',x=>x.textContent));
await L.click('#readyBtn').then(()=>new Promise(r=>setTimeout(r,150))).then(()=>L.click('[data-ra=gun]')); await W(600);
ok('name buttons show only the name', (await L.$$eval('#raceGrid [data-rn]',bs=>bs.map(b=>b.innerText.trim()).join()))==='Maya Lopez,Jonah Kim,Sam Ortiz');
ok('PR stamped at the gun', (await race(L)).runners.find(x=>x.id===maya).pr===1141);

console.log('3. split changes, New PR!, cards, Copy, CSV');
await inject(L,[['Maya',0,360],['Maya',1,732],['Maya',2,1120],['Jonah',0,370],['Jonah',1,742],['Jonah',2,1170],['Sam',0,400],['Sam',2,1300]]);
await W(300);
let mc=await card(L,'Maya');
ok('card: Mile 2 split 6:12, 6:12/mi, +12s/mi (slower, orange)', mc.includes('6:12 · 6:12/mi') && (await chgCls(L,'Maya',1))==='slower +12s/mi', await chgCls(L,'Maya',1));
ok('finish: uneven 1.107 mi judged by pace: −21s/mi (faster, green)', (await chgCls(L,'Maya',2))==='faster −21s/mi', await chgCls(L,'Maya',2));
ok('within 1% of the previous pace is gray (Jonah +2s/mi)', (await chgCls(L,'Jonah',1))==='even +2s/mi', await chgCls(L,'Jonah',1));
ok('missed checkpoint: split spans both segments (Sam finish 15:00, pace over 2.107 mi)', (await card(L,'Sam')).includes('15:00 · 7:07/mi'), await card(L,'Sam'));
ok('first checkpoint has no change', !(await chgCls(L,'Maya',0)));
ok('Maya: New PR! (18:40 vs 19:01)', mc.includes('New PR!') && await L.$eval('.race-cards .rcard',c=>c.classList.contains('hl')));
ok('card shows place and goal compare', mc.includes('1st') && mc.includes('vs PR'));
ok('phone portrait: cards shown, wide table hidden', await L.$eval('.race-cards',x=>getComputedStyle(x).display!=='none') && await L.$eval('.race-wide',x=>getComputedStyle(x).display==='none'));
await L.setViewport({width:844,height:390,isMobile:true,hasTouch:true}); await W(300);
ok('landscape: the wide table instead', await L.$eval('.race-cards',x=>getComputedStyle(x).display==='none') && await L.$eval('.race-wide',x=>getComputedStyle(x).display!=='none'));
ok('table has the split change and New PR!', (await L.$eval('.race-table',t=>t.innerText)).includes('+12s/mi') && (await L.$eval('.race-table',t=>t.innerText)).includes('New PR!'));
await L.setViewport({width:390,height:844,isMobile:true,hasTouch:true}); await W(300);
ok('running screen: no sideways scroll', await noSideways(L));
await L.click('[data-ra=copy]'); await W();
const clip=await L.evaluate(()=>window.__clip||'');
ok('Copy results: splits, pace, changes, New PR!', clip.includes('split 6:12 6:12/mi +12s/mi') && clip.includes('−21s/mi') && clip.includes('New PR!') && clip.includes('(Heritage Park)'), clip.split('\n').slice(0,5).join(' / '));
await L.click('[data-ra=csv]'); await W(300);
const csv=await L.evaluate(async()=>await window.__blob.text()), head=csv.split('\n')[0], mrow=csv.split('\n').find(l=>l.startsWith('"Maya'));
ok('CSV keeps the old columns first, adds split columns and New PR at the end', head.startsWith('"Runner","Group","Goal","Mile 1","Mile 1 place","Mile 1 pace/mi","Mile 1 vs goal (s)"') && head.includes('"Finish change basis"') && head.endsWith('"New PR","Season best"'));
ok('CSV row: Mile 2 change 12.0 by pace per mile; New PR yes', mrow.includes('"12.0","pace per mile"') && mrow.endsWith('"yes",""'), mrow.slice(-80));
// edit checkpoints during the race: Mile 2 loses its distance -> raw split comparison
await L.click('[data-ra=editcp]'); await W();
ok('Edit checkpoints sheet opens during the race', !!(await L.$('#modal .cp-ed')));
await L.$eval('#modal .race-cp:nth-child(1) [data-cpn]',i=>{ i.value='Bridge'; i.dispatchEvent(new Event('input',{bubbles:true})); });
await retype(L,'#modal .race-cp:nth-child(2) [data-cpd]','');
await L.click('#modal [data-x=done]'); await W(500);
ok('rename shows in the I\'m at bar', (await L.$$eval('[data-at]',bs=>bs.map(b=>b.textContent).join()))==='Bridge,Mile 2,Finish');
ok('no distance → raw split change, and it says so (Mile 2 "+12s split")', (await chgCls(L,'Maya',1))==='slower +12s split', await chgCls(L,'Maya',1));
ok('pace recalculated for the finish (now over 3.107 mi from Bridge... no: from Mile 2 without distance → raw)', (await chgCls(L,'Maya',2)).endsWith('s split'), await chgCls(L,'Maya',2));
await L.click('[data-ra=editcp]'); await W(); await L.click('#modal .race-cp:nth-child(2) [data-qd="1"]'); await W(); await L.click('#modal [data-x=done]'); await W(400);
ok('distance back (quick Mile 2): pace comparison again', (await chgCls(L,'Maya',1))==='slower +12s/mi');
// end: save, PR offer
await L.click('[data-ra=end]'); await W(); await L.click('#modal [data-x=save]'); await W(900);
ok('after Save: Update PRs offered, Maya checked, Jonah (no PR yet) not', !!(await L.$('#modal .pr-offer')) && await L.$eval(`[data-prup="${maya}"]`,c=>c.checked) && !(await L.$eval(`[data-prup="${jonah}"]`,c=>c.checked)));
await L.click('#modal [data-x=yes]'); await W();
ok('Maya\'s 5K PR is now 18:40', (await L.evaluate(id=>MSApp.getPrs().find(x=>x.id===id).list.find(p=>p.dist===5000).t,maya))===1120);
ok('saved race is in this phone\'s race log', (await L.evaluate(()=>JSON.parse(localStorage.getItem('mustang-splits:v1')).raceLog.length))===1);

console.log('4. goals from history: last race, season best, last time on this course');
await L.click('[data-ra=new]'); await W();
for(const n of ['Maya','Jonah','Sam']){ await L.click(`[data-rr="${await rid(L,n)}"]`); await W(); }
await L.select('[data-goalsrc]','last'); await W(400);
ok('Last race at this distance: Maya 18:40, Jonah 19:30', (await race(L)).runners.find(x=>x.id===maya).goal===1120 && (await race(L)).runners.find(x=>x.id===jonah).goal===1170);
ok('name buttons sorted by those goals', (await race(L)).runners.map(x=>x.name).join()==='Maya Lopez,Jonah Kim,Sam Ortiz');
await L.select('[data-goalsrc]','none'); await W(300);
ok('None clears goals', (await race(L)).runners.every(x=>!x.goal));
ok('Last time on this course is off without a course', await L.$eval('[data-goalsrc] option[value=course]',o=>o.disabled));
await L.select('[data-course]',(await L.evaluate(()=>MSApp.getCourses()[0].id))); await W(300);
await L.select('[data-goalsrc]','course'); await W(400);
ok('picking the course copies its checkpoints; Last time on this course fills goals', (await race(L)).checkpoints.length===3 && (await race(L)).runners.find(x=>x.id===jonah).goal===1170);
await L.select('[data-goalsrc]','sb'); await W(400);
ok('Season best at this distance', (await race(L)).runners.find(x=>x.id===maya).goal===1120 && (await race(L)).runners.find(x=>x.id===jonah).goal===1170);
const mg=await rid(L,'Sam'); ok('Sam\'s season best (21:40) filled in too', (await race(L)).runners.find(x=>x.id===mg).goal===1300);
await retype(L,`[data-goal="${mg}"]`,'2030'); await L.click('[data-rname]'); await W(300);
ok('any goal can still be typed', (await race(L)).runners.find(x=>x.id===mg).goal===1230);
await L.click('#readyBtn').then(()=>new Promise(r=>setTimeout(r,150))).then(()=>L.click('[data-ra=gun]')); await W(500);
await inject(L,[['Maya',2,1110],['Jonah',2,1160]]); await W(300);
ok('Jonah: Season best! (19:20 vs 19:30, no PR on file)', (await card(L,'Jonah')).includes('Season best!') && !(await card(L,'Jonah')).includes('New PR!'));
ok('Maya: New PR! and Season best! together (18:30 beats both 18:40s)', (await card(L,'Maya')).includes('New PR!') && (await card(L,'Maya')).includes('Season best!'));
await L.click('[data-ra=end]'); await W(); await L.click('#modal [data-x=save]'); await W(900);
if(await L.$('#modal .pr-offer')){ await L.click('#modal [data-x=no]'); await W(); }
await L.click(await L.$('#raceClose:not([hidden])')?'#raceClose':'.tab[data-tab=watches]'); await W(); await L.click('.tab[data-tab=results]'); await W();
ok('Results: "Races on this phone" lists both', (await L.$$('#raceLogList details')).length===2);
await L.close();

console.log('5. team: PRs and courses sync, upload races saved before joining, save status, goals from Team history');
const form=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [x,v] of vals) await p.$eval(x,(i,v)=>i.value=v,v); await p.click('[data-x=yes]'); await waitFor(p,()=>document.querySelector('#overlay').hidden||document.querySelector('[data-x=mine]'),null,20000); };
const merge=async p=>{ if(await waitFor(p,()=>document.querySelector('[data-x=mine]'),null,8000)){ await p.click('[data-x=mine]'); await W(1500); } };
const coachName=async(p,n)=>{ if(await waitFor(p,()=>document.querySelector('#coachName'),null,2500)){ await p.type('#coachName',n); await p.click('[data-x=yes]'); await W(); } };
const A=await phone('A'), B=await phone('B');
await paste(A,ROSTER);
const aMaya=await rid(A,'Maya');
await A.click('.tab[data-tab=team]'); await W(); await A.click(`.ath[data-id="${aMaya}"] [data-t=prs]`); await W(); await A.click('[data-prt="5000"]'); await A.keyboard.type('1850'); await W(); await A.click('[data-x=done]'); await W();
await A.click('.tab[data-tab=watches]'); await W();
// a local race on A before joining
await startRace(A); for(const n of ['Maya','Jonah']){ await A.click(`[data-rr="${await rid(A,n)}"]`); await W(); }
await A.type('[data-rname]','Summer TT'); await A.click('[data-ra=savecourse]'); await W(); await A.$eval('#courseName',i=>i.value='Bay Park'); await A.click('#modal [data-x=yes]'); await W();
await A.click('#readyBtn').then(()=>new Promise(r=>setTimeout(r,150))).then(()=>A.click('[data-ra=gun]')); await W(500); await inject(A,[['Maya',2,1100],['Jonah',2,1180]]); await W(200);
await A.click('[data-ra=end]'); await W(); await A.click('#modal [data-x=save]'); await W(900); if(await A.$('#modal .pr-offer')){ await A.click('#modal [data-x=no]'); await W(); }
await A.click(await A.$('#raceClose:not([hidden])')?'#raceClose':'.tab[data-tab=watches]'); await W();
await form(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1','quiet falcon harbor 12']]); await merge(A);
ok('after joining: offered to upload 1 race saved on this phone', await waitFor(A,()=>document.querySelector('#modal .up-sheet')&&document.querySelector('#modal h2').textContent==='Upload 1 race?',null,5000));
await A.click('#modal [data-x=yes]'); await W(2500);
await form(B,'#tmJoin',[['#tmPw1',PW]]); await merge(B); await W(3000);
await B.click('.tab[data-tab=results]'); await W();
ok('B sees the uploaded race in Team history', await waitFor(B,()=>[...document.querySelectorAll('#histList summary')].some(s=>s.textContent.includes('Summer TT'))));
ok('B got A\'s PRs (5K 18:50 for Maya)', await waitFor(B,()=>{ const m=MSApp.getRoster().find(a=>a.name.startsWith('Maya')); const p=m&&MSApp.getPrs().find(x=>x.id===m.id); return p&&p.list.some(x=>x.dist===5000&&x.t===1130); }));
ok('B got A\'s course', await waitFor(B,()=>MSApp.getCourses().some(c=>c.name==='Bay Park')));
await B.click('.tab[data-tab=watches]'); await W(); await startRace(B); await coachName(B,'Coach Ben');
for(const n of ['Maya','Jonah']){ await B.click(`[data-rr="${await rid(B,'Maya'===n?'Maya':'Jonah')}"]`); await W(); }
await B.select('[data-goalsrc]','last'); await W(1500);
ok('B: Last race at this distance comes from Team history (Maya 18:20, Jonah 19:40)', (await race(B)).runners.find(x=>x.name.startsWith('Maya')).goal===1100 && (await race(B)).runners.find(x=>x.name.startsWith('Jonah')).goal===1180, JSON.stringify((await race(B)).runners.map(x=>x.goal)));
await B.select('[data-goalsrc]','pr'); await W(400);
ok('B: PR at this distance uses the synced PR', (await race(B)).runners.find(x=>x.name.startsWith('Maya')).goal===1130);
await B.click('#readyBtn').then(()=>new Promise(r=>setTimeout(r,150))).then(()=>B.click('[data-ra=gun]')); await W(1500);
const st=p=>p.$eval('#raceStatus',x=>x.textContent);
ok('status: "Saved to team ✓"', await waitFor(B,()=>document.querySelector('#raceStatus').textContent.includes('Saved to team ✓'),null,10000), await st(B));
await B.setOfflineMode(true); await W(300);
const bid=await rid(B,'Jonah'); const c=await B.$eval(`#raceGrid [data-rn="${bid}"]`,x=>{ const r=x.getBoundingClientRect(); return [r.left+20,r.top+20]; }); await B.touchscreen.tap(c[0],c[1]);
ok('offline tap: "Offline, saving when connected"', await waitFor(B,()=>document.querySelector('#raceStatus').textContent.includes('Offline, saving when connected'),null,8000), await st(B));
await B.setOfflineMode(false);
ok('back online: "Saved to team ✓" again', await waitFor(B,()=>document.querySelector('#raceStatus').textContent.includes('Saved to team ✓'),null,20000), await st(B));
await B.click('[data-ra=editcp]'); await W(); await B.$eval('#modal .race-cp:nth-child(1) [data-cpn]',i=>{ i.value='Bridge'; i.dispatchEvent(new Event('input',{bubbles:true})); }); await B.click('#modal [data-x=done]'); await W(1500);
await waitFor(A,()=>!document.querySelector('#raceBanner').hidden,null,10000); await A.click('#raceBannerOpen'); await W(); if(await A.$('[data-x=open]')) await A.click('[data-x=open]'); await coachName(A,'Coach Ann');
ok('A opens B\'s race and sees the renamed checkpoint', await waitFor(A,()=>MSApp.getRace()&&MSApp.getRace().checkpoints[0].name==='Bridge',null,10000) && await waitFor(A,()=>[...document.querySelectorAll('[data-at]')].some(b=>b.textContent==='Bridge'),null,5000));
const sc=JSON.parse(await B.evaluate(()=>localStorage.getItem('mustang-splits:sync')));
const REST='http://127.0.0.1:8181/v1/projects/mustang-splits/databases/(default)/documents';
const rd=await fetch(`${REST}/teams/${sc.teamId}/races/${sc.raceId}`,{headers:{Authorization:'Bearer owner'}}).then(r=>r.json());
ok('race doc in Firestore carries the goal source and PR stamps', rd.fields.goalSrc.stringValue==='pr' && JSON.stringify(rd.fields.runners).includes('"pr"'));

console.log('\nerrors', errs); console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
