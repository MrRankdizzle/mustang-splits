// 3.27: the Data and Awards navigation redesign (docs/design-data-nav.md). Fake names only.
// 1. Time to task: a runner's season chart in at most 3 taps from the Data tab (and by search).
// 2. The home: seven cards with an icon and one line, a search field, the New highlights card for 7 days after a meet.
// 3. Push navigation: a back button named after the previous screen on every pushed screen, the Data tab pops to the
//    home, no segmented control picks a destination, every list is a plain list (meets newest first, runners fastest first).
// 4. Highlights by moment (After a meet · Season), each ending in Share; Awards as the eight-step guided flow with
//    progress saved; smart defaults (the place is remembered across a reload).
// 5. The inventory D01–D30 from docs/design-data-nav.md: every feature of the old Data tab reachable in the new structure.
const puppeteer=require('puppeteer-core'), T=require('./tools/fake-team.js'), fs=require('fs'), path=require('path');
const {seed}=require('./tools/fake-season.js');
const URL=process.env.URL||'http://localhost:8765/', OUT=path.join(__dirname,'out'); fs.mkdirSync(OUT,{recursive:true});
const SETTINGS_WORDS=/Import history|Data health|Recently deleted|Sync log|Restore from a backup|Back up|Spreadsheet/;

(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const P=await T.open(b,{seed,url:URL,now:'2026-10-06T18:00:00'}); const ev=(f,...a)=>P.evaluate(f,...a);
const nav=()=>ev(()=>MSApp.dataNav());
const closeModal=async()=>{ await ev(()=>{ document.querySelector('#overlay').hidden=true; }); await W(150); };
const tap=async sel=>{ const r=await ev(s=>{ const e=document.querySelector(s); if(!e) return 'missing'; e.click(); return 'ok'; },sel); await W(400); return r; };
const visible=sel=>ev(s=>{ const e=document.querySelector(s); return !!e&&!!e.offsetParent&&!e.closest('[hidden]'); },sel);
await ev(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=results]').click(); }); await W(500);

console.log('1. Time to task: a runner’s season chart in at most 3 taps');
await ev(()=>MSApp.dataHome()); let taps=0;
taps++; await tap('#rvHome [data-rv=runners]'); // the Runners card
taps++; await tap('#rvRunners [data-runner]');  // the first runner
const chart=await ev(()=>{ const h=[...document.querySelectorAll('#rvRunners h3')].find(x=>/Season chart/.test(x.textContent)); const svg=h&&[...document.querySelectorAll('#rvRunners svg')].some(x=>x.compareDocumentPosition(h)&Node.DOCUMENT_POSITION_PRECEDING); return {h:!!h,svg:!!svg,y:h?h.getBoundingClientRect().top:null,screen:MSApp.dataNav().screen}; });
ok(`Data tab → Runners → a runner: the season chart in ${taps} taps (at most 3), on the runner’s own screen`, taps<=3&&chart.h&&chart.svg&&chart.screen==='runner', JSON.stringify(chart));
ok('the chart heading sits within two screens of the top (no hunting)', chart.y!=null&&chart.y<1700, String(chart.y));
await ev(()=>MSApp.dataHome()); taps=0;
await ev(()=>{ const i=document.querySelector('#rvHome [data-dnq]'); i.value='Cora'; i.dispatchEvent(new Event('input',{bubbles:true})); }); await W(400); taps++; // typing counts as one
taps++; await tap('#rvHome [data-rv=runner]');
ok(`by search: type a name, tap the result: the chart in ${taps} taps, back says ‹ Data`, taps<=3&&await ev(()=>MSApp.dataNav().screen==='runner'&&/Cora Lind/.test(document.querySelector('#navTitle').textContent)&&[...document.querySelectorAll('#rvRunners h3')].some(x=>/Season chart/.test(x.textContent))&&MSApp.dataNav().back==='‹ Data'));
await ev(()=>{ MSApp.dataSearch(''); MSApp.dataHome(); }); await W(300);

console.log('2. The home');
const home=await ev(()=>({cards:[...document.querySelectorAll('#rvHome .dn-cards .dn-card')].map(c=>c.querySelector('.ios-l').firstChild.textContent.trim()),icons:[...document.querySelectorAll('#rvHome .dn-cards .dn-card .set-ic svg')].length,subs:[...document.querySelectorAll('#rvHome .dn-cards .dn-card small')].map(s=>s.textContent),search:!!document.querySelector('#rvHome [data-dnq]'),first:document.querySelector('#rvHome .ios-group') ,newCard:document.querySelector('#rvHome .dn-newcard'),title:document.querySelector('#navTitle').textContent,back:MSApp.dataNav().back}));
ok('seven large cards in order (Meets, Runners, Team, Highlights, Awards, Schedule, Share), each with an icon and one line', home.cards.join('|')==='Meets|Runners|Team|Highlights|Awards|Schedule|Share'&&home.icons===7&&home.subs.every(s=>s.length>10), home.cards.join('|'));
ok('a search field on top, the large title "Data", no back button, no segmented control anywhere in Data', home.search&&home.title==='Data'&&home.back===''&&await ev(()=>!document.querySelector('#v-results .rv-switch')&&!document.querySelector('#v-results .hl-mode')));
ok('three days after the last meet: that meet’s highlights card first, marked New', await ev(()=>{ const c=document.querySelector('#rvHome .dn-newcard'); return !!c&&/Mustang Invite/.test(c.textContent)&&!!c.querySelector('.dn-newpill')&&c.closest('.ios-group').previousElementSibling.matches('[data-dnq]'); }));
await tap('#rvHome .dn-newcard');
ok('…it opens After a meet (the latest meet’s celebrations), back says ‹ Data', await ev(()=>MSApp.dataNav().screen==='after'&&/Mustang Invite/.test(document.querySelector('#rvHigh').textContent)&&MSApp.dataNav().back==='‹ Data'));
await ev(()=>MSApp.dataHome()); await W(200);
ok('…and once opened the New marker is gone (the card stays for the week)', await ev(()=>!!document.querySelector('#rvHome .dn-newcard')&&!document.querySelector('#rvHome .dn-newpill')));
ok('the Awards card says coaches only; the Schedule card names the next meet when there is one', await ev(()=>/coaches only/.test(document.querySelector('#rvHome [data-rv=awards]').textContent)&&!!document.querySelector('#rvHome [data-rv=sched]')));
ok('every card and row is at least 44 px tall', await ev(()=>[...document.querySelectorAll('#rvHome .dn-card')].every(c=>c.getBoundingClientRect().height>=44)));
{ const P2=await T.open(b,{seed,url:URL,now:'2026-10-20T18:00:00'}); await P2.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=results]').click(); }); await W(400);
  ok('seventeen days after the last meet: no New card', await P2.evaluate(()=>!document.querySelector('#rvHome .dn-newcard')&&document.querySelectorAll('#rvHome .dn-card').length===7)); await P2.close(); }

console.log('3. Push navigation and plain lists');
const walk=[['#rvHome [data-rv=meets]','meets','Meets','‹ Data'],['#meetRows [data-rv=meet]','meet',null,'‹ Meets'],['back','meets','Meets','‹ Data'],['home',null,null,null],['#rvHome [data-rv=runners]','runners','Runners','‹ Data'],['#rvRunners [data-runner]','runner',null,'‹ Runners'],['back','runners','Runners','‹ Data'],['home',null,null,null],['#rvHome [data-rv=team]','team','Team','‹ Data'],['home',null,null,null],['#rvHome [data-rv=high]','high','Highlights','‹ Data'],['#rvHigh [data-hlm=latest]','after','After a meet','‹ Highlights'],['#rvHigh .dn-sharerow [data-hlm=share]','share','Share','‹ After a meet'],['back','after','After a meet','‹ Highlights'],['back','high','Highlights','‹ Data'],['#rvHigh [data-hlm=season]','season','Season','‹ Highlights'],['home',null,null,null],['#rvHome [data-rv=awards]','awards','Awards','‹ Data'],['home',null,null,null],['#rvHome [data-rv=share]','share','Share','‹ Data']];
let walkBad=[]; for(const [sel,screen,title,back] of walk){ if(sel==='home'){ await ev(()=>MSApp.dataHome()); await W(200); continue; } if(sel==='back'){ await tap('#navLeft .nav-back'); } else { const r=await tap(sel); if(r!=='ok'){ walkBad.push(sel+': missing'); continue; } } const n=await nav(); if(n.screen!==screen||(title&&n.title!==title)||n.back!==back) walkBad.push(`${sel} → ${n.screen} "${n.title}" "${n.back}" (wanted ${screen} ${title} ${back})`); }
ok('every pushed screen shows its title and a back button named after the screen it came from (Meets, a meet, Runners, a runner, Team, Highlights, After a meet, Share, Season, Awards)', !walkBad.length, walkBad.slice(0,3).join(' | '));
await ev(()=>MSApp.dataGo('runners')); await ev(()=>document.querySelector('#rvRunners [data-runner]').click()); await W(300); await ev(()=>document.querySelector('.tab[data-tab=results]').click()); await W(300);
ok('tapping the Data tab again pops back to the home', await ev(()=>MSApp.dataNav().screen==='home'&&!document.querySelector('#rvHome').hidden));
await tap('#rvHome [data-rv=meets]');
const meets=await ev(()=>MSApp.meetList().map(m=>m.name));
const dates=meets.map(n=>{ const m=n.match(/(\w{3}), (\w{3}) (\d+)/); return m?new Date(`${m[2]} ${m[3]} ${/2025/.test(n)?2025:2026}`).getTime():0; }).filter(Boolean);
ok(`Meets is a plain list of rows, newest first (${meets.length} rows; Girls and Boys races say which)`, meets.length>=10&&dates.every((d,i)=>!i||d<=dates[i-1])&&await ev(()=>document.querySelectorAll('#meetRows .dn-meetrow').length>=10&&/Girls|Boys/.test(document.querySelector('#meetRows .dn-meetrow small').textContent)), meets.slice(0,3).join(' ; '));
ok('…and the 3.10 accordion is not shown on the list (no expanded results tables)', await ev(()=>![...document.querySelectorAll('#histList details, #raceLogList details')].some(d=>d.offsetParent)));
await tap('#meetRows [data-rv=meet]');
ok('a meet row opens that meet with its results open, Edit times, Edit Varsity/JV and Official results reachable', await ev(()=>{ const cur=document.querySelector('#rvMeets .dn-cur'); return !!cur&&!!cur.offsetParent&&cur.open&&!!cur.querySelector('table')&&!!cur.querySelector('[data-rledit],[data-hedit]')&&!!cur.querySelector('[data-jvedit]')&&!!cur.querySelector('[data-hpaste]')&&[...document.querySelectorAll('#histList > details, #raceLogList > details')].filter(d=>d.offsetParent).length===1; }));
await ev(()=>MSApp.dataGo('runners')); await W(300);
const order=await ev(()=>[...document.querySelectorAll('#rvRunners .rv-gh[data-g=G] ~ .rv-row')].slice(0,6).map(r=>r.querySelector('small').textContent));
ok('Runners is fastest first by default (season best ascending within Girls), with Sort as a menu, not a segmented control', await ev(()=>/Sort: Fastest/.test(document.querySelector('#rvRunners [data-dnsort]').textContent)&&!document.querySelector('#rvRunners .sort-sw'))&&(()=>{ const sb=order.map(s=>{ const m=s.match(/SB (\d+):(\d\d(?:\.\d)?)/); return m?+m[1]*60+ +m[2]:null; }).filter(x=>x!=null); return sb.length>=4&&sb.every((v,i)=>!i||v>=sb[i-1]); })(), order.slice(0,3).join(' | '));
await tap('#rvRunners [data-dnsort]');
ok('the Sort menu offers Fastest, Season average, Name', await ev(()=>{ const t=document.querySelector('#modal').textContent; return /Fastest/.test(t)&&/Season average/.test(t)&&/Name/.test(t); }));
await ev(()=>{ const b=[...document.querySelectorAll('#modal button')].find(x=>/Season average/.test(x.textContent)); b.click(); }); await W(400);
ok('…picking Season average re-sorts and the button says so', await ev(()=>/Sort: Season average/.test(document.querySelector('#rvRunners [data-dnsort]').textContent)));
await ev(()=>{ const b=document.querySelector('#rvRunners [data-dnsort]'); b.click(); }); await W(300); await ev(()=>{ const b=[...document.querySelectorAll('#modal button')].find(x=>/Fastest/.test(x.textContent)); b.click(); }); await W(300); await closeModal();
await ev(()=>{ const i=document.querySelector('#rvRunners [data-rvq]'); i.value='Bea'; i.dispatchEvent(new Event('input',{bubbles:true})); }); await W(300);
ok('Runners is searchable', await ev(()=>document.querySelectorAll('#rvRunners [data-runner]').length===1&&/Bea Holt/.test(document.querySelector('#rvRunners [data-runner]').textContent)));
await ev(()=>{ const i=document.querySelector('#rvRunners [data-rvq]'); i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})); }); await W(200);
let settingsLeak=[]; for(const s of ['home','meets','runners','team','high','after','season','share','awards']){ await ev(s=>MSApp.dataGo(s),s); await W(250); const t=await ev(()=>document.querySelector('#v-results').innerText); if(SETTINGS_WORDS.test(t)) settingsLeak.push(s+': '+t.match(SETTINGS_WORDS)[0]); }
ok('nothing settings-like on any Data screen (import, data health, recently deleted, sync log, spreadsheet, backups)', !settingsLeak.length, settingsLeak.join(' | '));
await ev(()=>{ document.querySelector('#openSettings').click(); }); await W(300); await ev(()=>{ const d=document.querySelector('#modal [data-spage=data]'); if(d) d.click(); }); await W(300);
ok('…they are all in Settings › Data (Schedule, Import, Data health, Recently deleted, Sync log, Export, Spreadsheet, Backups)', await ev(()=>{ const t=document.querySelector('#modal').textContent; return /Schedule/.test(t)&&/Import history file/.test(t)&&/Data health/.test(t)&&/Recently deleted/.test(t)&&/Sync log/.test(t)&&/Banquet book/.test(t)&&/Spreadsheet/.test(t)&&/Back up/.test(t); }));
await closeModal();

console.log('4. Highlights by moment, the Awards flow, smart defaults');
await ev(()=>MSApp.dataGo('high')); await W(300);
ok('Highlights is two rows, After a meet (the latest meet named) and Season, with a Share row under them', await ev(()=>{ const R=[...document.querySelectorAll('#rvHigh [data-hlm]')]; return R.length===3&&/After a meet/.test(R[0].textContent)&&/Mustang Invite/.test(R[0].textContent)&&/Season/.test(R[1].textContent)&&R[2].dataset.hlm==='share'&&!document.querySelector('#rvHigh .hl-mode'); }));
await tap('#rvHigh [data-hlm=latest]');
ok('After a meet: the celebrations, Share the recap, and a Share row at the end', await ev(()=>!!document.querySelector('#rvHigh #shareLatest')&&!!document.querySelector('#rvHigh .dn-sharerow')&&document.querySelector('#latestWrap').lastElementChild.classList.contains('dn-sharerow')));
await tap('#rvHigh [data-hlr]');
ok('a runner’s highlights page from it, back says ‹ After a meet', await ev(()=>!!document.querySelector('#rvHigh .hld-name')&&MSApp.dataNav().back==='‹ After a meet'));
await tap('[data-hlback]'); await ev(()=>MSApp.dataGo('season')); await W(300);
ok('Season: the team cards, runner rows, Share the season recap, the Awards row and a Share row at the end', await ev(()=>!!document.querySelector('#rvHigh [data-ssshare]')&&!!document.querySelector('#rvHigh [data-ssr]')&&!!document.querySelector('#rvHigh [data-ssaw]')&&!!document.querySelector('#rvHigh .dn-sharerow')));
await tap('#rvHigh [data-ssr]');
ok('a runner’s season page, back says ‹ Season', await ev(()=>!!document.querySelector('#rvHigh .hld-name')&&MSApp.dataNav().back==='‹ Season'));
await tap('[data-hlback]'); await tap('#rvHigh .dn-sharerow [data-hlm=share]');
ok('Share: the hub with the banquet book, social graphics and the coach’s workbook', await ev(()=>document.querySelectorAll('#rvHigh [data-shx]').length===3&&MSApp.dataNav().screen==='share'));
// the Awards flow
await ev(()=>MSApp.dataHome()); await tap('#rvHome [data-rv=awards]');
const aw=await ev(()=>({steps:[...document.querySelectorAll('#rvHigh .aw-steps [data-awstep]')].map(b=>b.querySelector('.aw-stepl').textContent),cur:document.querySelector('#rvHigh .aw-steps [aria-current=step]').dataset.awstep,line:document.querySelector('#rvHigh .aw-stepline').textContent,body:document.querySelector('#rvHigh .aw-sec').textContent,next:(document.querySelector('#rvHigh [data-awnext]')||{}).textContent,teamBtns:document.querySelectorAll('#rvHigh button[data-awteam]').length}));
ok('Awards opens the guided flow on step 1 of 8 (Review JV tags) with the progress indicator and Next', aw.steps.join('|')==='Review JV tags|MVR|Most Improved|Rookie of the Year|Mustang Award|Varsity Letters|Captains|Summary'&&aw.cur==='jv'&&/Step 1 of 8/.test(aw.line)&&/No race day has more than 7|Review/.test(aw.body)&&/Varsity \/ JV by meet/.test(aw.body)&&/Next: MVR/.test(aw.next)&&aw.teamBtns===0, JSON.stringify([aw.cur,aw.line,aw.next]));
ok('step 1 lists every race day for Girls and Boys with how many count as Varsity', await ev(()=>document.querySelectorAll('#rvHigh .aw-days .aw-row').length===10&&/Opener Invite/.test(document.querySelector('#rvHigh .aw-days').textContent)));
await tap('#rvHigh [data-awnext]');
const mvr=await ev(()=>({cur:document.querySelector('#rvHigh .aw-steps [aria-current=step]').dataset.awstep,teams:[...document.querySelectorAll('#rvHigh [data-awteam]')].map(h=>h.textContent.trim()),rule:/Average place among our varsity runners/.test(document.querySelector('#rvHigh .aw-rule').textContent),marks:document.querySelectorAll('#rvHigh [data-awmark]').length,ev:!!document.querySelector('#rvHigh [data-awev=mvr]'),math:/= \d+ \(/.test(document.querySelector('#rvHigh .aw-list').textContent)}));
ok('Next → step 2 MVR: the criteria in the coach’s wording, Girls and Boys on one screen, the evidence table with the math, Mark buttons, the Evidence slide button', mvr.cur==='mvr'&&mvr.teams.join('|')==='Girls|Boys'&&mvr.rule&&mvr.marks>=12&&mvr.ev&&mvr.math, JSON.stringify(mvr));
await tap('#rvHigh [data-awmark]');
ok('marking a recipient keeps the step and shows the recipient line (Girls Ada Fern)', await ev(()=>document.querySelector('#rvHigh .aw-steps [aria-current=step]').dataset.awstep==='mvr'&&/Recipient: Girls Ada Fern/.test(document.querySelector('#rvHigh .aw-rcp').textContent)&&!document.querySelector('#rvHigh [data-awev=mvr]').disabled));
for(const k of ['mir','roty','mustang','letter']){ await ev(k=>document.querySelector(`#rvHigh .aw-steps [data-awstep=${k}]`).click(),k); await W(300); const r=await ev(k=>({cur:document.querySelector('#rvHigh .aw-steps [aria-current=step]').dataset.awstep,teams:document.querySelectorAll('#rvHigh [data-awteam]').length,h:document.querySelector('#rvHigh .aw-sec > h3').textContent,ev:!!document.querySelector(`#rvHigh [data-awev=${k}]`),marks:document.querySelectorAll('#rvHigh [data-awmark]').length}),k); ok(`step ${k}: its own screen with both teams, its criteria and Mark buttons`, r.cur===k&&r.teams===2&&r.ev&&r.marks>=1&&new RegExp({mir:'Most Improved',roty:'Rookie',mustang:'Mustang Award',letter:'Varsity Letter'}[k]).test(r.h), JSON.stringify(r)); }
ok('the Mustang step has the Banquet citation field for each team', await ev(()=>{ document.querySelector('#rvHigh .aw-steps [data-awstep=mustang]').click(); return document.querySelectorAll('#rvHigh [data-awcite]').length===2; }));
await ev(()=>document.querySelector('#rvHigh .aw-steps [data-awstep=letter]').click()); await W(300); await tap('#rvHigh [data-awrun]');
ok('a letterwinner’s sheet (captain, good standing, grade, seasons) still opens from the Letters step', await ev(()=>/Captain this season/.test(document.querySelector('#modal').textContent)&&/Good standing/.test(document.querySelector('#modal').textContent)));
await closeModal(); await ev(()=>document.querySelector('#rvHigh .aw-steps [data-awstep=capt]').click()); await W(300);
ok('step 7 Captains: a switch per runner for Girls and Boys', await ev(()=>document.querySelectorAll('#rvHigh [data-awcapt]').length===12&&document.querySelectorAll('#rvHigh [data-awteam]').length===2));
await ev(()=>{ const c=document.querySelector('#rvHigh [data-awcapt="g1"]'); c.checked=true; c.dispatchEvent(new Event('change',{bubbles:true})); }); await W(400);
ok('…turning one on marks the captain (kept with the awards, the Letters step shows the badge)', await ev(()=>document.querySelector('#rvHigh [data-awcapt="g1"]').checked&&MSApp.awards(2026,'G').letter.find(x=>x.id==='g1').captain===true));
await ev(()=>document.querySelector('#rvHigh .aw-steps [data-awstep=summary]').click()); await W(400);
const sm=await ev(()=>({cur:document.querySelector('#rvHigh .aw-steps [aria-current=step]').dataset.awstep,t:document.querySelector('#rvHigh .aw-sec').textContent,share:!!document.querySelector('#rvHigh [data-awshare]'),ann:!!document.querySelector('#rvHigh [data-awann]'),pdf:!!document.querySelector('#rvHigh [data-awpdf]'),set:!!document.querySelector('#rvHigh [data-awset]'),book:!!document.querySelector('#rvHigh [data-awbook]'),ev:document.querySelectorAll('#rvHigh [data-awev]').length,next:!!document.querySelector('#rvHigh [data-awnext]')}));
ok('step 8 Summary: the recipients per award (Girls: Ada Fern for MVR), the captains, the five Evidence slides, Share awards, the banquet book, the worksheet, Awards settings, Awards announced; no Next', sm.cur==='summary'&&/Girls: Ada Fern/.test(sm.t)&&/Bea Holt/.test(sm.t)&&sm.share&&sm.ann&&sm.pdf&&sm.set&&sm.book&&sm.ev===5&&!sm.next, JSON.stringify(sm).slice(0,200));
ok('the progress indicator marks done steps (JV reviewed, MVR marked, Captains set)', await ev(()=>['jv','mvr','capt'].every(k=>document.querySelector(`#rvHigh .aw-steps [data-awstep=${k}]`).classList.contains('done'))&&!document.querySelector('#rvHigh .aw-steps [data-awstep=roty]').classList.contains('done')));
await ev(()=>document.querySelector('#rvHigh .aw-steps [data-awstep=roty]').click()); await W(300);
await P.reload({waitUntil:'load'}); await P.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); await W(800); await ev(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=results]').click(); }); await W(500);
ok('smart default: after a relaunch the Data tab reopens on Awards, step 4 (where it was left), back says ‹ Data', await ev(()=>MSApp.dataNav().screen==='awards'&&document.querySelector('#rvHigh .aw-steps [aria-current=step]').dataset.awstep==='roty'&&MSApp.dataNav().back==='‹ Data'));
await ev(()=>MSApp.dataGo('runner','g2')); await W(300); await P.reload({waitUntil:'load'}); await P.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); await W(800); await ev(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=results]').click(); }); await W(500);
ok('…and a runner’s screen comes back as that runner, with ‹ Runners', await ev(()=>MSApp.dataNav().screen==='runner'&&/Cora Lind/.test(document.querySelector('#navTitle').textContent)&&MSApp.dataNav().back==='‹ Runners'));

console.log('5. The inventory (docs/design-data-nav.md D01–D30)');
const INV=[
 ['D01','Schedule',async()=>{ await ev(()=>MSApp.dataHome()); await tap('#rvHome [data-rv=sched]'); const v=await ev(()=>/Schedule/.test(document.querySelector('#modal h2, #modal h3')?.textContent||'')||/Schedule|meet/i.test(document.querySelector('#modal').textContent)); await closeModal(); return v; }],
 ['D02','Team history / official results as rows',async()=>{ await ev(()=>MSApp.dataGo('meets')); return (await ev(()=>document.querySelectorAll('#meetRows [data-rv=meet]').length))>=10; }],
 ['D03','A race’s results, Edit times, Edit Varsity/JV',async()=>{ await tap('#meetRows [data-rv=meet]'); return ev(()=>{ const c=document.querySelector('#rvMeets .dn-cur'); return !!c&&!!c.querySelector('table')&&!!c.querySelector('[data-rledit],[data-hedit]')&&!!c.querySelector('[data-jvedit]'); }); }],
 ['D04','Races on this phone',async()=>ev(()=>MSApp.meetList().some(m=>m.grp==='Races on this phone'))],
 ['D05','Practice history row',async()=>{ await ev(()=>{ S0=null; }); await ev(()=>MSApp.dataGo('meets')); return ev(()=>!!document.querySelector('#meetRows [data-rv=practice]')||document.querySelector('#practiceWrap').hidden); }],
 ['D06','Today’s stopwatches row (when there are times)',async()=>ev(()=>!!document.querySelector('#meetRows [data-rv=today]')||!document.querySelectorAll('.card').length)],
 ['D07','Season menu on Team',async()=>{ await ev(()=>MSApp.dataGo('team')); return visible('#seasonPick'); }],
 ['D08','Find a runner (home search and Runners search)',async()=>{ await ev(()=>MSApp.dataHome()); return (await visible('#rvHome [data-dnq]'))&&(await ev(()=>{ MSApp.dataGo('runners'); return !!document.querySelector('#rvRunners [data-rvq]'); })); }],
 ['D09','Sort runners (menu)',async()=>visible('#rvRunners [data-dnsort]')],
 ['D10','Raw / Adjusted on Runners, Team and the runner card',async()=>{ const a=await visible('#rvRunners [data-rvchart]'); await ev(()=>MSApp.dataGo('team')); const t=await visible('#rvTeam [data-rvchart]'); await ev(()=>MSApp.dataGo('runner','g0')); const r=await visible('#rvRunners [data-rvchart]'); return a&&t&&r; }],
 ['D11','Runner card: PRs and SBs, season chart, races, trends, Edit',async()=>ev(()=>{ const t=document.querySelector('#rvRunners').textContent; return /PR and season best/.test(t)&&/Season chart/.test(t)&&/This season/.test(t)&&!!document.querySelector('#rvRunners [data-openrace]')&&!document.querySelector('#profEdit').hidden; })],
 ['D12','Open a race from the runner card → the meet screen',async()=>{ await tap('#rvRunners [data-openrace]'); return ev(()=>MSApp.dataNav().screen==='meet'&&!!document.querySelector('#rvMeets .dn-cur .flash, #rvMeets .dn-cur')&&MSApp.dataNav().back==='‹ Cora Lind'||MSApp.dataNav().back==='‹ Ada Fern'); }],
 ['D13','Team: seasons at a glance, top-5 averages, the ladder',async()=>{ await ev(()=>MSApp.dataGo('team')); return ev(()=>/Top-5|top-5|average/i.test(document.querySelector('#rvTeam').textContent)); }],
 ['D14','After a meet: celebrations, runner page, Share the recap',async()=>{ await ev(()=>MSApp.dataGo('after')); return ev(()=>!!document.querySelector('#rvHigh [data-hlr]')&&!!document.querySelector('#shareLatest')); }],
 ['D15','Next step and growth focus on the runner’s page (coaches only)',async()=>{ await tap('#rvHigh [data-hlr]'); const v=await ev(()=>/Next step|Growth focus|next step/i.test(document.querySelector('#rvHigh').textContent)); await tap('[data-hlback]'); return v; }],
 ['D16','Season: team cards, runner rows, Share the season recap',async()=>{ await ev(()=>MSApp.dataGo('season')); return ev(()=>!!document.querySelector('#rvHigh .tcard')&&!!document.querySelector('#rvHigh [data-ssr]')&&!!document.querySelector('#rvHigh [data-ssshare]')); }],
 ['D17','Share hub (Data › Share, and Settings › Data › Export)',async()=>{ await ev(()=>MSApp.dataGo('share')); const a=await ev(()=>document.querySelectorAll('#rvHigh [data-shx]').length===3); await ev(()=>{ document.querySelector('#openSettings').click(); }); await W(300); await ev(()=>{ const d=document.querySelector('#modal [data-spage=data]'); if(d) d.click(); }); await W(300); const s=await ev(()=>!!document.querySelector('#exBook')&&!!document.querySelector('#exGfx')&&!!document.querySelector('#exWb')); await closeModal(); return a&&s; }],
 ['D18','The New highlights card',async()=>{ await ev(()=>MSApp.dataHome()); return visible('#rvHome .dn-newcard'); }],
 ['D19','Awards: review flags (step 1)',async()=>{ await ev(()=>MSApp.awardsStep('jv')); return ev(()=>/more than 7/.test(document.querySelector('#rvHigh .aw-sec').textContent)); }],
 ['D20','Varsity / JV by meet',async()=>{ await tap('#rvHigh [data-awvar]'); const v=await ev(()=>/Varsity \/ JV by meet/.test(document.querySelector('#modal').textContent)); await closeModal(); return v; }],
 ['D21','MVR standings and Mark',async()=>{ await ev(()=>MSApp.awardsStep('mvr')); return ev(()=>!!document.querySelector('#rvHigh [data-awmark^="G.mvr"]')&&!!document.querySelector('#rvHigh [data-awmark^="B.mvr"]')); }],
 ['D22','Most Improved list and Mark',async()=>{ await ev(()=>MSApp.awardsStep('mir')); return ev(()=>!!document.querySelector('#rvHigh [data-awmark^="G.mir"]')&&/Recommended/.test(document.querySelector('#rvHigh').textContent)); }],
 ['D23','Rookie list and Mark',async()=>{ await ev(()=>MSApp.awardsStep('roty')); return ev(()=>!!document.querySelector('#rvHigh [data-awmark^="G.roty"], #rvHigh [data-awmark^="B.roty"]')||/No first-year/.test(document.querySelector('#rvHigh').textContent)); }],
 ['D24','Mustang Award list, Mark, the citation',async()=>{ await ev(()=>MSApp.awardsStep('mustang')); return ev(()=>!!document.querySelector('#rvHigh [data-awmark^="G.mustang"]')&&document.querySelectorAll('#rvHigh [data-awcite]').length===2); }],
 ['D25','Varsity Letter checklist, Mark, the runner’s sheet',async()=>{ await ev(()=>MSApp.awardsStep('letter')); return ev(()=>!!document.querySelector('#rvHigh [data-awmark^="G.letter"]')&&!!document.querySelector('#rvHigh [data-awrun]')&&!!document.querySelector('#rvHigh .aw-ck')); }],
 ['D26','Captain per runner (step 7 and the runner’s sheet)',async()=>{ await ev(()=>MSApp.awardsStep('capt')); return ev(()=>document.querySelectorAll('#rvHigh [data-awcapt]').length>=12); }],
 ['D27','Evidence slide per award (each step and the Summary)',async()=>{ await ev(()=>MSApp.awardsStep('summary')); return ev(()=>document.querySelectorAll('#rvHigh [data-awev]').length===5); }],
 ['D28','Share awards, Awards announced, the worksheet, Awards settings',async()=>ev(()=>!!document.querySelector('#rvHigh [data-awshare]')&&!!document.querySelector('#rvHigh [data-awann]')&&!!document.querySelector('#rvHigh [data-awpdf]')&&!!document.querySelector('#rvHigh [data-awset]'))],
 ['D29','Back buttons everywhere, the tab pops to the home',async()=>{ const b=await ev(()=>MSApp.dataNav().back==='‹ Data'); await ev(()=>document.querySelector('.tab[data-tab=results]').click()); await W(300); return b&&await ev(()=>MSApp.dataNav().screen==='home'); }],
 ['D30','Remembered place',async()=>ev(()=>!!localStorage.getItem('mustang-splits:v1')&&JSON.parse(localStorage.getItem('mustang-splits:v1')).settings.dataNav.screen==='home')]];
let invBad=[]; for(const [id,name,fn] of INV){ let v=false; try{ v=await fn(); }catch(e){ v='crash: '+e.message.slice(0,60); } if(v!==true) invBad.push(`${id} ${name}: ${v}`); }
ok(`every feature of the old Data tab is reachable in the new structure (${INV.length} items)`, !invBad.length, invBad.slice(0,4).join(' | '));
ok('no page errors', !P.errs.length, P.errs.slice(0,3).join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.log('CRASH',e); process.exit(1); });
