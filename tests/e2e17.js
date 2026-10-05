// 2.9.1 fixes: keep the screen on with the iPhone fallback (wake lock refused -> silent video, retried on a tap;
// on while a stopwatch runs or a race is live), course factors only within one season, official results in backups
// and restores, Sectional/State courses from the printed place (new imports and meets imported by 2.9.0),
// Varsity/JV inferred and set by the admin (append-only, Undo, team sync, re-import adds levels), coach names in
// Settings > Team. Fake names only.
const puppeteer=require('puppeteer-core'), fs=require('fs'), path=require('path');
const URL='http://localhost:8765/?emu', PW='gravel otter lantern 44', AD='quiet falcon harbor 12', OUT=process.argv[2]||path.join(__dirname,'out');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:150},arg); return true; }catch(e){ return false; } };
async function phone(tag,{iosWake}={}){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage();
  await p.evaluateOnNewDocument(ios=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); }catch(e){}
    const off=Date.parse('2026-10-05T16:00:00')-Date.now(), R=Date; class D extends R{ constructor(...a){ if(a.length) super(...a); else super(R.now()+off); } static now(){ return R.now()+off; } } D.parse=R.parse; D.UTC=R.UTC; window.Date=D;
    if(ios){ Object.defineProperty(navigator,'wakeLock',{value:{request:()=>Promise.reject(Object.assign(new Error('not allowed'),{name:'NotAllowedError'}))},configurable:true}); } // like an installed app on iOS < 18.4
    else { let held=null; Object.defineProperty(navigator,'wakeLock',{value:{request:()=>{ const s={released:false,_l:[],addEventListener(t,f){ this._l.push(f); },release(){ this.released=true; this._l.forEach(f=>f()); return Promise.resolve(); }}; held=s; return Promise.resolve(s); }},configurable:true}); }
  },!!iosWake);
  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(tag+': '+e.message));
  await p.goto(URL); await p.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); require('./lib.js').patchClick(p); await W(800); return p; }
const wake=p=>p.evaluate(()=>MSApp.wakeState());
const startQuick=async p=>{ await p.click('#newBtn'); await W(); await p.click('#modal [data-new=quick]'); await W(600); };
const stopRunning=async p=>{ await p.evaluate(()=>document.querySelector('.watch.st-running [data-act=menu]').click()); await W(); await p.click('#modal [data-m=stop]'); await W(); };
const R=(date,meet,div,t,dist=5000,level='HS')=>({season:'x',grade:11,level,distance:'5K',distance_m:dist,date,time:'',time_s:t,place:1,flag:'',meet,division:div,meet_name_cut_off:false,possible_duplicate_of:null});
const writeFix=(name,ath)=>{ const f=path.join(OUT,name); fs.writeFileSync(f,JSON.stringify({format:'mustang-splits-history/v1',generated:'x',source:name,athletes:ath})); return f; };
const upload=async(p,file)=>{ await p.$eval('#histFile',i=>{ i.value=''; }); await (await p.$('#histFile')).uploadFile(file); await waitFor(p,()=>!!document.querySelector('#modal .imp-prev'),null,15000); await W(300); };
const seedSchedule=async p=>{ await p.click('#openSettings'); await W(); await p.click('#openMeets'); await W(); await p.click('#modal [data-mx=seed]'); await W(); await p.evaluate(()=>document.querySelector('#overlay').hidden=true); await W(); };

console.log('1. Keep screen on');
const I=await phone('I',{iosWake:true});
ok('nothing timing, setting off: screen not held', !(await wake(I)).want && !(await wake(I)).video);
await startQuick(I);
ok('a running stopwatch keeps the screen on even with the setting off: iOS refuses the wake lock, the silent video takes over after the tap', await waitFor(I,()=>MSApp.wakeState().video&&!MSApp.wakeState().lock,null,8000), JSON.stringify(await wake(I)));
ok('the video is tiny, silent to the eye and never in the way', await I.evaluate(()=>{ const v=document.querySelector('video[title="Keep screen on"]'); const r=v.getBoundingClientRect(); return !!v && !v.paused && r.width<=1 && getComputedStyle(v).pointerEvents==='none'; }));
await I.evaluate(()=>{ document.querySelector('#openSettings').click(); }); await W();
ok('Settings explains it ("iPhone backup method")', (await I.$eval('#wakeHint',x=>x.textContent)).includes('iPhone backup method'));
await I.evaluate(()=>document.querySelector('#overlay').hidden=true);
await stopRunning(I); await W(3500);
ok('clocks stopped, setting off: the screen is let go', await waitFor(I,()=>!MSApp.wakeState().video,null,6000), JSON.stringify(await wake(I)));
await I.evaluate(()=>{ MSApp.setRace({id:'rw',name:'Dual',status:'running',createdAt:Date.now(),gun:{local:Date.now()-60000,off:0,by:'x'},checkpoints:[{id:'f',name:'Finish',dist:5000,unit:'m'}],runners:[],marks:[],goalSrc:'none',courseId:null,meetId:null,division:''}); });
await I.click('#openSettings'); await W(); await I.evaluate(()=>document.querySelector('#overlay').hidden=true); // any tap
ok('a live race keeps it on (on any tab)', await waitFor(I,()=>MSApp.wakeState().video,null,6000));
await I.evaluate(()=>MSApp.setRace(null)); await W(3500);
const N=await phone('N');
await N.click('#openSettings'); await W(); await N.click('#wake'); await W(600);
ok('where the wake lock works it is used (no video)', (await wake(N)).lock && !(await wake(N)).video && (await N.$eval('#wakeHint',x=>x.textContent))==='Screen will stay on');

console.log('2. Course factors only within one season');
const L=await phone('L'); await seedSchedule(L);
const names=['Ann Alpha','Bea Beta','Cal Gamma','Dee Delta','Eve Eps'];
// Kiel vs Waupaca pairs 9 days apart: one pair across Aug 1 (two seasons), one pair inside a season; Kiel 5% slower.
// (Factors are relative to Winagamie GC, so each runner also races Winagamie the day after Waupaca, same time as Waupaca.)
const ath=names.map((n,i)=>({name:n,aliases:[],school:'X',results:[R('2025-07-27','Kiel Invite','Girls Varsity',1200+i*10),R('2025-08-05','Waupaca Invite','Girls Varsity',Math.round((1200+i*10)/1.05*10)/10),R('2025-08-06','Appleton West Terror Invite','Girls Varsity',Math.round((1200+i*10)/1.05*10)/10)]}));
await L.click('.tab[data-tab=results]'); await W(); await L.evaluate(()=>document.querySelector('#resImport').click()); await W();
await upload(L,writeFix('cross.json',ath)); await L.click('#modal [data-x=yes]'); await W(1500); await L.evaluate(()=>document.querySelector('#overlay').hidden=true);
let F=await L.evaluate(()=>MSApp.courseFactors());
ok('9 days apart but across Aug 1 (two seasons): no Kiel factor learned (Waupaca, same season as Winagamie, is)', F.f['c-kiel-hs']==null&&F.f['c-waupaca']!=null, JSON.stringify(F.f));
const ath2=names.map((n,i)=>({name:n,aliases:[],school:'X',results:[R('2025-09-04','Kiel Invite','Girls Varsity',1200+i*10),R('2025-09-13','Waupaca Invite','Girls Varsity',Math.round((1200+i*10)/1.05*10)/10),R('2025-09-14','Appleton West Terror Invite','Girls Varsity',Math.round((1200+i*10)/1.05*10)/10)]}));
await upload(L,writeFix('same.json',ath2)); await L.click('#modal [data-x=yes]'); await W(1500); await L.evaluate(()=>document.querySelector('#overlay').hidden=true);
F=await L.evaluate(()=>MSApp.courseFactors());
ok('same season, 9 days apart: Kiel learned as 5% slower than Waupaca', F.f['c-kiel-hs']!=null&&F.f['c-waupaca']!=null&&Math.abs(F.f['c-kiel-hs']/F.f['c-waupaca']-1.05)<0.002, JSON.stringify(F.f));

console.log('3. Backups and restores include official results');
const bk=await L.evaluate(async()=>JSON.stringify(await MSApp.backupData()));
const bkj=JSON.parse(bk); ok('the backup file holds the official results (30)', Array.isArray(bkj.official)&&bkj.official.reduce((a,d)=>a+(d.deleted?0:d.results.length),0)===30);
ok('…with no full names', !/Alpha|Beta|Gamma|Delta|Eps/.test(JSON.stringify(bkj.official)));
fs.writeFileSync(path.join(OUT,'backup-291.json'),bk);
const L2=await phone('L2');
await (await L2.$('#restoreFile')).uploadFile(path.join(OUT,'backup-291.json')); await W(800);
ok('the restore confirm counts the official results', (await L2.$eval('#modal',m=>m.innerText)).includes('30 official results'));
await L2.click('#modal [data-x=yes]'); await L2.waitForNavigation({timeout:15000}).catch(()=>{}); await L2.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); await W(1200);
ok('restored phone has the official results', (await L2.evaluate(()=>MSApp.officialStats().live))===30);
await (await L2.$('#restoreFile')).uploadFile(path.join(OUT,'backup-291.json')); await W(800); await L2.click('#modal [data-x=yes]'); await L2.waitForNavigation({timeout:15000}).catch(()=>{}); await L2.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); await W(1200);
ok('restoring the same backup again adds nothing twice', (await L2.evaluate(()=>MSApp.officialStats()))?.live===30);

console.log('4. Sectional and State courses by place');
const ath3=[{name:'Fay Phi',aliases:[],school:'X',results:[R('2023-10-21','WIAA D2 Sectional - New London','Girls',1250),R('2024-10-19','WIAA D2 Sectional - Kiel','Girls',1230),R('2025-10-25','Sectional 4 - Waupaca','Girls',1220),R('2025-11-01','WIAA State @ Wisconsin Rapids','Girls',1210)]}];
await L.evaluate(()=>document.querySelector('#resImport').click()); await W(); await upload(L,writeFix('sect.json',ath3)); await L.click('#modal [data-x=yes]'); await W(1500); await L.evaluate(()=>document.querySelector('#overlay').hidden=true);
const mc=await L.evaluate(()=>Object.fromEntries(MSApp.getMeets().filter(m=>m.id.startsWith('mh-')&&/sectional|state/.test(m.id)).map(m=>[m.id,m.courseId])));
ok('2023 Sectional at New London: a new course', mc['mh-2023-10-21-wiaa-sectional']==='c-new-london' && await L.evaluate(()=>MSApp.getCourses().some(c=>c.id==='c-new-london'&&c.name==='New London')), JSON.stringify(mc));
ok('2024 Sectional at Kiel: the existing Kiel HS course', mc['mh-2024-10-19-wiaa-sectional']==='c-kiel-hs');
ok('2025 Sectional 4 at Waupaca: the Waupaca course', mc['mh-2025-10-25-wiaa-sectional']==='c-waupaca');
ok('State at Wisconsin Rapids', mc['mh-2025-11-01-wiaa-state']==='c-wisconsin-rapids');
ok('this season’s Sectional still at Two Rivers', await L.evaluate(()=>MSApp.getMeets().find(m=>m.id==='m26-2026-10-23-wiaa-sectional').courseId)==='c-two-rivers');
// a meet imported by 2.9.0 (this season's course) is fixed on the next open
await L.evaluate(()=>{ const K='mustang-splits:v1', s=JSON.parse(localStorage.getItem(K)); s.meets.find(m=>m.id==='mh-2024-10-19-wiaa-sectional').courseId='c-two-rivers'; localStorage.setItem(K,JSON.stringify(s)); });
await L.evaluate(()=>{ window.onbeforeunload=null; }); await L.reload(); await L.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn'));
ok('a 2.9.0 import’s Sectional meet is moved to its printed place on open', await waitFor(L,()=>MSApp.getMeets().find(m=>m.id==='mh-2024-10-19-wiaa-sectional').courseId==='c-kiel-hs',null,8000));

console.log('5. Varsity / JV');
ok('Sectional and State results without a level are Varsity from the schedule', await L.evaluate(()=>{ const d=MSApp.officialStats(); return d.live===34; }) && await L.evaluate(()=>{ document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=meets]').click(); return [...document.querySelectorAll('#histList details.off')].filter(d=>/Sectional|State/.test(d.textContent)).every(d=>d.querySelector('summary').textContent.includes('Girls Varsity')); }));
const ath4=names.map((n,i)=>({name:n,aliases:[],school:'X',results:[R('2025-09-20','Smiley Invite','Girls',1250+i*5),R('2025-09-27','Red Raider Invite','Girls Frosh/Soph',1270+i*5)]}));
await L.evaluate(()=>document.querySelector('#resImport').click()); await W(); await upload(L,writeFix('lv.json',ath4)); await L.click('#modal [data-x=yes]'); await W(1500); await L.evaluate(()=>document.querySelector('#overlay').hidden=true);
await L.click('[data-rv=team]'); await W(); await L.select('[data-tvseason]','2025'); await W(400);
ok('"Frosh/Soph" counts as JV; plain "Girls" at an invite has no level and the Team view says so', (await L.$eval('#rvTeam',e=>e.innerText)).includes('5 official results have no Varsity or JV level'), (await L.$eval('#rvTeam',e=>e.innerText)).slice(0,300));
await L.click('[data-lvlset]'); await W();
ok('the Varsity / JV sheet lists those 5', (await L.$$('#modal .lvl-row')).length===5);
await L.click('#modal [data-lvall=V]'); await W(); await L.click('#modal [data-x=yes]'); await W(600);
ok('All Varsity: they count now (no note, Smiley in the Girls Varsity table)', !(await L.$eval('#rvTeam',e=>e.innerText)).includes('no Varsity or JV level') && (await L.$eval('#rvTeam',e=>e.innerText)).includes('Smiley'));
ok('saved as append-only edits (5) on the import record', await L.evaluate(()=>MSApp.backupData().then(d=>d.official.reduce((a,x)=>a+(x.edits||[]).filter(v=>v.op==='level').length,0)))===5);
await L.evaluate(()=>[...document.querySelectorAll('#snack button')].find(b=>b.textContent==='Undo').click()); await W(600);
ok('Undo puts them back without a level (another edit, nothing erased)', (await L.$eval('#rvTeam',e=>e.innerText)).includes('5 official results have no Varsity or JV level') && await L.evaluate(()=>MSApp.backupData().then(d=>d.official.reduce((a,x)=>a+(x.edits||[]).length,0)))===10);
// re-importing a file that has the level fills it in
const ath5=names.map((n,i)=>({name:n,aliases:[],school:'X',results:[R('2025-09-20','Smiley Invite','Girls Varsity',1250+i*5)]}));
await L.evaluate(()=>document.querySelector('#resImport').click()); await W(); await upload(L,writeFix('lv2.json',ath5));
ok('re-import: "5 results already imported get a Varsity/JV level", no new results', (await L.$eval('#modal',m=>m.innerText)).includes('5 results already imported get a Varsity/JV level') && (await L.$eval('#modal [data-x=yes]',b=>b.textContent))==='Save 5 levels');
await L.click('#modal [data-x=yes]'); await W(800);
ok('levels filled in from the file', !(await L.evaluate(()=>{ document.querySelector('[data-rv=team]').click(); return document.querySelector('#rvTeam').innerText; })).includes('no Varsity or JV level'));

console.log('6. Team: levels sync, coach names in Settings > Team');
const A=await phone('A'), B2=await phone('B');
const form=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [x,v] of vals) await p.$eval(x,(i,v)=>i.value=v,v); await p.click('[data-x=yes]'); await waitFor(p,()=>document.querySelector('#overlay').hidden||document.querySelector('[data-x=mine]'),null,20000); };
const merge=async p=>{ if(await waitFor(p,()=>document.querySelector('[data-x=mine]'),null,8000)){ await p.click('[data-x=mine]'); await W(1500); } };
await form(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1',AD]]); await merge(A); await W(1000);
await form(B2,'#tmJoin',[['#tmPw1',PW]]); await merge(B2); await W(1500);
await A.click('#openSettings'); await W(); await A.$eval('#coachNm',i=>{ i.value='Coach Ann'; i.dispatchEvent(new Event('input')); }); await W(2500); await A.evaluate(()=>document.querySelector('#overlay').hidden=true);
await B2.evaluate(()=>document.querySelector('#overlay').hidden=true); await B2.click('#openSettings'); await W(2500);
const ph=await B2.$eval('#phones',x=>x.innerText);
ok('Settings > Team shows the coach’s name and "Coach (no name set)", each with last seen', /Coach Ann\s*2\.9\.1 · (just now|\d+ (min|h) ago)/.test(ph)&&/Coach \(no name set\) \(this phone\)\s*2\.9\.1 · (just now|\d+ (min|h) ago)/.test(ph)&&!ph.includes('A coach'), ph.replace(/\n/g,' | '));
await B2.evaluate(()=>document.querySelector('#overlay').hidden=true);
await A.evaluate(()=>{ document.querySelector('.tab[data-tab=results]').click(); document.querySelector('#resImport').click(); }); await W(); await upload(A,writeFix('lv3.json',ath4)); await A.click('#modal [data-x=yes]'); await W(1500); await A.evaluate(()=>document.querySelector('#overlay').hidden=true);
await waitFor(B2,()=>MSApp.officialStats().live===10,null,20000);
await A.evaluate(()=>{ document.querySelector('[data-rv=team]').click(); }); await W(); await A.select('[data-tvseason]','2025'); await W(); await A.click('[data-lvlset]'); await W(); await A.click('#modal [data-lvall=JV]'); await W(); await A.click('#modal [data-x=yes]'); await W(1500);
ok('a level the admin sets reaches the other coach', await waitFor(B2,()=>MSApp.backupData().then(d=>d.official.reduce((a,x)=>a+(x.edits||[]).length,0)===5),null,20000));
ok('the other coach (not admin) has no Varsity / JV button', await B2.evaluate(()=>{ document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=meets]').click(); return !document.querySelector('[data-offlvl]')&&!document.querySelector('[data-lvlset]'); }));
const real=errs.filter(e=>!/Failed to fetch|NetworkError|net::|offline|play\(\)|NotAllowed/i.test(e));
ok('no page errors', !real.length, real.join(' | '));
console.log(bad?`\n${bad} FAILED`:'\nall passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.log('CRASH',e); process.exit(1); });
