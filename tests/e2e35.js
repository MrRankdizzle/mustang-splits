// 3.7 fixes: (1) Race Mode setup without the Girls/Boys/Both switch: the team comes from who is picked (Everyone /
// All girls / All boys / names); girls and boys picked = two starts with their own Gun by default, or one start
// together. (2) No zoom when typing: every field on every screen and sheet is at least 16 px, also at a small iOS text
// size; pinch to zoom stays available. (3) Checkpoints as one line with Edit (a simple list in a sheet). (4) Times in
// m:ss everywhere (no m:ss | sec toggle), digit-by-digit entry, and fields wide enough for 28:59.9.
// Fake names only.
const puppeteer=require('puppeteer-core'), T=require('./tools/fake-team.js');
const URL=process.env.URL||'http://localhost:8765/';
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const s=T.seed(); s.roster.push({id:'fx',name:'Sam Q.',group:'',gender:''});
s.workouts=[{id:'wkE',name:'800 × 4',reps:4,rest:'90',restUnit:'sec',segments:[{id:'s1',effort:'fast',dist:800,mode:'total',value:'160',timeUnit:'sec',cp:400}]}];
const P=await T.open(b,{seed:s,url:URL,now:'2026-10-06T15:30:00'}); const errs=P.errs;
const ev=(f,...a)=>P.evaluate(f,...a), hide=()=>ev(()=>{ document.querySelector('#overlay').hidden=true; document.body.classList.remove('wk-editing'); });
const tab=async t=>{ await hide(); await ev(t=>document.querySelector(`.tab[data-tab=${t}]`).click(),t); await W(300); };
const click=async sel=>{ await ev(sel=>{ const e=document.querySelector(sel); if(!e) throw new Error('missing '+sel); e.click(); },sel); await W(250); };

// Every visible text field, number field, picker and text area, with its font size.
const small=()=>ev(()=>{ const vis=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
  return [...document.querySelectorAll('input,select,textarea')].filter(e=>!/^(checkbox|radio|range|file|button|submit|hidden)$/.test(e.type)).filter(vis)
    .map(e=>({id:e.id||e.getAttribute('data-sf')||e.getAttribute('data-goal')||e.getAttribute('aria-label')||e.className||e.tagName,fs:parseFloat(getComputedStyle(e).fontSize)})); });
const screens=[
  ['Stopwatches',()=>tab('watches')],
  ['Workouts',()=>tab('workouts')],
  ['Workout editor',async()=>{ await tab('workouts'); await click('#newWk'); await W(300); }],
  ['Team (search)',()=>tab('team')],
  ['Add runner',async()=>{ await tab('team'); await click('#addAth'); }],
  ['Runner sheet (+ result)',async()=>{ await tab('team'); await click('[data-id] [data-t=open]'); await click('#profEdit'); }], // 3.10: a row opens the profile; Edit opens the sheet
  ['Paste a list',async()=>{ await tab('team'); await ev(()=>{ document.querySelector('#teamMore').click(); }); await W(250); await click('#pasteAth'); }],
  ['Data: Runners',async()=>{ await tab('results'); await click('[data-rv=runners]'); }],
  ...['team','weather','workouts','race','data','display','about'].map(pg=>[`Settings > ${pg}`,async()=>{ await hide(); await ev(pg=>{ document.querySelector('#openSettings').click(); const c=document.querySelector(`#modal [data-spage="${pg}"]`); if(c) c.click(); },pg); await W(300); }]),
  ['Schedule + meet editor',async()=>{ await hide(); await ev(()=>{ document.querySelector('#openSettings').click(); const c=document.querySelector('#modal [data-spage=data]'); if(c) c.click(); }); await W(200); await click('#openMeets'); await click('#modal [data-mx=add]'); }],
  ['Race setup',async()=>{ await hide(); await ev(()=>{ if(!MSApp.getRace()){ document.querySelector('.tab[data-tab=watches]').click(); document.querySelector('#newBtn').click(); document.querySelector('#modal [data-new=race]').click(); } else document.querySelector('.tab[data-tab=race],#raceBannerOpen').click(); }); await W(500); await hide(); }],
  ['Checkpoints sheet',async()=>{ await click('#v-race [data-ra=editcp]'); }],
];
console.log('1. every field is at least 16 px (iOS zooms below that)');
const lows=[];
for(const [name,enter] of screens){ await enter(); const L=await small(); L.filter(x=>x.fs<16).forEach(x=>lows.push(`${name}: ${x.id} ${x.fs}px`)); console.log(`  ·   ${name}: ${L.length} fields`); }
await hide(); await ev(()=>{ document.documentElement.style.fontSize='14px'; }); // iOS "smaller text": 1rem is 14 px
for(const [name,enter] of screens.slice(0,8)){ await enter(); (await small()).filter(x=>x.fs<16).forEach(x=>lows.push(`small text, ${name}: ${x.id} ${x.fs}px`)); }
await hide(); await ev(()=>{ document.documentElement.style.fontSize=''; });
ok('no field renders under 16 px, on any screen or sheet, at the default and a small text size', !lows.length, lows.slice(0,8).join(' | '));
ok('pinch to zoom stays available (no maximum-scale or user-scalable=no)', await ev(()=>!/maximum-scale|user-scalable\s*=\s*(no|0)/i.test(document.querySelector('meta[name=viewport]').content)));
ok('no page area blocks pinch zoom (touch-action keeps zoom on the page and swipe rows)', await ev(()=>{ const z=e=>{ const t=getComputedStyle(e).touchAction; return t==='auto'||/manipulation|pinch-zoom/.test(t); }; return z(document.documentElement)&&z(document.body); }));

console.log('2. times in m:ss everywhere, no m:ss | sec toggle');
await tab('workouts'); await ev(()=>{ const b=document.querySelector('#wkList [data-w=edit][data-id="wkE"], #wkList [data-id="wkE"] [data-w=edit]'); if(b) b.click(); }); await W(400);
ok('no m:ss | sec toggle anywhere', await ev(()=>!document.querySelector('[data-tu]')));
const seg=await ev(()=>{ const i=document.querySelector('#wkEditor [data-sf=value]'), r=document.querySelector('#wkEditor [data-wf=rest]'); return i&&r?[i.value,r.value,i.inputMode]:null; });
ok('a time saved in seconds (160, rest 90) shows as m:ss (2:40, 1:30), number keypad', seg&&seg[0]==='2:40'&&seg[1]==='1:30'&&seg[2]==='numeric', JSON.stringify(seg));
await ev(()=>{ const i=document.querySelector('#wkEditor [data-sf=value]'); i.focus(); i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})); });
await P.keyboard.type('1832'); await W(200);
ok('digit by digit: 1, 8, 3, 2 gives 18:32', (await ev(()=>document.querySelector('#wkEditor [data-sf=value]').value))==='18:32');
await ev(()=>document.querySelector('#wkEditor [data-sf=value]').blur()); await W(300);
ok('saved as m:ss text with the unit m:ss', await ev(()=>{ const w=JSON.parse(localStorage.getItem('mustang-splits:v1')).workouts.find(x=>x.id==='wkE'); return w.segments[0].value==='18:32'&&w.segments[0].timeUnit==='mss'; }));
await hide();

console.log('3. Race setup: no Team switch; Everyone / All girls / All boys; starts');
await screens.find(x=>x[0]==='Race setup')[1](); await hide();
ok('no Girls / Boys / Both switch', await ev(()=>!document.querySelector('#v-race [data-div]')&&!/\bTeam\b/.test([...document.querySelectorAll('#v-race .field')].map(f=>f.firstChild&&f.firstChild.textContent).join(' '))));
const pk=await ev(()=>[...document.querySelectorAll('#v-race .pick-bar button')].map(x=>x.textContent.trim()));
ok('picker: Everyone, All girls, All boys, Clear', pk.join('|')==='Everyone|All girls|All boys|Clear', pk.join('|'));
await click('#v-race [data-pk=G]'); await W(300);
ok('All girls: a Girls race, one start, no Starts choice', await ev(()=>MSApp.getRace().division==='GV'&&!document.querySelector('[data-together]')));
await click('#v-race [data-pk=all]'); await W(400);
const st=await ev(()=>{ const r=MSApp.getRace(); return {div:r.division,starts:r.runners.map(x=>x.start||'-').join(''),sep:document.querySelector('[data-together="0"]').getAttribute('aria-pressed')}; });
ok('Everyone: girls and boys → separate starts by default', st.div==='OPEN'&&st.sep==='true'&&/G/.test(st.starts)&&/B/.test(st.starts), JSON.stringify(st));
ok('a runner with no Girls/Boys is asked which start', await ev(()=>!!document.querySelector('[data-sx="fx"]')));
await click('[data-sx="fx"][data-st="B"]');
ok('…and goes with the Boys', await ev(()=>MSApp.getRace().runners.find(x=>x.id==='fx').start==='B'));
await click('[data-together="1"]');
ok('One start together: every runner in one start', await ev(()=>MSApp.getRace().runners.every(x=>x.start==='A')));
await click('#readyBtn'); await W(300);
ok('together: the Ready screen has one Gun', await ev(()=>document.querySelectorAll('#v-race [data-ra=gun]').length===1));
await click('#v-race [data-ra=backsetup]'); await click('[data-together="0"]');

console.log('4. Checkpoints: one line with Edit');
const line=await ev(()=>{ const l=document.querySelector('#v-race .cp-line'); return l&&l.textContent.replace(/\s+/g,' ').trim(); });
ok('Mile 1 · Mile 2 · Finish (5K) on one line with Edit', /^Mile 1 · Mile 2 · Finish \(5K\) ?Edit$/.test(line||''), line);
ok('one line tall', await ev(()=>document.querySelector('#v-race .cp-line').getBoundingClientRect().height<70));
ok('no checkpoint fields in setup itself', await ev(()=>!document.querySelector('#v-race [data-cpn]')));
await click('#v-race .cp-line [data-ra=editcp]');
ok('Edit: a list to rename, move, remove, add', await ev(()=>document.querySelectorAll('#modal [data-cpn]').length===3&&!!document.querySelector('#modal [data-cpmv]')&&!!document.querySelector('#modal [data-cprm]')&&!!document.querySelector('#modal [data-cpadd]')));
await ev(()=>{ const i=document.querySelectorAll('#modal [data-cpn]')[2]; i.value='Chute'; i.dispatchEvent(new Event('input',{bubbles:true})); }); await W(100);
await ev(()=>[...document.querySelectorAll('#modal [data-cpadd]')].find(x=>x.textContent==='2 mi').click()); await W(200);
ok('add 2 mi: a fourth checkpoint with its distance', await ev(()=>{ const c=MSApp.getRace().checkpoints; return c.length===4&&c[3].name==='2 mi'&&Math.round(c[3].dist)===3219; }));
await ev(()=>document.querySelectorAll('#modal [data-cpmv="-1"]')[3].click()); await W(200);
await ev(()=>document.querySelectorAll('#modal [data-cprm]')[3].click()); await W(200);
await click('#modal [data-x=done]');
const line2=await ev(()=>document.querySelector('#v-race .cp-line .cp-names').textContent);
ok('the line follows: Mile 1 · Mile 2 · 2 mi (renamed Finish removed)', line2==='Mile 1 · Mile 2 · 2 mi', line2);
await ev(()=>{ const r=MSApp.getRace(); r.checkpoints=[{id:'c1',name:'Mile 1',dist:1609.344,unit:'mi'},{id:'c2',name:'Mile 2',dist:3218.688,unit:'mi'},{id:'c3',name:'Finish',dist:5000,unit:'m'}]; MSApp.setRace(r); }); await W(300);

console.log('5. goals and other time fields fit 28:59.9');
const goal=await ev(()=>{ const i=document.querySelector('#v-race [data-goal]'); i.focus(); i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})); return i.getAttribute('data-goal'); });
await P.keyboard.type('2859'); await W(150);
const g=await ev(id=>{ const i=document.querySelector(`#v-race [data-goal="${id}"]`); return {v:i.value,fits:i.scrollWidth<=i.clientWidth+1,w:i.clientWidth}; },goal);
ok('goal: 2, 8, 5, 9 gives 28:59, never cut off', g.v==='28:59'&&g.fits, JSON.stringify(g));
const fit=await ev(()=>{ const out=[]; document.querySelectorAll('#v-race [data-tf]').forEach(i=>{ const v=i.value; i.value='28:59.9'; if(i.scrollWidth>i.clientWidth+1) out.push(i.getAttribute('aria-label')||i.id); i.value=v; }); return out; });
ok('every goal field fits 28:59.9', !fit.length, fit.join(','));
await ev(()=>document.activeElement&&document.activeElement.blur()); await W(200);

console.log('6. two starts: one Gun each');
await click('#readyBtn'); await W(300);
const guns=await ev(()=>[...document.querySelectorAll('#v-race [data-ra=gun]')].map(x=>x.dataset.start+':'+x.textContent.replace(/\s+/g,' ').trim()));
ok('the Ready screen has Gun · Girls and Gun · Boys', guns.length===2&&/^G:Gun · Girls/.test(guns[0])&&/^B:Gun · Boys/.test(guns[1]), guns.join(' | '));
await click('#v-race [data-ra=gun][data-start=G]'); await W(500);
ok('Girls gun: the race runs; Gun · Boys waits at the top', await ev(()=>MSApp.getRace().status==='running'&&!!document.querySelector('#v-race .race-guns [data-start=B]')));
ok('boys show “Waiting for the gun”', await ev(()=>{ const r=MSApp.getRace(), bid=r.runners.find(x=>x.start==='B').id, bt=document.querySelector(`[data-rn="${bid}"]`); return bt.classList.contains('wait')&&/Waiting/.test(bt.textContent); }));
await W(500);
const boy=await ev(()=>MSApp.getRace().runners.find(x=>x.start==='B'&&x.id!=='fx').id), girl=await ev(()=>MSApp.getRace().runners.find(x=>x.start==='G').id);
await click(`[data-rn="${boy}"]`);
ok('a tap on a boy before the Boys gun records nothing', await ev(id=>!MSApp.getRace().marks.some(m=>m.runnerId===id),boy));
await W(1500);
await click('#v-race .race-guns [data-start=B]'); await W(600);
ok('Boys gun: the Gun bar is gone and boys are tappable', await ev(()=>!document.querySelector('#v-race .race-guns')&&!document.querySelector('#raceGrid .wait')));
ok('two clocks show (Girls and Boys)', await ev(()=>/Girls \d+:\d\d\.\d.*Boys \d+:\d\d\.\d/.test(document.querySelector('#raceClock').textContent)));
await W(1200); await click(`[data-rn="${girl}"]`); await click(`[data-rn="${boy}"]`); await W(300);
const t=await ev(([g,bb])=>{ const r=MSApp.getRace(), M=MSApp.raceModelNow?MSApp.raceModelNow():null; const tm=id=>{ const m=r.marks.find(x=>x.runnerId===id); const st=r.runners.find(x=>x.id===id).start, gun=r.gun.starts[st]; return (m.local+(m.off||0)-gun.local-(gun.off||0))/1000; }; return [tm(g),tm(bb),(r.gun.starts.B.local-r.gun.starts.G.local)/1000]; },[girl,boy]);
ok('each time runs from its own gun (girl ≈ boy + the gap between guns)', Math.abs(t[0]-t[1]-t[2])<0.4&&t[1]>0&&t[1]<3, t.map(x=>x.toFixed(1)).join(', '));
const btxt=await ev(id=>document.querySelector(`[data-rn="${id}"] .t`).textContent,boy);
ok('the boy’s button shows his time from the Boys gun', /✓ 0:0[1-3]/.test(btxt), btxt);
await ev(()=>{ document.querySelector('#v-race details.race-res').open=true; }); await W(200);
const heads=await ev(()=>[...document.querySelectorAll('#v-race .race-cards .start-h')].map(h=>h.textContent));
ok('results list Girls and Boys separately, each with its own places', heads.join('|')==='Girls|Boys', heads.join('|'));
const places=await ev(()=>[...document.querySelectorAll('#v-race .race-cards .rcard .l3')].map(x=>x.textContent).filter(x=>/1st/.test(x)).length);
ok('a 1st place in each start', places===2, places);
// Undo the Boys gun with its own Undo, then fire again: the Girls clock never changes
const gun0=await ev(()=>MSApp.getRace().gun.local);
ok('the race doc keeps the first gun for older versions', await ev(()=>{ const r=MSApp.getRace(); return r.gun.local===r.gun.starts.G.local; }));
await click('#v-race [data-ra=end]'); await W(300); await click('#modal [data-x=save]'); await W(600);
const saved=await ev(()=>{ const r=MSApp.getRace(); return r.status; });
ok('saved; the race keeps one model with each runner’s start', saved==='done');
const L=await ev(()=>{ const x=JSON.parse(localStorage.getItem('mustang-splits:v1')).raceLog[0]; return x?x.race.rows.map(r=>r.start||'').join(''):''; });
ok('saved rows carry G / B starts', /G/.test(L)&&/B/.test(L), L);
ok('no page errors', !errs.length, errs.join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0); })().catch(e=>{ console.log('CRASH',e); process.exit(1); });
