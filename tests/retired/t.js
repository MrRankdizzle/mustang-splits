const puppeteer=require('puppeteer-core');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const p=await b.newPage(); await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
// old save without liveLog / units
await p.evaluateOnNewDocument(()=>{ if(sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1'); localStorage.clear(); localStorage.setItem('mustang-splits:v1',JSON.stringify({v:1,settings:{tol:1,compact:false,sound:false,wake:false},
 workouts:[{id:'w1',name:'Old',reps:3,rest:'90',segments:[{id:'s1',effort:'race',dist:800,mode:'total',value:'2:24',cp:400}]}],
 watches:[{id:'a',name:'A',workoutId:'w1',status:'idle',startAt:0,pausedT:0,run:{rep:0,repStartT:0,cp:0,phase:'run',restEndT:0,splits:[],laps:[]}},
          {id:'b',name:'B',workoutId:null,status:'idle',startAt:0,pausedT:0,run:{rep:0,repStartT:0,cp:0,phase:'run',restEndT:0,splits:[],laps:[]}}]}))});
await p.goto('http://localhost:8765/');
console.log('in-app liveLog:',await p.evaluate(()=>document.querySelectorAll('.watch').length));

const tap=async s=>{await p.click(s); await new Promise(r=>setTimeout(r,120));};
// stopwatch-only laps
await tap('[data-id=b] [data-act=start]'); await tap('[data-id=b] [data-act=split]'); await tap('[data-id=b] [data-act=split]'); await tap('[data-id=b] [data-act=split]');
console.log('B log open:',await p.$eval('[data-id=b] details.log',d=>d.open),'first row lap#:',await p.$eval('[data-id=b] tbody tr td',td=>td.textContent));
// collapse then another lap
await tap('[data-id=b] summary'); await tap('[data-id=b] [data-act=split]');
console.log('B after collapse+lap open:',await p.$eval('[data-id=b] details.log',d=>d.open));
// workout splits
await tap('[data-id=a] [data-act=start]'); await tap('[data-id=a] [data-act=split]'); await tap('[data-id=a] [data-act=split]');
console.log('A open:',await p.$eval('[data-id=a] details.log',d=>d.open),'rows:',await p.$$eval('[data-id=a] tbody tr',r=>r.map(x=>x.textContent).join(' | ')));
// compact
await p.evaluate(()=>document.body.classList.add('compact'));
console.log('compact visible headers A:',await p.$$eval('[data-id=a] th',t=>t.filter(x=>getComputedStyle(x).display!=='none').map(x=>x.textContent)),
  'B:',await p.$$eval('[data-id=b] th',t=>t.filter(x=>getComputedStyle(x).display!=='none').map(x=>x.textContent)),
  'summary h:',await p.$eval('[data-id=b] summary',s=>s.getBoundingClientRect().height));
await tap('[data-id=b] summary'); console.log('B re-open by tap in compact:',await p.$eval('[data-id=b] details.log',d=>d.open));
await p.screenshot({path:process.argv[2]+'/compact.png'});
// editor
await tap('.tab[data-tab=workouts]'); await tap('.wk [data-w=edit]');
const f='[data-sf=value]';
console.log('old target shown:',await p.$eval(f,i=>i.value),'rest shown:',await p.$eval('[data-wf=rest]',i=>i.value),'inputmode:',await p.$eval(f,i=>i.inputMode));
await p.click(f,{clickCount:3}); await p.keyboard.press('Backspace');
for(const k of '1130'){ await p.keyboard.type(k); process.stdout.write(await p.$eval(f,i=>i.value)+' '); }
await p.keyboard.press('Backspace'); console.log('| bksp ->',await p.$eval(f,i=>i.value));
await p.click(f,{clickCount:3}); await p.keyboard.type('72'); await p.$eval('[data-wf=name]',i=>i.focus());
console.log('0:72 blur ->',await p.$eval(f,i=>i.value),'stored:',await p.evaluate(()=>new Promise(r=>setTimeout(()=>r(JSON.parse(localStorage.getItem('mustang-splits:v1')).workouts[0].segments[0].value),400))));
await tap('.seg [data-tu=sec]');
console.log('toggle sec ->',await p.$eval(f,i=>i.value),await p.$eval(f,i=>i.inputMode),'calc:',await p.$eval('[data-calc]',c=>c.textContent));
await p.click(f,{clickCount:3}); await p.keyboard.type('32.55x'); console.log('sec typed 32.55x ->',await p.$eval(f,i=>i.value));
await tap('.seg [data-tu=mss]'); console.log('back to mss ->',await p.$eval(f,i=>i.value));
await p.focus(f); await p.keyboard.press('Backspace'); console.log('bksp drops tenths ->',await p.$eval(f,i=>i.value));
await tap('.ed-row [data-tu=sec]'); console.log('rest to sec ->',await p.$eval('[data-wf=rest]',i=>i.value));
await new Promise(r=>setTimeout(r,400));
const wk=await p.evaluate(()=>JSON.parse(localStorage.getItem('mustang-splits:v1')).workouts[0]);
console.log('stored units:',wk.segments[0].timeUnit,wk.restUnit,'values:',wk.segments[0].value,wk.rest);
const hs=await p.$$eval('.tf-unit button',bs=>bs.map(b=>Math.round(b.getBoundingClientRect().height)));
console.log('toggle heights',hs,'input font',await p.$eval(f,i=>getComputedStyle(i).fontSize));
await p.screenshot({path:process.argv[2]+'/editor.png',fullPage:true});
console.log('errors:',errs);
await b.close();
})();
