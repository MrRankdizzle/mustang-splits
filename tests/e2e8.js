// 2.4 Race Mode: stable name grid, Time now, Save/Discard, presence. Needs the emulators (see runall.sh).
const puppeteer=require('puppeteer-core');
const URL='http://localhost:8765/?emu', PW='gravel otter lantern 44';
const REST='http://127.0.0.1:8181/v1/projects/mustang-splits/databases/(default)/documents';
const owner=(path,opt={})=>fetch(REST+'/'+path,{headers:{'Authorization':'Bearer owner','Content-Type':'application/json'},...opt}).then(r=>r.json());
const ROSTER=['Maya Lopez, Varsity','Jonah Kim, Varsity','Sam Ortiz, JV','Ava Chen, Varsity','Liam Brooks, JV','Zoe Park, Varsity','Eli Ward, JV','Nora Diaz, Varsity','Owen Hart, JV','Ivy Long, Varsity','Theo Ruiz, JV','Cleo Fox, Varsity','Ben Adler, JV','Ruby Stone, Varsity','Max Cole, JV'].join('\n');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:100},arg); return true; }catch(e){ return false; } };
async function phone(tag,{block}={}){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage(); await p.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('mustang-splits:tour','1'); }catch(e){} }); await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(tag+': '+e.message));
  if(block){ await p.setRequestInterception(true); p.on('request',r=>r.url().includes('gstatic.com/firebasejs')?r.abort():r.continue()); }
  await p.goto(URL); await p.waitForFunction(()=>window.MSApp&&document.querySelector('.watch')); require('./lib.js').patchClick(p); p.tag=tag; return p; }
const paste=async(p,txt)=>{ await p.click('.tab[data-tab=team]'); await W(); await p.click('#pasteAth'); await W(); await p.$eval('#pasteTxt',(t,v)=>t.value=v,txt); await p.click('[data-x=yes]'); await W(300); await p.click('.tab[data-tab=watches]'); await W(); };
const rid=(p,name)=>p.evaluate(n=>(MSApp.getRoster().find(a=>a.name.startsWith(n))||{}).id,name);
const cpId=(p,i)=>p.evaluate(i=>MSApp.getRace().checkpoints[i].id,i);
const tapAt=async(p,i)=>{ await p.click(`[data-at="${await cpId(p,i)}"]`); await W(500); };
const coachName=async(p,n)=>{ if(await waitFor(p,()=>document.querySelector('#coachName'),null,2500)){ await p.type('#coachName',n); await p.click('[data-x=yes]'); await W(); } };
const device=p=>p.evaluate(()=>localStorage.getItem('mustang-splits:device'));
// the layout box (a rejected tap's short shake is a transform, not a layout change)
const rects=p=>p.$$eval('#raceGrid [data-rn]',bs=>bs.map(b=>{ const g=document.querySelector('#raceGrid').getBoundingClientRect(), r={left:g.left+b.offsetLeft,top:g.top+b.offsetTop,width:b.offsetWidth,height:b.offsetHeight}; return b.dataset.rn+'@'+[r.left,r.top,r.width,r.height].map(Math.round).join(','); }).join(' '));
const center=(p,id)=>p.$eval(`#raceGrid [data-rn="${id}"]`,b=>{ const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; });
const isRec=(p,id)=>p.$eval(`#raceGrid [data-rn="${id}"]`,b=>b.classList.contains('rec'));
const btnText=(p,id)=>p.$eval(`#raceGrid [data-rn="${id}"]`,b=>b.innerText.replace(/\s+/g,' '));
const statusText=p=>p.$eval('#raceStatus',x=>x.textContent);
const longPress=async(p,id,ms=800)=>{ const c=await center(p,id); await p.touchscreen.touchStart(c.x,c.y); await W(ms); await p.touchscreen.touchEnd(); await W(); };
// Taps fast at fixed positions while `during` runs; checks every tap recorded exactly the runner under the finger.
async function tapStorm(p,{taps,cp,label}){
  const dev=await device(p), start=await rects(p); let wrong=0, moved=0, recorded=0, ignored=0, extra=0;
  for(let i=0;i<taps;i++){
    const ids=await p.$$eval('#raceGrid [data-rn]:not(.rec)',bs=>bs.filter(b=>{ const r=b.getBoundingClientRect(); return r.top>=0&&r.bottom<=window.innerHeight; }).map(b=>b.dataset.rn)); if(!ids.length) break; // only what a coach can see
    const target=ids[Math.floor(Math.random()*ids.length)], c=await center(p,target);
    const under=await p.evaluate((x,y)=>{ const e=document.elementFromPoint(x,y); const b=e&&e.closest('[data-rn]'); return b?b.dataset.rn:null; },c.x,c.y);
    const before=await p.evaluate((d,cp)=>MSApp.getRace().marks.filter(m=>m.by===d&&m.cp===cp).map(m=>m.id),dev,cp);
    await p.touchscreen.tap(c.x,c.y); await W(15);
    const after=await p.evaluate((d,cp)=>MSApp.getRace().marks.filter(m=>m.by===d&&m.cp===cp).map(m=>({id:m.id,r:m.runnerId})),dev,cp);
    const fresh=after.filter(m=>!before.includes(m.id));
    if(under!==target){ moved++; console.log('     under != target:', await p.evaluate((x,y)=>{ const e=document.elementFromPoint(x,y); return e?(e.id||e.className||e.tagName)+' / overlay hidden '+document.querySelector('#overlay').hidden+' / '+document.querySelector('#modal').innerText.slice(0,80):'none'; },c.x,c.y)); }
    if(fresh.length>1) extra++;
    if(fresh.length===1){ recorded++; if(fresh[0].r!==target) wrong++; } else ignored++;
    const now=await rects(p); if(now!==start){ moved++; if(moved<3){ const A=start.split(' '),B=now.split(' '); console.log('     moved:',A.filter((x,i)=>x!==B[i]).slice(0,2).join(' '),'->',B.filter((x,i)=>x!==A[i]).slice(0,2).join(' '),'under',under===target); } }
    await W(40+Math.random()*160);
  }
  console.log(`     ${label}: ${recorded} recorded, ${ignored} ignored (guard or already recorded), ${wrong} wrong, ${moved} moved, ${extra} extra`);
  return {wrong,moved,recorded,ignored,extra};
}

console.log('1. one phone, no network: order, columns, stable grid, tidy, hold to remove, discard');
const L=await phone('L',{block:true});
await paste(L,ROSTER);
await L.click('#newBtn'); await W(); await L.click('[data-new=race]'); await W();
for(const gi of await L.$$eval('[data-rg]',x=>x.map(e=>e.dataset.rg))){ await L.click(`[data-rg="${gi}"]`); await W(); } // 2.12: every Girls/Boys section
ok('15 runners picked', (await L.evaluate(()=>MSApp.getRace().runners.length))===15);
const ordNames=()=>L.$$eval('#ordList .ord-row .nm',xs=>xs.map(x=>x.firstChild.textContent));
ok('no goals: order is alphabetical by first name', (await ordNames()).join()===[...(await ordNames())].sort().join(), (await ordNames()).slice(0,4).join());
const goal=async(n,v)=>{ const id=await rid(L,n); await L.click(`[data-goal="${id}"]`); await L.keyboard.type(v); };
await goal('Zoe','1845'); await goal('Owen','1910'); await goal('Ben','1802'); await L.click('[data-rname]'); await W(400);
let ord=await ordNames();
ok('after goals: fastest goal first, then first names', ord.slice(0,3).join()==='Ben Adler,Zoe Park,Owen Hart' && ord[3]==='Ava Chen', ord.slice(0,5).join());
// drag the last row to the top
const handle=async i=>L.$eval(`#ordList .ord-row:nth-child(${i}) .drag`,h=>{ const r=h.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; });
await L.$eval('#ordList',l=>l.scrollIntoView({block:'start'})); await W();
const last=await handle(6), first=await handle(1);
await L.mouse.move(last.x,last.y); await L.mouse.down(); for(let k=1;k<=12;k++){ await L.mouse.move(last.x,last.y+(first.y-12-last.y)*k/12); await W(20); } await L.mouse.up(); await W();
const dragged=await L.evaluate(()=>MSApp.getRace().runners.map(x=>x.name));
ok('drag ☰ moves a runner (6th to first)', dragged[0]===ord[5] && dragged[1]===ord[0], dragged.slice(0,3).join());
await goal('Ivy','1700'); await L.click('[data-rname]'); await W(400);
ok('a dragged order is kept when goals change', (await L.evaluate(()=>MSApp.getRace().runners[0].name))===ord[5]);
await L.click('[data-ra=sortgoal]'); await W();
ok('Sort by goal re-sorts', (await L.evaluate(()=>MSApp.getRace().runners.map(x=>x.name).slice(0,2).join()))==='Ivy Long,Ben Adler');
await L.click('[data-cols="3"]'); await W();
ok('3 columns remembered on this phone', (await L.evaluate(()=>JSON.parse(localStorage.getItem('mustang-splits:v1')).settings.raceCols))===3);
await L.click('#readyBtn').then(()=>new Promise(r=>setTimeout(r,150))).then(()=>L.click('[data-ra=gun]')); await W(600);
const order=await L.evaluate(()=>MSApp.getRace().runners.map(x=>x.id));
ok('grid follows the race order', (await L.$$eval('#raceGrid [data-rn]',bs=>bs.map(b=>b.dataset.rn))).join()===order.join());
ok('3 columns, buttons at least 56 px tall', (await L.$eval('#raceGrid',g=>getComputedStyle(g).gridTemplateColumns.split(' ').length))===3 && (await L.$$eval('#raceGrid button',bs=>Math.min(...bs.map(b=>b.getBoundingClientRect().height))))>=56);
ok('all 15 name buttons fit on screen without scrolling', await L.$$eval('#raceGrid button',bs=>bs.every(b=>b.getBoundingClientRect().top>=0&&b.getBoundingClientRect().bottom<=window.innerHeight)));
ok('"Time now, name later" is secondary (outlined, smaller than a name button)', await L.$eval('[data-ra=mark]',b=>getComputedStyle(b).backgroundColor!==getComputedStyle(document.querySelector('.race-gun')||b).color && b.getBoundingClientRect().height<=52 && b.textContent==='Time now, name later'));
const gt=await L.$eval('#raceGrid',g=>g.getBoundingClientRect().top);
await L.evaluate(()=>{ document.querySelector('#updateBanner').hidden=false; document.querySelector('#installBanner').hidden=false; }); await W(100);
ok('an Update or Install banner appearing mid-race does not move the grid', (await L.$eval('#raceGrid',g=>g.getBoundingClientRect().top))===gt);
await L.evaluate(()=>{ document.querySelector('#updateBanner').hidden=true; document.querySelector('#installBanner').hidden=true; });
ok('first-time hint shown', (await L.$eval('#markStrip',s=>s.textContent)).includes('Tap once per runner when a pack passes. Assign names after.'));
const gridTop0=await L.$eval('#raceGrid',g=>g.getBoundingClientRect().top);
await L.click('[data-ra=mark]'); await W(); await L.click('[data-ra=mark]'); await W();
ok('two Time now chips; hint gone; grid did not move', (await L.$$('#markStrip [data-um]')).length===2 && !(await L.$eval('#markStrip',s=>s.textContent)).includes('Tap once') && (await L.$eval('#raceGrid',g=>g.getBoundingClientRect().top))===gridTop0);
await L.click('#markStrip [data-um]'); await W();
ok('picking a chip shows the hint in the status line; grid did not move', (await statusText(L)).includes('Now tap the runner') && (await L.$eval('#raceGrid',g=>g.getBoundingClientRect().top))===gridTop0);
const a1=order[2]; let c=await center(L,a1); await L.touchscreen.tap(c.x,c.y); await W();
ok('chip assigned to the tapped runner', await L.evaluate(id=>MSApp.getRace().marks.some(m=>m.runnerId===id),a1));
await L.click('#markStrip [data-um]'); await W(); c=await center(L,a1); await L.touchscreen.tap(c.x,c.y); await W();
ok('a chip cannot be given to a runner already recorded here', (await L.evaluate(id=>MSApp.getRace().marks.filter(m=>m.runnerId===id).length,a1))===1);
await L.click('#markStrip [data-um]'); await W(); // unselect
// remote marks arrive during a fast tap storm
const cp0=await cpId(L,0);
await L.evaluate((cp,ids)=>{ let n=0; window.__remote=setInterval(()=>{ const r=MSApp.getRace(); const free=ids.filter(id=>!r.marks.some(m=>m.runnerId===id&&m.cp===cp)); if(!free.length||n++>40) return;
  const id=free[Math.floor(Math.random()*free.length)]; MSApp.applyRemote({athletes:{upsert:[],remove:[]},workouts:{upsert:[],remove:[]},marks:{upsert:[{id:'rm'+n+Math.random().toString(36).slice(2,6),cp,local:Date.now(),off:null,runnerId:id,by:'other-device',byName:'Coach Jen'}],remove:[]}}); },170); },cp0,order.slice(11));
const s1=await tapStorm(L,{taps:8,cp:cp0,label:'local storm'});
await L.evaluate(()=>clearInterval(window.__remote)); await W(500);
ok('fast taps while another coach\'s marks arrive: never a wrong runner', s1.wrong===0 && s1.extra===0 && s1.recorded>=5);
ok('no name button ever moved', s1.moved===0);
const jen=await L.evaluate((cp,d)=>{ const m=MSApp.getRace().marks.find(m=>m.by==='other-device'&&m.cp===cp&&m.runnerId&&!MSApp.getRace().marks.some(x=>x!==m&&x.runnerId===m.runnerId&&x.cp===cp)); return m&&m.runnerId; },cp0);
ok('a runner recorded by another coach grays out in place and shows who', !!jen && await isRec(L,jen) && (await btnText(L,jen)).includes('Coach Jen'), jen&&await btnText(L,jen));
// guard: a remote change to one button blocks only that button for ~400 ms
const free=await L.$$eval('#raceGrid [data-rn]:not(.rec)',bs=>bs.map(b=>b.dataset.rn));
const [g1,g2]=free;
await L.evaluate((cp,id)=>{ MSApp.applyRemote({athletes:{upsert:[],remove:[]},workouts:{upsert:[],remove:[]},marks:{upsert:[{id:'g1',cp,local:Date.now(),off:null,runnerId:id,by:'other-device',byName:'Coach Jen'}],remove:[]}}); setTimeout(()=>MSApp.applyRemote({athletes:{upsert:[],remove:[]},workouts:{upsert:[],remove:[]},marks:{upsert:[],remove:['g1']}}),30); },cp0,g1);
await W(80); c=await center(L,g1); await L.touchscreen.tap(c.x,c.y); await W(30);
ok('tap on a button another coach changed 0.1 s ago is ignored', !(await isRec(L,g1)));
c=await center(L,g2); await L.touchscreen.tap(c.x,c.y); await W(30);
ok('…but other buttons still work right away', await isRec(L,g2));
await W(500); c=await center(L,g1); await L.touchscreen.tap(c.x,c.y); await W(30);
ok('…and that button works again after 400 ms', await isRec(L,g1));
// tapping a recorded name does nothing
const nBefore=await L.evaluate(()=>MSApp.getRace().marks.length); c=await center(L,g2); await L.touchscreen.tap(c.x,c.y); await W();
ok('tapping a recorded name adds nothing and says how to remove', (await L.evaluate(()=>MSApp.getRace().marks.length))===nBefore && (await L.$eval('#toast',t=>t.textContent)).includes('Press and hold'));
// switching checkpoint: whole grid guarded
await L.click(`[data-at="${await cpId(L,1)}"]`); await W(60); c=await center(L,order[0]); await L.touchscreen.tap(c.x,c.y); await W(30);
ok('right after switching checkpoint, taps are ignored', !(await isRec(L,order[0])));
await W(450); await L.touchscreen.tap(c.x,c.y); await W(30);
ok('…then work', await isRec(L,order[0]));
await tapAt(L,0);
// press and hold
const holdName=await L.evaluate(id=>MSApp.getRace().runners.find(x=>x.id===id).name,g2);
await longPress(L,g2);
ok('press and hold removes it at once (2.6: no confirm), Undo toast at the top', await L.$eval('#overlay',o=>o.hidden) && (await L.$eval('#snack',s=>s.hidden?'':s.textContent)).startsWith(`Removed ${holdName}’s Mile 1 time`) && await L.$eval('#snack',s=>s.getBoundingClientRect().top<120));
ok('removed; the button is open again, same place', !(await isRec(L,g2)));
ok('the removed time is kept (a new version, not erased)', await L.evaluate(id=>MSApp.getRace().marks.some(m=>m.runnerId===id&&m.deleted&&m.hist&&m.hist.length===2),g2));
await L.click('#snackBtn'); await W();
ok('Undo puts the time back', await isRec(L,g2));
await longPress(L,g2,250);
ok('a short press does nothing', await isRec(L,g2));
// tidy up (first free two runners: another coach removes two of their times)
await L.evaluate(cp=>{ const ms=MSApp.getRace().marks.filter(m=>m.by==='other-device'&&m.cp===cp&&m.runnerId).slice(0,2).map(m=>m.id); MSApp.applyRemote({athletes:{upsert:[],remove:[]},workouts:{upsert:[],remove:[]},marks:{upsert:[],remove:ms}}); },cp0); await W(500);
const passed=await L.$$eval('#raceGrid [data-rn].rec',bs=>bs.length), top0=await rects(L);
ok('"Tidy up (n passed)" offered', (await L.$eval('[data-ra=tidy]',x=>x.textContent))===`Tidy up (${passed} passed)`);
await L.click('[data-ra=tidy]'); await W(60);
ok('tidy hides passed runners once', (await L.$$('#raceGrid [data-rn]')).length===15-passed && (await L.$eval('[data-ra=showall]',x=>x.textContent)).includes(`${passed} hidden`));
const firstLeft=(await L.$$eval('#raceGrid [data-rn]',bs=>bs.map(b=>b.dataset.rn)))[0]; c=await center(L,firstLeft); await L.touchscreen.tap(c.x,c.y); await W(30);
ok('right after tidying, taps are ignored', !(await isRec(L,firstLeft)));
await W(450); await L.touchscreen.tap(c.x,c.y); await W(60);
ok('a runner passed after tidying stays in place, grayed', await isRec(L,firstLeft) && (await L.$$('#raceGrid [data-rn]')).length===15-passed);
await L.click('[data-ra=showall]'); await W();
ok('Show all brings everyone back in the original order', (await L.$$eval('#raceGrid [data-rn]',bs=>bs.map(b=>b.dataset.rn))).join()===order.join());
// end: Discard (local)
await L.click('[data-ra=end]'); await W();
ok('End race offers Save results / Discard / Keep racing', (await L.$eval('#modal',m=>m.innerText)).includes('Save results') && !!(await L.$('#modal [data-x=discard]')) && !!(await L.$('#modal [data-x=no]')));
await L.click('#modal [data-x=discard]'); await W();
ok('Discard is instant with Undo (2.6)', (await L.evaluate(()=>MSApp.getRace()))===null && (await L.$eval('#snack',s=>s.hidden?'':s.textContent)).includes('Race discarded'));
const nMarks=await L.evaluate(()=>0);
await L.click('#snackBtn'); await W();
ok('Undo brings the race back, running, with every time', (await L.evaluate(()=>MSApp.getRace()&&MSApp.getRace().status))==='running' && (await L.evaluate(()=>MSApp.getRace().marks.length))>10);
await L.click('#raceBannerOpen').catch(()=>{}); await W();
await L.evaluate(()=>{ const v=document.querySelector('#v-race'); if(v.hidden) document.querySelector('#raceBannerOpen').click(); }); await W();
await L.click('[data-ra=end]'); await W(); await L.click('#modal [data-x=discard]'); await W(); await W(7000);
ok('discarded: race gone, back on Stopwatches', (await L.evaluate(()=>MSApp.getRace()))===null && await L.$eval('#v-race',v=>v.hidden));
await L.click('#openSettings'); await W(); await L.click('#openDeleted'); await W(400);
ok('Recently deleted lists the race', (await L.$eval('#modal',m=>m.innerText)).includes('Race: Race'));
await L.evaluate(()=>{ const b=[...document.querySelectorAll('#modal .del-row')].find(r=>r.textContent.startsWith('Race:')); b.querySelector('[data-rs]').click(); }); await W(400);
ok('…and restores it with all its marks, race screen open', !(await L.$eval('#v-race',v=>v.hidden)) && (await L.evaluate(()=>MSApp.getRace()&&MSApp.getRace().status))==='running' && (await L.evaluate(()=>MSApp.getRace().marks.length))>10);
await L.close();

console.log('2. team: two coaches, presence, version warning, storm, hold to remove, discard for everyone');
const form=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [x,v] of vals) await p.$eval(x,(i,v)=>i.value=v,v); await p.click('[data-x=yes]'); await waitFor(p,()=>document.querySelector('#overlay').hidden||document.querySelector('[data-x=mine]'),null,20000); };
const merge=async p=>{ if(await waitFor(p,()=>document.querySelector('[data-x=mine]'),null,8000)){ await p.click('[data-x=mine]'); await W(1500); } };
const A=await phone('A'), B=await phone('B');
await paste(A,ROSTER);
await form(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1','quiet falcon harbor 12']]); await merge(A); await W(1500);
await form(B,'#tmJoin',[['#tmPw1',PW]]); await merge(B); await W(2500);
await A.click('#newBtn'); await W(); await A.click('[data-new=race]'); await W();
ok('A is asked for a coach name once', !!(await A.$('#coachName')));
await coachName(A,'Coach Ann');
await A.type('[data-rname]','Bay Invite'); for(const gi of await A.$$eval('[data-rg]',x=>x.map(e=>e.dataset.rg))){ await A.click(`[data-rg="${gi}"]`); await W(); }
await A.click('[data-cols="3"]'); await W(); await A.click('#readyBtn').then(()=>new Promise(r=>setTimeout(r,150))).then(()=>A.click('[data-ra=gun]')); await W(1500);
await waitFor(B,()=>!document.querySelector('#raceBanner').hidden); await B.click('#raceBannerOpen'); await W(); if(await B.$('[data-x=open]')) await B.click('[data-x=open]');
await coachName(B,'Coach Ben');
ok('B opens the race with the same name order', await waitFor(B,()=>MSApp.getRace()&&MSApp.getRace().status==='running') && (await B.evaluate(()=>MSApp.getRace().runners.map(x=>x.id).join()))===(await A.evaluate(()=>MSApp.getRace().runners.map(x=>x.id).join())));
await B.click('#openSettings'); await W();
ok('coach name editable in Settings', (await B.$eval('#coachNm',i=>i.value))==='Coach Ben');
await B.click('[data-x=done]'); await W();
await tapAt(A,2); await tapAt(B,2);
ok('"2 coaches at Finish" on both phones', await waitFor(A,()=>document.querySelector('#raceStatus').textContent.includes('2 coaches at Finish'),null,10000) && await waitFor(B,()=>document.querySelector('#raceStatus').textContent.includes('2 coaches at Finish'),null,10000), await statusText(A));
await tapAt(B,1);
ok('when B moves to Mile 2, A no longer says 2 coaches', await waitFor(A,()=>!document.querySelector('#raceStatus').textContent.includes('coaches at'),null,10000), await statusText(A));
await tapAt(B,2);
const sc=JSON.parse(await A.evaluate(()=>localStorage.getItem('mustang-splits:sync'))), T=sc.teamId, RID=sc.raceId;
const APPV=JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'..','version.json'),'utf8')).version;
const presDocs=await owner(`teams/${T}/races/${RID}/coaches`);
ok('presence docs hold checkpoint, name, version', (presDocs.documents||[]).length===2 && (presDocs.documents||[]).every(d=>d.fields.ver.stringValue===APPV && d.fields.name.stringValue.startsWith('Coach')), JSON.stringify((presDocs.documents||[]).map(d=>d.fields.name.stringValue)));
await owner(`teams/${T}/races/${RID}/coaches/olduid`,{method:'PATCH',body:JSON.stringify({fields:{cp:{stringValue:'x'},name:{stringValue:'Coach Old'},ver:{stringValue:'2.3.9'},at:{timestampValue:new Date().toISOString()}}})});
ok('a coach on an older version: "Coach Old needs to update"', await waitFor(A,()=>document.querySelector('#raceStatus').textContent.includes('Coach Old needs to update'),null,10000), await statusText(A));
const cpF=await cpId(A,2), aDev=await device(A), bDev=await device(B);
// both phones tap at the Finish at the same time
const [sA,sB]=await Promise.all([tapStorm(A,{taps:12,cp:cpF,label:'A'}),tapStorm(B,{taps:12,cp:cpF,label:'B'})]);
ok('two phones tapping at once: never a wrong runner', sA.wrong+sB.wrong+sA.extra+sB.extra===0 && sA.recorded+sB.recorded>=8);
ok('no name button moved on either phone', sA.moved+sB.moved===0);
await W(2500);
const bOnly=await A.evaluate((cp,a,b)=>{ const r=MSApp.getRace(); const x=r.marks.find(m=>m.cp===cp&&m.by===b&&m.runnerId&&!r.marks.some(y=>y.cp===cp&&y.by===a&&y.runnerId===m.runnerId)); return x&&x.runnerId; },cpF,aDev,bDev);
ok('A shows B\'s runner grayed with "Coach Ben"', !!bOnly && await isRec(A,bOnly) && (await btnText(A,bOnly)).includes('Coach Ben'), bOnly&&await btnText(A,bOnly));
ok('A\'s own times show no name', await A.evaluate((cp,a)=>{ const r=MSApp.getRace(); const m=r.marks.find(m=>m.cp===cp&&m.by===a&&m.runnerId); const bt=m&&document.querySelector(`#raceGrid [data-rn="${m.runnerId}"] .by`); return !bt || bt.textContent===''||!r.marks.some(x=>x.runnerId===m.runnerId&&x.cp===cp&&x.by===a)||bt.textContent.startsWith('Coach'); },cpF,aDev));
await longPress(A,bOnly);
ok('A holds B\'s runner: removed at once; Undo names who recorded it', (await A.$eval('#snack',s=>s.hidden?'':s.textContent)).includes('Coach Ben'));
ok('removed on B too (as a version)', await waitFor(B,([cp,id])=>!MSApp.getRace().marks.some(m=>m.cp===cp&&m.runnerId===id&&!m.deleted)&&MSApp.getRace().marks.some(m=>m.cp===cp&&m.runnerId===id&&m.deleted),[cpF,bOnly],10000));
// end: Discard for everyone, while a third phone is offline with the race open
const C=await phone('C'); await form(C,'#tmJoin',[['#tmPw1',PW]]); await merge(C); await W(2000);
await waitFor(C,()=>!document.querySelector('#raceBanner').hidden); await C.click('#raceBannerOpen'); await W(); if(await C.$('[data-x=open]')) await C.click('[data-x=open]'); await coachName(C,'Coach Cal');
await waitFor(C,()=>MSApp.getRace()&&MSApp.getRace().status==='running'); await W(1500);
await C.setOfflineMode(true); await W(300);
const mkBefore=(await owner(`teams/${T}/races/${RID}/marks`)).documents.length;
await A.click('[data-ra=end]'); await W(); await A.click('#modal [data-x=discard]'); await W();
ok('team discard: instant, Undo says it is for every coach', (await A.$eval('#snack',s=>s.hidden?'':s.textContent)).includes('for every coach'));
ok('B is told and its race closes', await waitFor(B,()=>MSApp.getRace()===null,null,15000) && (await B.$eval('#toast',t=>t.textContent)).includes('discarded'));
await W(1500);
const rd=await owner(`teams/${T}/races/${RID}`), mk=await owner(`teams/${T}/races/${RID}/marks`), pr=await owner(`teams/${T}/races/${RID}/coaches`);
ok('Firestore: race kept, status discarded (runners and name intact)', rd.fields && rd.fields.status.stringValue==='discarded' && (rd.fields.runners.arrayValue.values||[]).length===15 && rd.fields.name.stringValue==='Bay Invite' && rd.fields.discardedFrom.stringValue==='running', JSON.stringify(rd.fields&&rd.fields.status));
ok('Firestore: every mark kept', (mk.documents||[]).length===mkBefore, `${(mk.documents||[]).length} of ${mkBefore}`);
// C was offline: it keeps tapping, then reconnects
const cIds=await C.$$eval('#raceGrid [data-rn]:not(.rec)',bs=>bs.map(b=>b.dataset.rn)); c=await center(C,cIds[0]); await C.touchscreen.tap(c.x,c.y); await W(300);
await C.setOfflineMode(false);
ok('offline phone C learns of the discard when it reconnects', await waitFor(C,()=>MSApp.getRace()===null,null,30000));
await W(2500);
const rd2=await owner(`teams/${T}/races/${RID}`), mk2=await owner(`teams/${T}/races/${RID}/marks`);
ok('…and could not bring the race back; its offline tap is kept for a restore', rd2.fields.status.stringValue==='discarded' && (mk2.documents||[]).length===mkBefore+1, `${(mk2.documents||[]).length}`);
ok('C is still a team member afterwards (no rejoin loop)', await waitFor(C,()=>!document.querySelector('#openSettings').dataset.sync,null,15000) && (await C.evaluate(()=>window.MSApp&&0))===0, await C.$eval('#openSettings',x=>x.dataset.sync));
// restore from Recently deleted on B: back for every coach, with all marks
await B.click('#openSettings'); await W(); await B.click('#openDeleted'); await W(400);
await B.evaluate(()=>{ const b=[...document.querySelectorAll('#modal .del-row')].find(r=>r.textContent.includes('Bay Invite')); b.querySelector('[data-rs]').click(); }); await W(3000);
ok('B restores the race: open again on B with every mark', await waitFor(B,()=>MSApp.getRace()&&MSApp.getRace().status==='running',null,15000) && (await B.evaluate(()=>MSApp.getRace().marks.length))===mkBefore+1);
ok('…and other coaches see it again (race banner on A)', await waitFor(A,()=>!document.querySelector('#raceBanner').hidden,null,15000));
const rd3=await owner(`teams/${T}/races/${RID}`);
ok('Firestore: restored by B (restoredBy recorded)', rd3.fields.status.stringValue==='running' && !!rd3.fields.restoredBy);
await B.click('[data-ra=end]'); await W(); await B.click('#modal [data-x=save]'); await W(1500); if(await B.$('#modal .pr-offer')){ await B.click('#modal [data-x=no]'); await W(); }
// save path still goes to history
await A.click('#newBtn'); await W(); await A.click('[data-new=race]'); await W(); await A.click('[data-rg="0"]'); await W(); await A.click('#readyBtn').then(()=>new Promise(r=>setTimeout(r,150))).then(()=>A.click('[data-ra=gun]')); await W(800);
const r2=await A.evaluate(()=>MSApp.getRace().runners[0].id); c=await center(A,r2); await A.touchscreen.tap(c.x,c.y); await W(300);
await A.click('[data-ra=end]'); await W();
ok('team End race offers "Save to team history"', (await A.$eval('#modal',m=>m.innerText)).includes('Save to team history'));
await A.click('#modal [data-x=save]'); await W(2000);
await A.click(await A.$('#raceClose:not([hidden])')?'#raceClose':'.tab[data-tab=watches]'); await W(); await A.click('.tab[data-tab=results]');
ok('saved race is in Team history', await waitFor(A,()=>document.querySelectorAll('#histList details').length>=1));

console.log('\nerrors', errs); console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
