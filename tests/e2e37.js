// 3.9: the Workouts tab is "Training" everywhere; six training types with 5–7 established high school sessions each
// (aerobic base, threshold/CV, VO2max, speed/repetition, race sharpening, recovery/pre-meet), every one effort-based so
// each runner gets their own Daniels VDOT / CV targets, with a short "why", sensible volume (adjustable reps and rest);
// schedule-aware suggestions kept; favorites (save my own workouts, at the top of the tab). Fake names only.
const puppeteer=require('puppeteer-core'), T=require('./tools/fake-team.js');
const URL=process.env.URL||'http://localhost:8765/';
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const P=await T.open(b,{url:URL,now:'2026-10-13T15:30:00'}); const ev=(f,...a)=>P.evaluate(f,...a);
await T.load(P); await ev(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=workouts]').click(); window.scrollTo(0,0); }); await W(500);

console.log('1. "Training" everywhere');
ok('tab bar says Training', await ev(()=>document.querySelector('.tab[data-tab=workouts]').textContent.trim()==='Training'));
ok('the large title says Training', await ev(()=>document.querySelector('#navTitle').textContent.trim()==='Training'));
ok('no "Workouts" label left on screen or in Settings', await ev(()=>{ document.querySelector('#openSettings').click(); const t=document.body.innerText; document.querySelector('#overlay').hidden=true; return !/\bWorkouts\b/.test(t); }));
ok('Settings: “Training and paces”', await ev(()=>{ document.querySelector('#openSettings').click(); const r=/Training and paces/.test(document.querySelector('#modal').textContent); document.querySelector('#overlay').hidden=true; return r; }));

console.log('2. six training types, 5–7 options each');
const goals=await ev(()=>[...document.querySelectorAll('[data-goal-pick]')].map(b=>b.querySelector('b').textContent));
ok('Aerobic base, Threshold / CV, VO2max, Speed / repetition, Race sharpening, Recovery / pre-meet', goals.join('|')==='Aerobic base|Threshold / CV|VO2max|Speed / repetition|Race sharpening|Recovery / pre-meet', goals.join('|'));
const lib={};
for(const k of ['base','threshold','speed','rep','sharpen','recovery']){
  await ev(k=>document.querySelector(`[data-goal-pick="${k}"]`).click(),k); await W(150);
  await ev(()=>{ const a=document.querySelector('[data-x=suggall]'); if(a) a.click(); }); await W(150);
  lib[k]=await ev(()=>[...document.querySelectorAll('.sugg')].map(x=>({id:x.dataset.tpl,name:x.querySelector('h3').textContent,why:(x.querySelector('.sugg-whyt')||{}).textContent||'',vol:(x.querySelector('.sugg-paces')||{}).textContent||''})));
}
ok('5–7 options per type', Object.values(lib).every(L=>L.length>=5&&L.length<=7), Object.entries(lib).map(([k,L])=>k+':'+L.length).join(' '));
ok('each option has a short why', Object.values(lib).flat().every(x=>x.why.length>15&&x.why.length<110));
const names=k=>lib[k].map(x=>x.name).join(' | ');
ok('aerobic base: easy run, long run, progression, steady fartlek, hill strides', ['Easy run','Long run','Progression','fartlek','Hill strides'].every(w=>names('base').includes(w)), names('base'));
ok('threshold/CV: CV 5×1000, 6×800, 4×1600, tempo, cruise intervals, broken tempo, CV ladder', ['5 × 1000 at CV','6 × 800 at CV','4 × 1600 at CV','Tempo','Cruise','Broken tempo','CV ladder'].every(w=>names('threshold').includes(w)), names('threshold'));
ok('VO2max: 1000s, 800s, 1200s, 400s, long hills, 30-30s', ['1000 at interval','800 at interval','1200 at interval','400 at interval','hill','30-30'].every(w=>names('speed').includes(w)), names('speed'));
ok('speed: 200s, 300s, 400s at mile pace, strides, flying 100s, hill sprints', ['200','300','400 at mile pace','Strides','Flying 100s','hill sprints'].every(w=>names('rep').includes(w)), names('rep'));
ok('sharpening: goal-pace miles, cutdowns, race-pace 1000s, 600s at 5K pace', ['Goal-pace miles','Cutdown','Race-pace 1000s','600 at 5K pace'].every(w=>names('sharpen').includes(w)), names('sharpen'));
ok('recovery/pre-meet: shakeout with strides, easy short run, relaxed 200s', ['shakeout','Easy short run','Relaxed 200s'].every(w=>names('recovery').includes(w)), names('recovery'));
ok('every option shows its volume', Object.values(lib).flat().every(x=>/\d(\.\d)? k?m (at pace|easy)/.test(x.vol)));
// sensible volume: interval work 4–5 km, repetition ≤ 2.5 km, CV/threshold ≤ 6.5 km at pace (the templates' defaults)
const vol=await ev(()=>MSApp.tplVolumes());
ok('VO2max sessions 2.4–5 km at pace (hills and 30-30s shorter)', vol.filter(v=>v.goal==='speed').every(v=>v.at>=2400&&v.at<=5000), JSON.stringify(vol.filter(v=>v.goal==='speed').map(v=>v.at)));
ok('repetition sessions at most 2.5 km', vol.filter(v=>v.goal==='rep').every(v=>v.at<=2500));
ok('threshold / CV at most 6.5 km at pace', vol.filter(v=>v.goal==='threshold').every(v=>v.at<=6500));
ok('every part is effort-based (each runner’s own pace)', vol.every(v=>v.effort));
ok('every older template id still exists (saved workouts carry them)', await ev(()=>['cv5x1000','t20','t3xmile','i6x800','i5x1000','i12x400','r8x200','r3xmile5k','hills8','b6k','bprog','rec5k','rec4k','pre3k','pre2x400','long12','long10t'].every(id=>MSApp.tplIds().includes(id))));

console.log('3. schedule-aware, adjustable, individual paces');
await ev(()=>{ document.querySelector('#overlay').hidden=true; }); await P.evaluate(()=>{ window.__go=k=>document.querySelector(`[data-goal-pick="${k}"]`).click(); });
const sug=await ev(()=>[...document.querySelectorAll('[data-goal-pick]')].filter(b=>b.querySelector('small').textContent==='Suggested today').map(b=>b.dataset.goalPick));
ok('the schedule still suggests a type (3 days before NEC: Threshold / CV)', sug.join()==='threshold', sug.join());
await ev(()=>window.__go('speed')); await W(150);
ok('hard sessions near a meet are flagged (VO2max 3 days out is fine; reasons from the schedule)', await ev(()=>[...document.querySelectorAll('.sugg .sugg-why')].some(x=>/days until NEC/.test(x.textContent))));
await ev(()=>document.querySelector('[data-tpl-use="i6x800"]').click()); await W(400);
ok('the sheet shows why, the paces and the volume', await ev(()=>/Why:/.test(document.querySelector('#modal').textContent)&&/4\.8 km at pace/.test(document.querySelector('#tplVol').textContent)));
await ev(()=>document.querySelector('#modal [data-step="-1"]').click()); await W(150);
ok('reps adjust and the volume follows (5 × 800 = 4 km)', await ev(()=>/^4 km at pace/.test(document.querySelector('#tplVol').textContent)), await ev(()=>document.querySelector('#tplVol').textContent));
await ev(()=>document.querySelector('#modal [data-x=runners]').click()); await W(500);
await ev(()=>{ const b=document.querySelector('#modal [data-pk=G]'); if(b) b.click(); }); await W(200);
await ev(()=>{ const n=[...document.querySelectorAll('#modal button')].find(x=>/^Next|Continue/.test(x.textContent.trim())); if(n) n.click(); }); await W(500);
ok('each runner gets their own target from VDOT', await ev(()=>{ const t=document.querySelector('#modal').innerText; const ts=t.match(/\d:\d\d(\.\d)?/g)||[]; return new Set(ts).size>=3; }));
await ev(()=>{ document.querySelector('#overlay').hidden=true; }); await W(100);

console.log('4. favorites');
await ev(()=>{ document.querySelector('.tab[data-tab=workouts]').click(); window.__go('base'); }); await W(200);
await ev(()=>document.querySelector('[data-tpl-use="b6k"]').click()); await W(300);
await ev(()=>document.querySelector('#modal [data-x=fav]').click()); await W(400);
ok('☆ Save to favorites: saved and listed under ★ Favorites at the top of the tab', await ev(()=>{ const f=document.querySelector('#wkFavs'); return !f.hidden&&/Favorites/.test(f.textContent)&&/Easy run 6 km/.test(f.textContent)&&!!(f.compareDocumentPosition(document.querySelector('#wkToday'))&Node.DOCUMENT_POSITION_FOLLOWING); }));
const own=await ev(()=>{ const id=MSApp.getWorkouts().find(w=>!/Easy run 6 km/.test(w.name)); return id&&id.id; });
await ev(id=>document.querySelector(`#wkList .wk[data-id="${id}"] [data-w=fav]`).click(),own); await W(300);
ok('my own workout: Favorite (swipe action) adds it with a ★', await ev(id=>!!document.querySelector(`#wkFavs .wk[data-id="${id}"] .fav-star`),own));
await ev(id=>document.querySelector(`#wkFavs .wk[data-id="${id}"] .sw-front`).click(),own); await W(300);
ok('tapping it offers Remove from favorites', await ev(()=>/Remove from favorites/.test(document.querySelector('#modal').textContent)));
await ev(()=>[...document.querySelectorAll('#modal button')].find(x=>/Remove from favorites/.test(x.textContent)).click()); await W(300);
ok('…and it goes back to the list', await ev(id=>!document.querySelector(`#wkFavs .wk[data-id="${id}"]`)&&!!document.querySelector(`#wkList .wk[data-id="${id}"]`),own));
ok('favorites stay after a reload (this phone)', await (async()=>{ await P.reload(); await P.waitForFunction(()=>window.MSApp); await W(800); return ev(()=>{ document.querySelector('.tab[data-tab=workouts]').click(); return /Easy run 6 km/.test(document.querySelector('#wkFavs').textContent); }); })());
ok('a saved suggestion is a plain workout (no new top-level fields)', await ev(()=>MSApp.getWorkouts().every(w=>Object.keys(w).every(k=>['id','name','reps','rest','restUnit','segments'].includes(k)))));
ok('no page errors', !P.errs.length, P.errs.join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0); })().catch(e=>{ console.log('CRASH',e); process.exit(1); });
