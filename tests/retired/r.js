const puppeteer=require('puppeteer-core'); const OUT=process.argv[2];
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const p=await b.newPage(); await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.evaluateOnNewDocument(()=>{ if(sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1'); localStorage.clear();
 localStorage.setItem('mustang-splits:v1',JSON.stringify({v:1,settings:{tol:1,compact:false,sound:false,wake:false,liveLog:true},
 workouts:[{id:'w1',name:'800 @ 2:24',reps:1,rest:'',segments:[{id:'s1',effort:'race',dist:800,mode:'total',value:'2:24',cp:400}]}],
 watches:[{id:'old',name:'Old card',workoutId:null,status:'idle',startAt:0,pausedT:0,run:{rep:0,repStartT:0,cp:0,phase:'run',restEndT:0,splits:[],laps:[]}}]}))});
const W=ms=>new Promise(r=>setTimeout(r,ms||150));
const tap=async s=>{await p.click(s); await W();};
const toastTxt=()=>p.$eval('#toast',t=>t.hidden?'':t.textContent);
const S=()=>p.evaluate(()=>new Promise(r=>setTimeout(()=>r(JSON.parse(localStorage.getItem('mustang-splits:v1'))),300)));
await p.goto('http://localhost:8765/');
let st=await S(); console.log('migrated roster:',JSON.stringify(st.roster),'athleteIds:',JSON.stringify(st.watches[0].athleteIds));
console.log('tabs:',await p.$$eval('.tab',t=>t.map(x=>x.textContent.trim())));
// Team: paste
await tap('.tab[data-tab=team]'); await tap('#pasteAth');
await p.$eval('#pasteTxt',t=>t.value='Maya, Varsity\nJonah, Varsity\nSam\tJV\nAli, Pace group 10\nBo, Pace group 2\nCy\nMaya, Varsity\n\n');
await tap('[data-x=yes]'); console.log('paste toast:',await toastTxt());
console.log('groups:',await p.$$eval('.team-gh .g',g=>g.map(x=>x.textContent)));
// rename group JV -> JV Boys
const jv=await p.$$('.team-gh'); await jv[0].click(); await W(); await p.$eval('#grpName',i=>i.value='JV Boys'); await tap('[data-x=yes]');
console.log('after rename:',await p.$$eval('.team-gh .g',g=>g.map(x=>x.textContent)));
await p.screenshot({path:OUT+'/team.png'});
// Bench: group heading Varsity -> group stopwatch
await tap('.tab[data-tab=watches]'); await tap('#bench');
const heads=await p.$$eval('.bench-gh',h=>h.map(x=>x.textContent)); console.log('bench heads:',heads);
await tap('.bench-gh[data-gi="3"]'); // Varsity? check
console.log('selected:',await p.$$eval('.chip-a[aria-pressed=true] .nm',c=>c.map(x=>x.textContent)), 'each btn:',await p.$eval('[data-x=each]',b=>b.textContent));
await p.select('#benchWk','w1'); await tap('[data-x=group]'); console.log('group toast:',await toastTxt());
console.log('cards:',await p.$$eval('.watch',c=>c.map(x=>x.querySelector('.w-name').value+' | '+(x.querySelector('.members')?.textContent||''))));
// Bench again: Varsity busy
await tap('#bench');
console.log('busy chips:',await p.$$eval('.chip-a.busy',c=>c.map(x=>x.textContent)));
await tap('.chip-a.busy'); console.log('busy toast:',await toastTxt());
await p.screenshot({path:OUT+'/bench.png'});
// select Sam and Bo individually -> each
const pick=async n=>{ const hs=await p.$$('.chip-a'); for(const h of hs){ if((await h.evaluate(x=>x.querySelector('.nm').textContent))===n){ await h.click(); await W(); } } };
await pick('Sam'); await pick('Bo'); await tap('[data-x=each]'); console.log('each toast:',await toastTxt());
// edit members on the "Old card" (idle, unlinked)
const oldBtn=await p.$('[data-id=old] .members'); console.log('old card line:',await oldBtn.evaluate(x=>x.textContent));
await oldBtn.click(); await W(); await pick('Cy'); await pick('Ali'); await tap('[data-x=save]');
console.log('old card after save:',await p.$eval('[data-id=old] .w-name',i=>i.value),'|',await p.$eval('[data-id=old] .members',x=>x.textContent));
// delete Ali from team, then check card keeps name, open members sheet shows ghost
await tap('.tab[data-tab=team]');
const rows=await p.$$('.ath'); for(const r of rows){ if(await r.$eval('[data-af=name]',i=>i.value)==='Ali'){ await (await r.$('[data-t=del]')).click(); await W(); await tap('[data-x=yes]'); } }
// rename Cy -> Cyrus (idle card should follow)
const rows2=await p.$$('.ath'); for(const r of rows2){ const i=await r.$('[data-af=name]'); if(await i.evaluate(x=>x.value)==='Cy'){ await i.click({clickCount:3}); await i.type('Cyrus'); } }
await tap('.tab[data-tab=watches]');
console.log('old card after delete+rename:',await p.$eval('[data-id=old] .w-name',i=>i.value),'|',await p.$eval('[data-id=old] .members',x=>x.textContent));
await tap('[data-id=old] .members'); console.log('ghost chips:',await p.$$eval('.chip-a[aria-pressed=true] .nm',c=>c.map(x=>x.textContent))); await tap('[data-x=no]');
// run Varsity card to done -> athletes free
const vid=(await S()).watches.find(w=>w.name==='Varsity').id;
await tap(`[data-id="${vid}"] [data-act=start]`); await tap(`[data-id="${vid}"] [data-act=split]`); await tap(`[data-id="${vid}"] [data-act=split]`);
console.log('varsity status:',await p.$eval(`[data-id="${vid}"]`,c=>c.className));
await tap('#bench'); console.log('busy after done:',await p.$$eval('.chip-a.busy .nm',c=>c.map(x=>x.textContent))); await tap('[data-x=no]');
// results
await tap('.tab[data-tab=results]');
console.log('results text:\n'+await p.$eval('#resText',t=>t.value));
// send athletes from workouts
await tap('.tab[data-tab=workouts]'); await tap('.wk [data-w=send]');
console.log('send preselect:',await p.$eval('#benchWk',s=>s.value)); await pick('Maya'); await tap('[data-x=each]');
console.log('tab after send:',await p.$eval('.tab[aria-selected=true]',t=>t.dataset.tab), await toastTxt());
// limit: add many
await p.evaluate(()=>{});
await tap('.tab[data-tab=team]'); await tap('#pasteAth');
await p.$eval('#pasteTxt',t=>t.value=Array.from({length:35},(_,i)=>'Kid '+(i+1)+', Big').join('\n')); await tap('[data-x=yes]');
await tap('.tab[data-tab=watches]'); await tap('#bench'); await tap('.bench-gh'); // Big group sorts first
console.log('room hint:',await p.$eval('[data-r=room]',x=>x.textContent)); await tap('[data-x=each]'); console.log('limit toast:',await toastTxt());
console.log('watch count:',(await S()).watches.length,'bench disabled:',await p.$eval('#bench',b=>b.disabled));
await p.screenshot({path:OUT+'/cards.png'});
// clear track
await tap('#openSettings'); await tap('#clearTrack');
console.log('confirm:',await p.$eval('#modal',m=>m.innerText.replace(/\n+/g,' / '))); await tap('[data-x=yes]');
st=await S(); console.log('after clear:',st.watches.length,'roster kept:',st.roster.length, await toastTxt());
console.log('errors:',errs);
await b.close();
})();
