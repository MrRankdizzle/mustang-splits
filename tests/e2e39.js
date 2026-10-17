// 3.11 race-day fixes, on three coach phones (Firestore emulator, fake names):
// 1. one race per team that every phone follows by itself: a coach who taps Race to set up the boys joins the race
//    already set up (3.10 offered "End it and start a new race", which ended it: the bug), setup edits, both Guns and
//    taps reach every phone within 2 s, leftovers from days ago are never followed;
// 2. the Gun is recorded on the touch itself, within one frame, while remote updates arrive and the phone is busy;
//    the click that follows the lift never lands on a name button;
// 3. PR / season-best pace marks on the name buttons and in the results (symbol + word, fixed space, contrast);
// 4. the share line ("Shared with the team ✓", "Not shared yet: no connection", "Not shared: the team refused this race");
// 5. no reload during setup or a live race (auto-update waits); every error is caught into the Sync log, which
//    shows the membership check, the team's races and every change with the team's answer, and exports.
const puppeteer=require('puppeteer-core'), H=require('./tools/phones.js');
const REST='http://127.0.0.1:8181/v1/projects/mustang-splits/databases/(default)/documents';
const owner=(path,opt={})=>fetch(REST+'/'+path,{headers:{'Authorization':'Bearer owner','Content-Type':'application/json'},...opt}).then(r=>r.json());
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',protocolTimeout:90000});
const {W,waitFor}=H; const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const seed=S=>{ S.roster=[['g1','Ada Quill','G'],['g2','Bea Rowan','G'],['g3','Cora Vance','G'],['b1','Abe Stone','B'],['b2','Ben Hale','B'],['b3','Cal Moss','B']].map(([id,name,gender])=>({id,name,group:'',gender}));
  S.prs={g1:[{id:'p1',dist:5000,t:1200,date:'2026-09-20',meet:'Time trial',src:'hand'}],
    g2:[{id:'p2',dist:5000,t:1200,date:'2025-10-01',meet:'Last year',src:'hand'},{id:'p3',dist:5000,t:1260,date:'2026-09-25',meet:'This year',src:'hand'}],
    b1:[{id:'p4',dist:5000,t:1000,date:'2026-09-20',meet:'Time trial',src:'hand'}]}; };
const [A,B,C]=await H.team(b,['Coach Ann','Coach Ben','Coach Cal'],errs,seed);
const P=[A,B,C];
const race=p=>p.evaluate(()=>{ const r=MSApp.getRace(); return r&&{id:r.id,status:r.status,name:r.name,n:r.runners.length,starts:r.runners.map(x=>x.start||'').join(''),gun:!!r.gun,guns:Object.keys(r.gun&&r.gun.starts||{}).join(''),marks:r.marks.length}; });
const onAll=async(L,fn,arg,ms=2000)=>{ const t=Date.now(), miss=[]; for(const p of L) if(!(await waitFor(p,fn,arg,Math.max(50,ms-(Date.now()-t))))) miss.push(p.tag); return {miss,ms:Date.now()-t}; };
const newRaceUI=async p=>{ await p.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=watches]').click(); }); await W(200);
  await p.evaluate(()=>{ const e=document.querySelector('[data-new=race]'); if(e) e.click(); else { document.querySelector('#newBtn').click(); document.querySelector('#modal [data-new=race]').click(); } }); await W(600); };
const sc=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('mustang-splits:sync')));
const T=(await sc(A)).teamId;

console.log('1. a leftover race from days ago is never followed');
await owner(`teams/${T}/races/oldleft`,{method:'PATCH',body:JSON.stringify({fields:{name:{stringValue:'Old practice race'},status:{stringValue:'setup'},gun:{nullValue:null},checkpoints:{arrayValue:{}},runners:{arrayValue:{}},goalSrc:{stringValue:'sb'},updatedAt:{timestampValue:new Date(Date.now()-3*864e5).toISOString()},updatedBy:{stringValue:'old'}}})});
await W(2500);
ok('no phone opened the leftover, no banner for it', (await Promise.all(P.map(race))).every(r=>!r) && await A.evaluate(()=>document.querySelector('#raceBanner').hidden));

console.log('2. A sets up the girls; B and C follow it by themselves within 2 s');
await newRaceUI(A); await A.click('[data-pk=G]'); const tA=Date.now(); await W(100);
const RID=(await race(A)).id;
const f1=await onAll([B,C],id=>MSApp.getRace()&&MSApp.getRace().id===id&&MSApp.getRace().runners.length===3,RID,2000);
ok('B and C have A’s race (3 girls) within 2 s, without tapping anything', !f1.miss.length, f1.miss.length?'missing on '+f1.miss.join():((Date.now()-tA)/1000).toFixed(1)+' s');
ok('A shows "Shared with the team ✓"', await waitFor(A,()=>/Shared with the team ✓/.test((document.querySelector('#raceShare')||{}).textContent||''),null,6000), await A.evaluate(()=>(document.querySelector('#raceShare')||{}).textContent+' '+JSON.stringify(MSApp.shareDebug())+'\n'+MSApp.syncLogText().split('\n').slice(0,40).join('\n')));
console.log('3. B taps Race to set up the boys: B joins A’s race (no "End it")');
await newRaceUI(B);
ok('no "A race is already running / End it" choice', await B.evaluate(()=>document.querySelector('#overlay').hidden&&!document.querySelector('[data-x=end]')));
ok('B is on the race screen of A’s race', (await race(B)).id===RID && await B.evaluate(()=>!document.querySelector('#v-race').hidden));
await B.click('[data-pk=B]'); const tB=Date.now(); await W(100);
ok('B’s "All boys" adds the boys and keeps A’s girls', (await race(B)).n===6);
const f2=await onAll([A,C],()=>{ const r=MSApp.getRace(); return r&&r.runners.length===6&&r.runners.filter(x=>x.start==='B').length===3; },null,2000);
ok('the boys reach A and C within 2 s, as a separate start', !f2.miss.length, f2.miss.length?'missing on '+f2.miss.join():((Date.now()-tB)/1000).toFixed(1)+' s');
ok('A’s race was never ended (still setup everywhere)', (await Promise.all(P.map(race))).every(r=>r&&r.id===RID&&r.status==='setup'));
const act=await owner(`teams/${T}/races`); const live=(act.documents||[]).filter(d=>['setup','running'].includes(d.fields.status.stringValue)&&!d.name.endsWith('/oldleft'));
ok('Firestore: exactly one race set up (plus the old leftover)', live.length===1, live.map(d=>d.fields.name.stringValue).join());
console.log('4. setup edits from any phone reach the others within 2 s');
await newRaceUI(C); await C.click('[data-rname]'); await C.evaluate(()=>{ const i=document.querySelector('[data-rname]'); i.value=''; }); await C.type('[data-rname]','Sectional mock'); const tC=Date.now();
const f3=await onAll([A,B],()=>MSApp.getRace().name==='Sectional mock',null,2500);
ok('C’s race name on A and B within 2 s of the last key', !f3.miss.length, f3.miss.length?'missing on '+f3.miss.join():((Date.now()-tC)/1000).toFixed(1)+' s');
ok('C’s setup says who else has it open', await waitFor(C,()=>/Coach (Ann|Ben)/.test((document.querySelector('#raceShare')||{}).textContent||''),null,6000), await C.evaluate(()=>(document.querySelector('#raceShare')||{}).textContent));

console.log('5. the Gun: on the touch, within one frame, while remote updates arrive and the phone is busy');
await A.evaluate(()=>{ document.querySelector('.tab[data-tab=watches]').click(); }); await W(200); await A.evaluate(()=>document.querySelector('#raceBannerOpen').click()); await W(300);
await A.click('#readyBtn'); await W(400);
ok('A’s Ready screen has Gun · Girls and Gun · Boys', (await A.$$eval('[data-ra=gun]',x=>x.map(e=>e.dataset.start).join()))==='G,B');
let pumping=true, k=0; const pump=(async()=>{ while(pumping){ k++; await owner(`teams/${T}/races/${RID}?updateMask.fieldPaths=goalSrc${k%3===0?'&updateMask.fieldPaths=name':''}`,{method:'PATCH',body:JSON.stringify({fields:{goalSrc:{stringValue:k%2?'pr':'sb'},name:{stringValue:'Sectional mock '+k}}})}); await W(120); } })();
await W(900);
const cdp=await A.target().createCDPSession();
const gpos=await A.$eval('[data-ra=gun][data-start=G]',e=>{ const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; });
await A.evaluate(()=>{ setTimeout(()=>{ const t=performance.now(); while(performance.now()-t<180){} },0); }); // the phone is busy for 180 ms when the finger lands
const t0=Date.now(); await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:gpos.x,y:gpos.y}]}); const t1=Date.now();
await W(60); await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await W(700);
const g=await A.evaluate(()=>{ const r=MSApp.getRace(); return {starts:r.gun&&r.gun.starts,status:r.status,marks:r.marks.length}; });
const dG=g.starts&&g.starts.G?g.starts.G.local-t0:null;
ok('the girls’ gun time is the touch, within one frame (≤ 17 ms), although the phone was busy 180 ms', dG!=null&&dG>=-2&&dG<=17, dG!=null?`${dG} ms after the touch was sent (dispatch returned after ${t1-t0} ms)`:'no gun');
ok('…the race is running and the lift that followed recorded no time on a name button', g.status==='running'&&g.marks===0, `${g.status}, ${g.marks} marks`);
ok('…the boys’ Gun waits at the top of the race screen', await A.evaluate(()=>!!document.querySelector('.race-guns [data-ra=gun][data-start=B]')));
pumping=false; await pump;
const f4=await onAll([B,C],()=>{ const r=MSApp.getRace(); return r&&r.gun&&r.gun.starts&&!!r.gun.starts.G; },null,2500);
ok('the girls’ gun is on B and C within 2 s', !f4.miss.length, f4.miss.join());
// B fires the boys' gun from its race screen (a normal tap)
await B.evaluate(()=>{ document.querySelector('.tab[data-tab=watches]').click(); }); await W(150); await B.evaluate(()=>document.querySelector('#raceBannerOpen,#liveBar:not([hidden])')&&(document.querySelector('#liveBar:not([hidden])')||document.querySelector('#raceBannerOpen')).click()); await W(500);
const tb0=Date.now(); await B.click('.race-guns [data-ra=gun][data-start=B]'); const tb1=Date.now();
const bg=await B.evaluate(()=>MSApp.getRace().gun.starts.B&&MSApp.getRace().gun.starts.B.local);
ok('B’s tap on Gun · Boys is recorded at the touch (mouse press time)', bg>=tb0-2&&bg<=tb1+17, `${bg-tb0} ms`);
const f5=await onAll([A,C],()=>{ const r=MSApp.getRace(); return r.gun.starts&&!!r.gun.starts.B; },null,2000);
ok('the boys’ gun reaches A and C within 2 s', !f5.miss.length, f5.miss.join());
ok('Undo gun and Restart clock are still there (Restart until the first time)', await B.evaluate(()=>!document.querySelector('#raceRestart').hidden&&/Undo gun/.test(document.querySelector('#snackBtn').textContent)), await B.evaluate(()=>[document.querySelector('#raceRestart').hidden,document.querySelector('#raceRestart').textContent,document.querySelector('#snack').hidden,document.querySelector('#snackBtn').textContent].join('|')));

console.log('6. taps reach every phone within 2 s');
await A.evaluate(()=>document.querySelector('#liveBar:not([hidden])')&&document.querySelector('#liveBar').click()); await W(500);
const tt=Date.now(); await A.click('#raceGrid [data-rn=g3]');
const f6=await onAll([B,C],()=>MSApp.getRace().marks.some(m=>m.runnerId==='g3'),null,2000);
ok('A’s tap is on B and C within 2 s', !f6.miss.length, f6.miss.length?f6.miss.join():((Date.now()-tt)/1000).toFixed(1)+' s');
await C.evaluate(()=>document.querySelector('.tab[data-tab=watches]').click()); await W(150); await C.evaluate(()=>(document.querySelector('#liveBar:not([hidden])')||document.querySelector('#raceBannerOpen')).click()); await W(500);
const tc=Date.now(); await C.click('#raceGrid [data-rn=b3]');
const f7=await onAll([A,B],()=>MSApp.getRace().marks.some(m=>m.runnerId==='b3'),null,2000);
ok('C’s tap is on A and B within 2 s', !f7.miss.length, f7.miss.length?f7.miss.join():((Date.now()-tc)/1000).toFixed(1)+' s');

console.log('7. PR and season-best pace marks');
const R=await A.evaluate(()=>{ const r=MSApp.getRace(); return {cps:r.checkpoints.map(c=>({id:c.id,d:c.dist})),G:r.gun.starts.G,B:r.gun.starts.B,pr:Object.fromEntries(r.runners.map(x=>[x.id,[x.pr,x.sb]]))}; });
ok('PR and season best were stamped at the gun (Ada 20:00/20:00, Bea 20:00/21:00, Abe 16:40/16:40)', JSON.stringify([R.pr.g1,R.pr.g2,R.pr.b1])===JSON.stringify([[1200,1200],[1200,1260],[1000,1000]]), JSON.stringify(R.pr));
const put=(rid,ci,sec,st)=>{ const g=R[st]; return owner(`teams/${T}/races/${RID}/marks?documentId=pm-${rid}-${ci}`,{method:'POST',body:JSON.stringify({fields:{cp:{stringValue:R.cps[ci].id},local:{integerValue:String(Math.round(g.local+sec*1000))},off:g.off==null?{nullValue:null}:{integerValue:String(g.off)},runnerId:{stringValue:rid},by:{stringValue:'other'},byName:{stringValue:'Coach Ben'},updatedAt:{timestampValue:new Date().toISOString()},updatedBy:{stringValue:'other'}}})}); };
// Mile 1 = 1609 m of 5000: PR pace 1200 → 386.2 s; SB 1260 → 405.5 s
await put('g1',0,380,'G'); await put('g2',0,395,'G'); await put('b2',0,300,'B'); await put('b1',0,330,'B');
await A.evaluate(id=>{ const b=document.querySelector(`[data-at="${id}"]`); if(b) b.click(); },R.cps[0].id); await W(1500);
const txt=id=>A.$eval(`#raceGrid [data-rn="${id}"] .t`,e=>({t:e.textContent,vis:e.querySelector('[aria-hidden]')?e.querySelector('[aria-hidden]').textContent:'',cls:(e.querySelector('.pm')||{}).className||''}));
const m1=await txt('g1'), m2=await txt('g2'), m3=await txt('b2'), m4=await txt('b1');
ok('Mile 1, Ada ahead of PR pace: ★ (gold), read as "on PR pace"', m1.vis.trim()==='★'&&/pm-pr/.test(m1.cls)&&/on PR pace/.test(m1.t), JSON.stringify(m1));
ok('Mile 1, Bea behind PR pace but ahead of SB pace: ▲ (green), "on season-best pace"', m2.vis.trim()==='▲'&&/pm-sb/.test(m2.cls)&&/season-best pace/.test(m2.t), JSON.stringify(m2));
ok('Mile 1, Ben (no PR or SB): no mark', !/[★▲]/.test(m3.t), JSON.stringify(m3));
ok('Mile 1, Abe behind his PR pace (16:40): no mark', !/[★▲]/.test(m4.t), JSON.stringify(m4));
const fin=R.cps.length-1;
await put('g1',fin,1190,'G'); await put('g2',fin,1250,'G'); await put('g3',fin,1300,'G');
await A.evaluate(id=>{ const b=document.querySelector(`[data-at="${id}"]`); if(b) b.click(); },R.cps[fin].id); await W(1500);
const n1=await txt('g1'), n2=await txt('g2'), n3=await txt('g3');
ok('Finish, Ada 19:50 under her 20:00 PR: "★ PR"', n1.vis.trim()==='★ PR'&&/new PR/.test(n1.t), JSON.stringify(n1));
ok('Finish, Bea 20:50 under her 21:00 season best: "▲ SB"', n2.vis.trim()==='▲ SB'&&/new season best/.test(n2.t), JSON.stringify(n2));
ok('Finish, Cora (no PR): no mark', !/[★▲]/.test(n3.t), JSON.stringify(n3));
const fits=async(p)=>p.$$eval('#raceGrid [data-rn]',bs=>bs.map(b=>{ const t=b.querySelector('.t'); return {h:Math.round(b.getBoundingClientRect().height),fit:t.scrollWidth<=t.clientWidth+1}; }));
let F=await fits(A); ok('2 columns: every time and mark fits its line; every button the same height', F.every(x=>x.fit)&&new Set(F.map(x=>x.h)).size===1, JSON.stringify(F.slice(0,3)));
await A.evaluate(()=>{ MSApp.setRaceCols&&MSApp.setRaceCols(3); }); await A.click('#openSettings'); await W(300); await A.evaluate(()=>{ const b=document.querySelector('[data-setcols="3"]'); if(b) b.click(); document.querySelector('#overlay').hidden=true; }); await W(800);
F=await fits(A); ok('3 columns: the same', F.every(x=>x.fit)&&new Set(F.map(x=>x.h)).size===1, JSON.stringify(await A.$$eval('#raceGrid [data-rn]',bs=>bs.map(b=>{ const t=b.querySelector('.t'); return t.textContent+':'+t.scrollWidth+'/'+t.clientWidth+'/'+b.clientWidth; }))));
const contrast=await A.evaluate(()=>{ const rgb=c=>c.match(/[\d.]+/g).slice(0,3).map(Number), L=([r,g,b])=>{ const f=v=>{ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  return [...document.querySelectorAll('#raceGrid .pm')].map(e=>{ const b=e.closest('button'), a=L(rgb(getComputedStyle(e).color)), c=L(rgb(getComputedStyle(b).backgroundColor)); return Math.round((Math.max(a,c)+0.05)/(Math.min(a,c)+0.05)*100)/100; }); });
ok('marks are at least 4.5:1 against their button', contrast.length>=2&&contrast.every(x=>x>=4.5), contrast.join()+' '+await A.evaluate(()=>{ const e=document.querySelector('#raceGrid .pm'); return e?getComputedStyle(e).color+' on '+getComputedStyle(e.closest('button')).backgroundColor:'none'; }));
const res=await A.evaluate(()=>{ const c=[...document.querySelectorAll('#raceRes .rcard')]; const f=n=>{ const x=c.find(e=>e.textContent.includes(n)); return x?x.innerText.replace(/\s+/g,' '):''; }; return {ada:f('Ada'),bea:f('Bea')}; });
ok('live results show the marks too (Ada: ★ PR pace at Mile 1, ★ PR at the finish)', /★ PR pace/.test(res.ada)&&/★ PR/.test(res.ada.replace('★ PR pace','')), res.ada.slice(0,160));
ok('…Bea: ▲ SB pace, ▲ SB', /▲ SB pace/.test(res.bea)&&/▲ SB(?! pace)/.test(res.bea), res.bea.slice(0,160));

console.log('8. not shared: no connection, then the team refuses a change');
await C.evaluate(id=>document.querySelector(`[data-at="${id}"]`).click(),R.cps[1].id); await W(800);
await C.setOfflineMode(true); await W(300); await C.click('#raceGrid [data-rn=g1]');
ok('offline C says "Not shared yet: no signal" on the race screen', await waitFor(C,()=>/Not shared yet/.test(document.querySelector('#raceStatus').textContent),null,8000), await C.evaluate(()=>document.querySelector('#raceStatus').textContent));
await C.setOfflineMode(false);
ok('…and "Shared with the team ✓" again once online', await waitFor(C,()=>/Shared with the team ✓/.test(document.querySelector('#raceStatus').textContent),null,20000), await C.evaluate(()=>document.querySelector('#raceStatus').textContent));
await B.evaluate(()=>{ MSApp.getRace().division='ZZ'; MSApp.raceTouch&&MSApp.raceTouch(); });
await B.evaluate(()=>{ const r=MSApp.getRace(); r.name=r.name+' '; MSApp.raceTouch(); });
ok('a race change the rules refuse: "Not shared: the team refused it" on B', await waitFor(B,()=>/refused/.test(document.querySelector('#raceStatus').textContent),null,15000), await B.evaluate(()=>document.querySelector('#raceStatus').textContent));
await B.evaluate(()=>{ const r=MSApp.getRace(); r.division='OPEN'; r.name=r.name.trim(); MSApp.raceTouch(); });

console.log('9. no reload during setup or a live race; errors go to the Sync log');
for(const p of P) await p.evaluate(()=>{ window.__alive=1; });
await C.setRequestInterception(true); C.on('request',r=>r.url().includes('version.json')?r.respond({status:200,contentType:'application/json',body:'{"version":"9.9.9"}'}):r.continue());
await C.evaluate(()=>MSApp.checkUpdate('open')); await W(6000);
ok('C with a newer version waiting: no reload during the live race', await C.evaluate(()=>window.__alive===1) && (await C.evaluate(()=>MSApp.updState().timing))===true);
ok('…the banner says it installs after the race', /after the race/.test(await C.$eval('#updText',e=>e.textContent)));
await C.evaluate(()=>MSApp.testError()); await W(500);
await C.evaluate(()=>{ document.querySelector('#openSettings').click(); }); await W(300); await C.evaluate(()=>document.querySelector('#openSyncLog').click()); await waitFor(C,()=>/Races on the team|No race is set up/.test(document.querySelector('#modal').innerText),null,10000);
const lg=await C.evaluate(()=>document.querySelector('#modal').innerText);
ok('Sync log: the membership check says member with the current password ✓', /Member of Mustangs with the current password ✓/.test(lg), lg.slice(0,140));
ok('Sync log: the team’s race is listed', /Races on the team: “Sectional mock/.test(lg), (lg.match(/Races on the team[^\n]*|No race[^\n]*|Couldn’t[^\n]*/)||[''])[0].slice(0,160));
ok('Sync log: race taps with the team’s answer (accepted)', /Race tap: [A-Z][a-z]+ [A-Z]\. at /.test(lg)&&/accepted/.test(lg));
ok('Sync log: the error was caught and logged', /test error on purpose/.test(lg));
ok('Sync log: names only as first name + initial', !/Abe Stone|Ben Hale|Cal Moss|Ada Quill/.test(lg));
const lb=await B.evaluate(()=>{ document.querySelector('#overlay').hidden=true; return MSApp.syncLogText(); });
ok('B’s log has the refused race change, with the reason', /refused/.test(lb)&&/permission-denied|PERMISSION_DENIED|insufficient/i.test(lb), (lb.split('\n').find(l=>/refused/.test(l))||'').slice(0,160));
await C.evaluate(()=>{ document.querySelector('#overlay').hidden=true; });
C.removeAllListeners('request'); C.on('request',r=>r.url().includes('version.json')?r.respond({status:200,contentType:'application/json',body:'{"version":"3.11.0"}'}):r.continue());
await C.evaluate(()=>MSApp.checkUpdate('open')); await W(800); // nothing newer any more (so the rest of the test can't reload C)

console.log('10. race ended: an update installs; a new race set up later is followed again');
await A.click('[data-ra=end]'); await W(300); await A.click('#modal [data-x=save]'); await W(1500);
ok('every phone shows the race finished', !(await onAll(P,()=>MSApp.getRace().status==='done',null,5000)).miss.length);
await C.evaluate(()=>document.querySelector('.tab[data-tab=team]').click()); await W(300);
ok('C (race over, off the race screen): an update could install now (nothing holds it)', (await C.evaluate(()=>MSApp.updState().timing))===false);
C.removeAllListeners('request'); await C.setRequestInterception(false);
await newRaceUI(B); await B.click('[data-pk=all]');
const f8=await onAll([C],()=>MSApp.getRace()&&MSApp.getRace().status==='setup'&&MSApp.getRace().runners.length===6,null,4000);
ok('B sets up the next race: C (off the race screen) follows it', !f8.miss.length, f8.miss.join());
ok('A, still reading the finished race’s results, isn’t switched; it shows the next race with Open it', await waitFor(A,()=>MSApp.getRace().status==='done'&&/has a race set up/.test((document.querySelector('#raceNext')||{}).textContent||''),null,6000));
await A.evaluate(()=>document.querySelector('.tab[data-tab=team]').click());
ok('…and follows it once A leaves the race screen', await waitFor(A,()=>MSApp.getRace().status==='setup'&&MSApp.getRace().runners.length===6,null,6000));
const real=errs.filter(e=>!/test error on purpose/.test(e));
ok('no page errors (besides the one thrown on purpose)', !real.length, real.slice(0,3).join(' | '));
console.log('\nerrors', errs); console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
