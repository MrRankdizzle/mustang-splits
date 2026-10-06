const puppeteer=require('puppeteer-core');
const URL='http://localhost:8765/?emu', PW='gravel otter lantern 44';
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra?'  ['+extra+']':'')); };
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:200},arg); return true; }catch(e){ return false; } };
async function phone(tag,seed){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage(); await p.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('mustang-splits:tour','1'); }catch(e){} });  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(tag+': '+e.message));
  if(seed) await p.evaluateOnNewDocument(s=>{ if(!sessionStorage.getItem('seeded')){ sessionStorage.setItem('seeded','1'); localStorage.setItem('mustang-splits:v1',s); } },seed);
  await p.goto(URL); await p.waitForFunction(()=>window.MSApp&&document.querySelector('.watch')); return p; }
const saved=p=>p.evaluate(()=>new Promise(r=>setTimeout(()=>r(JSON.parse(localStorage.getItem('mustang-splits:v1'))),400)));
const card=(p,i=0)=>p.evaluate(i=>{ const c=document.querySelectorAll('.watch')[i]; return {cls:c.className, next:(c.querySelector('[data-r=next]')||{}).textContent||'', sub:c.querySelector('[data-r=sub]').textContent}; },i);
const firstCard=async(p,sel)=>(await p.$$('.watch:not(.gone)'))[0].$(sel);
// Edit the target of workout `name` in the Workouts editor with the microwave field.
async function editTarget(p,name,digits){
  await p.click('.tab[data-tab=workouts]'); await W();
  for(const c of await p.$$('.wk')){ if(await c.$eval('.wk-name',x=>x.textContent)===name){ await c.$eval('[data-w=edit]',b=>b.click()); break; } }
  await W(1200); await p.$eval('[data-sf=value]',i=>{ i.focus(); i.select(); }); await p.keyboard.press('Backspace'); await p.keyboard.type(digits); await p.click('[data-wf=name]'); await W(400); await p.$eval('#wkEditor [data-w=close]',b=>b.click()); await W(); // 3.0: the editor is a sheet
  await p.click('.tab[data-tab=watches]'); await W();
}
const W8='800 @ 2:24 (400 splits)';

console.log('1. local edit + reload mid-run');
const A=await phone('A');
await (await firstCard(A,'[data-act=start]')).click(); await W();
ok('running on the 800 plan', (await card(A)).next.includes('400m')&&(await card(A)).next.includes('1:12'), (await card(A)).next);
await editTarget(A,W8,'200');   // 800 in 2:00 now
ok('workout edited to 2:00', await A.evaluate(n=>MSApp.getWorkouts().find(w=>w.name===n).segments[0].value,W8)==='2:00');
ok('running card keeps 1:12 at 400m', (await card(A)).next.includes('1:12'), (await card(A)).next);
await (await firstCard(A,'[data-act=split]')).click(); await W();
let s=await saved(A); ok('split 1 compared to old plan (exp 72)', s.watches[0].run.splits[0].exp===72, s.watches[0].run.splits[0].exp);
ok('plan copy saved on the stopwatch', !!s.watches[0].plan && s.watches[0].plan.repTime===144);
await A.reload(); await A.waitForFunction(()=>window.MSApp&&document.querySelector('.watch')); await W(500);
ok('after reload: still old plan (800m due 2:24)', (await card(A)).next.includes('2:24'), (await card(A)).next);
await (await firstCard(A,'[data-act=split]')).click(); await W();
s=await saved(A); ok('split 2 after reload uses old plan (exp 144), run finished', s.watches[0].run.splits[1].exp===144 && s.watches[0].status==='done', s.watches[0].status);
ok('Results show the plan it ran', await A.evaluate(()=>{ document.querySelector('.tab[data-tab=results]').click(); return document.querySelector('#resGrid').textContent.includes('2:24'); }));
await A.click('.tab[data-tab=watches]'); await W();
await A.evaluate(()=>{ const c=document.querySelector('.watch'); c.querySelector('[data-act=menu]').click(); document.querySelector('[data-m=reset]').click(); }); await W(); if(await A.$('[data-x=yes]')){ await A.click('[data-x=yes]'); await W(); }
ok('after reset: new plan (400m at 1:00)', (await card(A)).next.includes('1:00'), (await card(A)).next);
s=await saved(A); ok('reset cleared the plan copy', s.watches[0].plan===null);

console.log('2. upgrade: a 2.0.0 save with a clock already running (no plan copy)');
const now=Date.now();
const seed=JSON.stringify({v:1,settings:{tol:1,compact:false,sound:false,wake:false,liveLog:true},roster:[],
  workouts:[{id:'wk',name:'Mile',reps:1,rest:'',segments:[{id:'s',effort:'race',dist:1609,mode:'total',value:'6:00',cp:400}]}],
  watches:[{id:'r1',name:'Runner',workoutId:'wk',status:'running',startAt:now-30000,pausedT:0,athleteIds:[],athleteNames:[],autoName:null,run:{rep:0,repStartT:0,cp:0,phase:'run',restEndT:0,splits:[],laps:[]}}]});
const U=await phone('U',seed); await W(500);
ok('running card still shows its plan', (await card(U)).next.includes('400m'), (await card(U)).next);
await (await firstCard(U,'[data-act=split]')).click(); await W();
s=await saved(U); ok('migrate() gave it a plan copy', !!(s.watches[0].plan&&s.watches[0].plan.ok) && s.watches[0].plan.repTime===360);

console.log('3. remote edit from another coach + reload mid-run');
const T1=await phone('T1'), T2=await phone('T2');
const form=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [x,v] of vals) await p.$eval(x,(i,v)=>i.value=v,v); await p.click('[data-x=yes]'); };
await form(T1,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1','admin secret phrase 9']]); await waitFor(T1,()=>document.querySelector('[data-x=mine]')); await T1.click('[data-x=mine]'); await W(2000);
await form(T2,'#tmJoin',[['#tmPw1',PW]]); await waitFor(T2,()=>document.querySelector('[data-x=mine]')); await T2.click('[data-x=team]'); await W(2000);
await (await firstCard(T1,'[data-act=start]')).click(); await W();
await editTarget(T2,W8,'150');  // other coach: 800 in 1:50
ok('T1 receives the edit', await waitFor(T1,n=>MSApp.getWorkouts().find(w=>w.name===n)?.segments[0].value==='1:50',W8));
ok('T1 running card unchanged (1:12)', (await card(T1)).next.includes('1:12'), (await card(T1)).next);
await T1.click('#newBtn'); await W(); await T1.click('[data-new=workout]'); await W(); await T1.click('[data-x=next]'); await W(); await T1.click('[data-wk=""]'); await W(); await T1.click('[data-x=later]'); await W();
const wid=await T1.evaluate(n=>MSApp.getWorkouts().find(w=>w.name===n).id,W8);
await T1.evaluate(id=>{ const c=[...document.querySelectorAll('.watch')].pop(); c.querySelector('[data-act=menu]').click(); document.querySelector('[data-m=plan]').click(); document.querySelector('[data-wk="'+id+'"]').click(); },wid); await W();
ok('an idle card on the same workout uses the new version (400m at 0:55)', (await card(T1,3)).next.includes('0:55'), (await card(T1,3)).next);
await T1.evaluate(()=>{ const c=document.querySelectorAll('.watch')[3]; c.querySelector('[data-act=menu]').click(); document.querySelector('[data-m=del]').click(); }); await W();
await T1.reload(); await T1.waitForFunction(()=>window.MSApp&&document.querySelector('.watch')); await W(1500);
ok('after reload mid-run: still 1:12', (await card(T1)).next.includes('1:12'), (await card(T1)).next);
await (await firstCard(T1,'[data-act=split]')).click(); await W();
s=await saved(T1); ok('split after reload uses old plan (exp 72)', s.watches[0].run.splits[0].exp===72);
ok('T1 workout list has the new version', await T1.evaluate(n=>MSApp.getWorkouts().find(w=>w.name===n).segments[0].value,W8)==='1:50');

console.log('4. Clear track: stopped stopwatch-only cards with laps');
// card 3 (Group B) is stopwatch-only; card 2 (Group A) runs a workout and gets stopped
const cards=await T1.$$('.watch:not(.gone)');
await cards[2].$eval('[data-act=start]',b=>b.click()); await W(300);
for(let i=0;i<3;i++){ await (await T1.$$('.watch:not(.gone)'))[2].$eval('[data-act=split]',b=>b.click()); await W(250); }
await T1.evaluate(()=>{ const c=document.querySelectorAll('.watch')[2]; c.querySelector('[data-act=menu]').click(); document.querySelector('[data-m=stop]').click(); }); await W();
await (await T1.$$('.watch:not(.gone)'))[1].$eval('[data-act=start]',b=>b.click()); await W(300);
await T1.evaluate(()=>{ const c=document.querySelectorAll('.watch')[1]; c.querySelector('[data-act=menu]').click(); document.querySelector('[data-m=stop]').click(); }); await W();
const st=await T1.$$eval('.watch',c=>c.map(x=>x.querySelector('.w-name').textContent+':'+x.className.split(' ')[1]));
ok('setup: running 800, paused workout card, paused stopwatch-only', st.join()==='Athlete 1:st-running,Group A:st-paused,Group B:st-paused', st.join());
await T1.click('#openSettings'); await W(); await T1.click('#clearTrack'); await W();
const conf=await T1.$eval('#modal',m=>m.innerText.replace(/\n+/g,' / '));
ok('confirm lists the stopped stopwatch', conf.includes('Stopped and saved: Group B (3 laps)'), conf);
await T1.click('[data-x=yes]'); await W(600);
const left=await T1.$$eval('.watch',c=>c.map(x=>x.querySelector('.w-name').textContent));
ok('Group B cleared; running and stopped workout stay', left.join()==='Athlete 1,Group A', left.join());
await T2.click('.tab[data-tab=results]');
ok('T2 history has Group B laps', await waitFor(T2,()=>{ const t=document.querySelector('#practiceList')?.textContent||''; return t.includes('Group B'); }));
await T2.click('#practiceList summary'); await W();
ok('history shows 3 laps', await T2.$eval('#practiceList details',d=>[...d.querySelectorAll('tbody tr')].length)===3);

console.log('\nerrors', errs); console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
