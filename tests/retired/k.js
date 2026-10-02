const puppeteer=require('puppeteer-core'); const fs=require('fs'); const OUT=process.argv[2];
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const p=await b.newPage(); await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(()=>{ if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.clear(); }
  // capture downloads
  const oc=URL.createObjectURL; URL.createObjectURL=f=>{ window.__blob=f; return oc(f); };
  HTMLAnchorElement.prototype.click=function(){ window.__dl=this.download; };
});
await p.goto('http://localhost:8765/'); const W=ms=>new Promise(r=>setTimeout(r,ms||150));
console.log('status-bar meta gone:',await p.$('meta[name=apple-mobile-web-app-status-bar-style]')===null);
console.log('tabbar pb:',await p.$eval('.tabbar',t=>getComputedStyle(t).paddingBottom),'main pb:',await p.$eval('main',t=>getComputedStyle(t).paddingBottom));
// add a team member so backup has roster
await p.click('.tab[data-tab=team]'); await p.click('#pasteAth'); await W(); await p.$eval('#pasteTxt',t=>t.value='Maya, Varsity'); await p.click('[data-x=yes]'); await W(400);
// backup
await p.click('#openSettings'); await W(); await p.click('#backup'); await W(300);
const dl=await p.evaluate(async()=>({name:window.__dl,text:await window.__blob.text()}));
const bk=JSON.parse(dl.text); console.log('backup file:',dl.name,'keys:',Object.keys(bk),'state keys:',Object.keys(bk.state),'roster:',bk.state.roster.length);
fs.writeFileSync(OUT+'/backup.json',dl.text); fs.writeFileSync(OUT+'/bad.json','{"hello":1}');
await p.click('[data-x=done]'); await W();
// change state, then restore
await p.evaluate(()=>{}); await p.click('.tab[data-tab=team]'); await W(); await p.click('[data-t=del]'); await W(); await p.click('[data-x=yes]'); await W(400);
console.log('roster after delete:',await p.$eval('#teamCount',x=>x.textContent));
const fi=await p.$('#restoreFile'); await fi.uploadFile(OUT+'/bad.json'); await W(300);
console.log('bad file toast:',await p.$eval('#toast',t=>t.textContent));
await fi.uploadFile(OUT+'/backup.json'); await W(300);
console.log('confirm:',await p.$eval('#modal',m=>m.innerText.replace(/\n+/g,' / ')));
await Promise.all([p.waitForNavigation(),p.click('[data-x=yes]')]); await W(400);
console.log('after restore toast:',await p.$eval('#toast',t=>t.hidden?'':t.textContent));
await p.click('.tab[data-tab=team]'); await W(); console.log('roster after restore:',await p.$eval('#teamCount',x=>x.textContent));
// keyboard: fake visualViewport height
await p.evaluate(()=>{ Object.defineProperty(visualViewport,'height',{get:()=>innerHeight-320,configurable:true}); visualViewport.dispatchEvent(new Event('resize')); });
await W(100);
console.log('kb-open:',await p.evaluate(()=>document.body.classList.contains('kb-open')),'--kb:',await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--kb')),
  'tabbar display:',await p.$eval('.tabbar',t=>getComputedStyle(t).display),'main pb:',await p.$eval('main',t=>getComputedStyle(t).paddingBottom));
await p.click('#addAth'); await W(); console.log('overlay pb:',await p.$eval('#overlay',o=>getComputedStyle(o).paddingBottom));
console.log('dbg done:',await p.evaluate(()=>{const d=document.querySelector('#modal [data-x=no]'); const r=d.getBoundingClientRect(); const e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return JSON.stringify(r)+' top:'+(e&&e.outerHTML.slice(0,80))+' modal:'+JSON.stringify(document.querySelector('#modal').getBoundingClientRect());}));
await p.screenshot({path:'/private/tmp/claude-501/-Users-mrrankdizzle-Documents-mustang-splits/7f7ef833-a45d-4e13-bf1c-fb800c99718c/scratchpad/kb.png'});
await p.click('[data-x=no]'); await W(); console.log('dbg closed:',await p.$eval('#overlay',o=>o.hidden));
await p.evaluate(()=>{ Object.defineProperty(visualViewport,'height',{get:()=>innerHeight,configurable:true}); visualViewport.dispatchEvent(new Event('resize')); }); await W(100);
console.log('kb closed:',!(await p.evaluate(()=>document.body.classList.contains('kb-open'))));
// focusin scroll + microwave
console.log('dbg pre:',await p.$eval('.tab[data-tab=workouts]',t=>JSON.stringify(t.getBoundingClientRect())),await p.evaluate(()=>{const r=document.querySelector('.tab[data-tab=workouts]').getBoundingClientRect(); const e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return e&&e.outerHTML.slice(0,200)+' IN '+(e.closest('section,div[id],nav')||{}).id+' zpos '+getComputedStyle(e.closest('.banner,.modal,.overlay,nav,main')||e).position;}),'scrollY',await p.evaluate(()=>scrollY),'innerH',await p.evaluate(()=>innerHeight)); await p.click('.tab[data-tab=workouts]'); await W(); console.log('dbg overlay hidden:',await p.$eval('#overlay',o=>o.hidden),'tab:',await p.$eval('.tab[aria-selected=true]',t=>t.dataset.tab),'wk count:',await p.$$eval('.wk',x=>x.length),'tabbar:',await p.$eval('.tabbar',t=>getComputedStyle(t).display)); await p.click('.wk [data-w=edit]'); await W();
console.log('pointer coarse:',await p.evaluate(()=>matchMedia('(pointer: coarse)').matches));
await p.evaluate(()=>window.scrollTo(0,0)); const f='[data-sf=value]';
await p.click(f,{clickCount:3}); await p.keyboard.press('Backspace'); await p.keyboard.type('224'); await W(400);
const r=await p.$eval(f,i=>{const b=i.getBoundingClientRect(); return {v:i.value, mid:Math.round(b.top+b.height/2), vh:innerHeight};});
console.log('microwave:',r.v,'field centered y:',r.mid,'of',r.vh);
// stop guard
await p.click('.tab[data-tab=watches]'); await W(); await p.click('.watch [data-act=start]'); await W();
await p.click('.watch [data-act=stop]'); await W(); console.log('after 1 tap:',await p.$eval('.watch',c=>c.className));
await p.click('.watch [data-act=stop]'); await W(); console.log('after 2 taps:',await p.$eval('.watch',c=>c.className));
console.log('errors',errs); await b.close(); })();
