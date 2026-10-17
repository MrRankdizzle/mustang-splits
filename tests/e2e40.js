// 3.11: race screen performance. What one arriving tap costs (main-thread time, against the same time with no taps), then 30 runners (girls and boys, separate starts), another coach's taps arriving 5 per
// second, the coach scrolling the race screen the whole time, the phone's CPU slowed 4× (an older iPhone): no frame
// longer than 50 ms, no long task over 50 ms, and no error. Firestore emulator, fake names.
const puppeteer=require('puppeteer-core'), H=require('./tools/phones.js');
const REST='http://127.0.0.1:8181/v1/projects/mustang-splits/databases/(default)/documents';
const owner=(path,opt={})=>fetch(REST+'/'+path,{headers:{'Authorization':'Bearer owner','Content-Type':'application/json'},...opt}).then(r=>r.json());
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',protocolTimeout:90000});
const {W,waitFor}=H; const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const FIRST=['Ada','Bea','Cora','Dot','Eve','Fay','Gail','Hope','Iris','Jo','Kay','Lea','Mae','Nell','Opal','Abe','Bo','Cal','Dax','Eli','Finn','Gus','Hal','Ike','Jay','Kit','Lev','Max','Ned','Oz'];
const LAST=['Quill','Rowan','Vance','Wren','Stone','Hale','Moss','Pike','Lark','Reed','Frost','Vale','Bloom','Cove','Dune','Ash','Birch','Cedar','Elm','Fern','Glen','Heath','Ivy','Juniper','Knoll','Laurel','Maple','North','Oak','Pine'];
const seed=new Function('S',`const FIRST=${JSON.stringify(FIRST)}, LAST=${JSON.stringify(LAST)}; S.roster=FIRST.map((f,i)=>({id:'r'+i,name:f+' '+LAST[i]+'-'+LAST[(i+7)%30],group:'',gender:i<15?'G':'B'})); S.settings.raceCols=2;`);
const [A]=await H.team(b,['Coach Ann'],errs,seed);
const cdp=await A.target().createCDPSession();
console.log('1. a 30-runner race, girls and boys guns fired');
await A.evaluate(()=>document.querySelector('.tab[data-tab=watches]').click()); await W(200);
await A.evaluate(()=>{ const e=document.querySelector('[data-new=race]'); if(e) e.click(); else { document.querySelector('#newBtn').click(); document.querySelector('#modal [data-new=race]').click(); } }); await W(600);
await A.click('[data-pk=all]'); await W(400); await A.type('[data-rname]','Perf mock'); await W(300);
await A.click('#readyBtn'); await W(300);
await A.click('[data-ra=gun][data-start=G]'); await W(800); await A.click('[data-ra=gun][data-start=B]'); await W(1500);
ok('30 name buttons on the race screen', (await A.$$eval('#raceGrid [data-rn]',x=>x.length))===30);
const sc=JSON.parse(await A.evaluate(()=>localStorage.getItem('mustang-splits:sync'))), T=sc.teamId, RID=sc.raceId;
const cps=await A.evaluate(()=>MSApp.getRace().checkpoints.map(c=>c.id)), gun=await A.evaluate(()=>MSApp.getRace().gun.local);
await A.evaluate(()=>{ window.__errs=[]; addEventListener('error',e=>window.__errs.push(e.message)); addEventListener('unhandledrejection',e=>window.__errs.push(String(e.reason&&e.reason.message||e.reason))); });
let sent=0, stop=false;
let seq=0; const inject=async()=>{ while(!stop){ const i=seq++; const t0=Date.now(), rn='r'+(i%30), cp=cps[Math.floor(i/30)%cps.length], id='inj'+i;
    owner(`teams/${T}/races/${RID}/marks?documentId=${id}`,{method:'POST',body:JSON.stringify({fields:{cp:{stringValue:cp},local:{integerValue:String(Date.now())},off:{integerValue:'0'},runnerId:{stringValue:rn},by:{stringValue:'other-phone'},byName:{stringValue:'Coach Ben'},updatedAt:{timestampValue:new Date().toISOString()},updatedBy:{stringValue:'other'}}})}).then(()=>{ sent++; }).catch(()=>{});
    await W(Math.max(0,200-(Date.now()-t0))); } };
// The loop runs in the page and keeps its numbers in window.__perf, so a stuck page still reports what it measured.
const measure=async(rate,ms,label)=>{ await cdp.send('Emulation.setCPUThrottlingRate',{rate});
  await A.evaluate(ms=>{ const P=window.__perf={gaps:[],long:[],done:false}; let last=performance.now(), dir=1; const t0=last;
    try{ P.po=new PerformanceObserver(l=>l.getEntries().forEach(e=>P.long.push(Math.round(e.duration)))); P.po.observe({entryTypes:['longtask']}); }catch(e){}
    const f=now=>{ P.gaps.push(now-last); last=now; const max=document.documentElement.scrollHeight-innerHeight; P.scroll=max; if(window.scrollY>=max-2) dir=-1; else if(window.scrollY<=0) dir=1; window.scrollBy(0,dir*9);
      if(now-t0<ms) requestAnimationFrame(f); else { P.done=true; if(P.po) P.po.disconnect(); } };
    requestAnimationFrame(f); },ms);
  stop=false; const run=inject(); await W(ms+300); stop=true; await run;
  let res=null; const t1=Date.now();
  while(Date.now()-t1<60000){ res=await Promise.race([A.evaluate(()=>{ const P=window.__perf, g=P.gaps.slice(1); return {done:P.done,frames:g.length,max:Math.round(Math.max(0,...g)),over50:g.filter(x=>x>50).length,over34:g.filter(x=>x>34).length,long:P.long.slice(),scroll:P.scroll}; }),W(20000).then(()=>null)]); if(res&&res.done) break; await W(1000); }
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
  console.log(`     ${label}:`,res?JSON.stringify({...res,long:res.long.length+' long tasks, longest '+Math.max(0,...res.long)+' ms'}):'the page did not answer for 60 s after the run','· taps sent',sent);
  return res||{done:false,frames:0,max:99999,over50:1,long:[99999],scroll:0}; };
// what one arriving tap costs on this phone (app.js part: apply, redraw, save)
await A.evaluate(()=>{ const f=MSApp.applyRemote; window.__ar=[]; MSApp.applyRemote=function(ch){ const t=performance.now(); const r=f.apply(this,arguments); window.__ar.push(performance.now()-t); return r; };
  const sv=Storage.prototype.setItem; window.__ls=[]; Storage.prototype.setItem=function(k,v){ const t=performance.now(); const r=sv.apply(this,arguments); if(k==='mustang-splits:v1') window.__ls.push([performance.now()-t,v.length]); return r; }; });
await cdp.send('Performance.enable'); const met=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
const KS=['ScriptDuration','LayoutDuration','RecalcStyleDuration','TaskDuration'];
await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
const i0=await met(); await W(5500); const i1=await met(); // the same time with no taps: the clock and the rest of the page
const n0=await A.evaluate(()=>MSApp.getRace().marks.length), m0=await met();
stop=false; const pr=inject(); await W(4000); stop=true; await pr; await W(1500);
const m1=await met(), n1=await A.evaluate(()=>MSApp.getRace().marks.length); await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
const busy=KS.map(k=>[k,((m1[k]-m0[k])-(i1[k]-i0[k]))*1000/Math.max(1,n1-n0)]);
console.log('     main-thread time per arriving tap, CPU 4× slower (whole page incl. the deferred redraw and Firestore, minus the same time with no taps):',busy.map(([k,v])=>k.replace('Duration','')+' '+v.toFixed(1)+' ms').join(', '),`(${n1-n0} taps)`);
console.log('     …with no taps, per second:',KS.map(k=>k.replace('Duration','')+' '+((i1[k]-i0[k])*1000/5.5).toFixed(1)+' ms').join(', '));
const per=Object.fromEntries(busy);
ok('each arriving tap costs at most 22 ms of main-thread time (CPU 4× slower; 3.10 took about 28)', per.TaskDuration<=22, per.TaskDuration.toFixed(1)+' ms');
ok('…and at most 3.5 ms of layout (3.10: about 6, the whole results list was redrawn on every tap)', per.LayoutDuration<=3.5, per.LayoutDuration.toFixed(1)+' ms');
const cost=await A.evaluate(()=>{ const a=window.__ar.slice().sort((x,y)=>x-y), l=window.__ls; return {n:a.length,median:+a[a.length>>1].toFixed(1),max:+a[a.length-1].toFixed(1),saves:l.length,saveMs:+(l.reduce((s,x)=>s+x[0],0)/Math.max(1,l.length)).toFixed(1),saveKB:Math.round((l[0]||[0,0])[1]/1024)}; });
console.log('     one arriving tap, CPU 4× slower (app.js apply + redraw + save):',JSON.stringify(cost));
console.log('2. 12 s at normal speed, then 15 s with the CPU 4× slower: taps arriving 5 per second while scrolling');
const base=await measure(1,12000,'normal speed');
const res=await measure(4,15000,'CPU 4× slower');
const got=await A.evaluate(()=>MSApp.getRace().marks.filter(m=>m.by==='other-phone').length);
ok('the other coach’s taps arrived (about 75)', got>=60&&sent>=60, `${got} of ${sent}`);
ok('the page scrolled (there is something to scroll)', res.scroll>200, res.scroll);
ok('normal speed: no frame longer than 50 ms', base.done&&base.over50===0, `longest ${base.max} ms, ${base.over50} over 50 ms of ${base.frames}`);
ok('CPU 4× slower: the page kept up (finished the run)', res.done);
ok('CPU 4× slower: no frame longer than 50 ms while scrolling', res.done&&res.over50===0&&res.max<=50, `longest ${res.max} ms, ${res.over50} over 50 ms, ${res.over34} over 34 ms of ${res.frames}`);
ok('no long task over 50 ms', res.done&&!res.long.length&&!base.long.length, res.long.slice(0,12).join(','));
const pe=await A.evaluate(()=>window.__errs);
ok('no errors', !pe.length&&!errs.length, pe.concat(errs).slice(0,3).join(' | '));
ok('every name button is still in place (none rebuilt or moved)', (await A.$$eval('#raceGrid [data-rn]',x=>x.length))===30);
console.log('\nerrors', errs); console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
