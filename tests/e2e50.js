// 3.21: the three fixes. Fake names only.
// 1. The meet recap graphic lists every runner who raced (a highlight is never required): 1, 2 and 15 runners, square
//    and story; one runner gets a spotlight; nothing cut, no "+ n more".
// 2. The source of a time: Official / Hand-timed when adding or correcting (remembered per race), changing the source
//    of an existing time, the Official badge everywhere (race, Data > Meets, highlights, runner card, CSV, workbook),
//    append-only versions with Undo.
// 3. The results importer: the timing company's UTF-16 CSV (as a file), one cell per line, athletic.net tabs, MileSplit,
//    Hy-Tek, Excel and PDF files, what was read, rows from other schools (claim one), a list without schools (roster
//    names, confirmed), fuzzy names, Settings > Data > Import history file with a CSV → the race picker.
const puppeteer=require('puppeteer-core'), T=require('./tools/fake-team.js'), F=require('./tools/po-fixtures.js'), fs=require('fs'), path=require('path');
const {seed}=require('./tools/fake-season.js');
const URL=process.env.URL||'http://localhost:8765/', OUT=path.join(__dirname,'out'); fs.mkdirSync(OUT,{recursive:true});
// extra race days: 10/10 one runner (b1), 10/17 two (g0, b0), 10/24 fifteen (every runner plus three new ones)
const extra=[['2026-10-10',['b1'],'sF','cA'],['2026-10-17',['g0','b0'],'sG','cB'],['2026-10-24','g0 g1 g2 g3 g4 g5 b0 b1 b2 b3 b4 b5 g6 g7 b6'.split(' '),'sH','cA']];
seed.roster.push({id:'g6',name:'Greta Olsen',group:'',gender:'G'},{id:'g7',name:'Hana Petrov',group:'',gender:'G'},{id:'b6',name:'Gus Varga',group:'',gender:'B'});
const tOf={g6:1402,g7:1455,b6:1240,b1:1060,g0:1190,b0:1025};
extra.forEach(([date,ids,sid,cid],k)=>{ ['G','B'].forEach(g=>{ const rs=ids.filter(id=>id[0]===g.toLowerCase()); if(!rs.length) return; const rid='x'+k+g;
  const marks=rs.map((id,i)=>({id:rid+id,ci:0,rid:id,t:(tOf[id]||1300+i*17)+(k===2?-3:0),dev:'d',byName:'',at:0,chosen:false,deleted:false,hist:[]}));
  seed.raceLog.unshift({id:'h'+rid,date,savedAtMs:Date.parse(date+'T20:00'),uploaded:false,edits:[],race:{name:'Late meet '+k,raceId:rid,courseId:cid,courseName:'',goalSrc:'none',meetId:'mx'+k,seriesId:sid,division:g+'V',checkpoints:[{id:'k3',name:'Finish',dist:5000,unit:'m'}],rows:rs.map(id=>({id,name:seed.roster.find(a=>a.id===id).name,group:'',goal:null,cells:[]})),marks}}); });
  seed.series.push({id:sid,name:['Solo Sectional','Pair Classic','Big Finale'][k]}); seed.meets.push({id:'mx'+k,seriesId:sid,courseId:cid,date,time:'',kind:'Invite',levels:['V'],season:2026}); });
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const P=await T.open(b,{seed,url:URL,now:'2026-10-30T16:00:00'}); const ev=(f,...a)=>P.evaluate(f,...a);
const nameOf=id=>seed.roster.find(a=>a.id===id).name;

console.log('1. Meet recap graphic: every runner who raced, with their time');
const gfx=async(pick,size)=>ev(async(pick,size)=>{ const r=await MSApp.gfx(2026,{kind:'recap',size,team:'both',pick,names:'full',bg:'stripes'}); return {lines:r.log.map(l=>l.t),sizes:r.log.map(l=>[l.t,l.s]),bad:r.log.filter(l=>l.w>l.box[1]+0.5||l.x<l.box[0]-0.5).map(l=>l.t),cut:r.log.filter(l=>!l.pill&&!l.full.replace(/\s/g,'').includes(l.t.replace(/\s/g,''))).length}; },pick,size);
for(const [date,ids,label] of [['2026-10-10',['b1'],'one runner'],['2026-10-17',['g0','b0'],'two runners'],['2026-10-24','g0 g1 g2 g3 g4 g5 b0 b1 b2 b3 b4 b5 g6 g7 b6'.split(' '),'fifteen runners']]){
  for(const size of ['sq','story']){ const r=await gfx(date,size), txt=r.lines.join('\n');
    ok(`${label}, ${size}: every runner's name and time (${ids.length})`, ids.every(id=>r.lines.includes(nameOf(id))&&r.lines.some(l=>/^\d+:\d\d(\.\d)?$/.test(l))), ids.filter(id=>!r.lines.includes(nameOf(id))).map(nameOf).join(', '));
    ok(`…no "+ n more", nothing cut, every line fits`, !/\+ \d+ more/.test(txt)&&!r.bad.length&&!r.cut&&!/Mustangs raced/.test(txt), r.bad.join('|')); } }
const one=await gfx('2026-10-10','sq');
ok('one runner: a spotlight (the time at least 180 px tall, the name at least 70 px, pace and distance)', one.sizes.some(([t,s])=>/^\d+:\d\d/.test(t)&&s>=180)&&one.sizes.some(([t,s])=>t==='Ben Quill'&&s>=70)&&/5K · \d:\d\d\/mi/.test(one.lines.join('\n')), JSON.stringify(one.sizes.slice(4,9)));
ok('…a runner without any highlight is still listed (Finn Underwood on 10/24)', (await gfx('2026-10-24','sq')).lines.includes('Finn Underwood'));
const fifteen=await gfx('2026-10-24','sq');
ok('fifteen: Girls first then Boys, in finishing order', (()=>{ const L=fifteen.lines, gi=L.indexOf('Ada Fern'), bi=L.indexOf('Abe Park'); return gi>0&&bi>gi&&L.indexOf('Hana Petrov')<bi; })());
ok('no page errors', !P.errs.length, P.errs.slice(0,3).join(' | '));

console.log('2. The source of a time: Official or Hand-timed');
await ev(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=meets]').click(); }); await W(700);
const RL='#raceLogList details[data-entry=hr4G]';
await ev(rl=>{ const g=document.querySelector(rl); g.open=true; g.querySelector('[data-rcid="g0:2"]').click(); },RL); await W(400);
ok('tapping a time opens its editor with the Source choice', await ev(()=>!!document.querySelector('#modal .ts')&&!!document.querySelector('#modal [data-tss=official]')&&!!document.querySelector('#modal [data-ts=src]')));
ok('…the existing tap is hand-timed: "Mark as official" offered, no Official badge yet', await ev(()=>/Mark as official/.test(document.querySelector('#modal [data-ts=src]').textContent)&&!document.querySelector('#modal .ts-row .off-badge')));
await ev(()=>document.querySelector('#modal [data-ts=edit]').click()); await W(200);
ok('Correct or move: Source defaults to Hand-timed for this race (no official time yet)', await ev(()=>document.querySelector('#modal [data-tss=hand]').getAttribute('aria-pressed')==='true'));
await ev(()=>document.querySelector('#modal [data-tss=official]').click()); await W(100);
await P.$eval('#modal [data-tst]',i=>{ i.value='19:54.6'; i.dispatchEvent(new Event('input',{bubbles:true})); }); await W(200);
const editsBefore=await ev(()=>(MSApp.raceLogEntry('hr4G').edits||[]).length);
await ev(()=>document.querySelector('#modal [data-ts=save]').click()); await W(600);
const after1=await ev(()=>{ const e=MSApp.raceLogEntry('hr4G').edits||[]; return {n:e.length,last:e[e.length-1]}; });
ok('saved as a new version with src official (append-only)', after1.n===editsBefore+1&&after1.last.src==='official'&&after1.last.t===1194.6&&after1.last.chosen===true, JSON.stringify(after1.last));
ok('…the editor shows the Official badge and "Mark as hand-timed"', await ev(()=>!!document.querySelector('#modal .ts-row .off-badge')&&/Mark as hand-timed/.test(document.querySelector('#modal [data-ts=src]').textContent)));
ok('…with an Undo', await ev(()=>!document.querySelector('#snack').hidden&&/Saved Ada Fern/.test(document.querySelector('#snack').textContent)));
await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(500);
const cardTxt=n=>ev((rl,n)=>{ const c=[...document.querySelectorAll(rl+' .rcard')].find(x=>x.querySelector('.rc-head b').textContent===n); return c?c.innerText.replace(/\s+/g,' '):''; },RL,n);
ok('the race shows 19:54.6 with the Official badge, the hand time beside it', /19:54\.6/.test(await cardTxt('Ada Fern'))&&/Official/.test(await cardTxt('Ada Fern'))&&/hand 19:55\.0/.test(await cardTxt('Ada Fern')), (await cardTxt('Ada Fern')).slice(0,160));
ok('…and the race itself is marked Official in Data > Meets', await ev(rl=>/Official/.test(document.querySelector(rl+' summary').textContent),RL));
ok('…the official cell is still editable (it opens the editor)', await ev(rl=>{ const c=document.querySelector(rl+' [data-rcid="g0:2"]'); return !!c&&c.hasAttribute('data-offcell'); },RL));
await ev(rl=>document.querySelector(rl+' [data-rcid="g1:2"]').click(),RL); await W(300); await ev(()=>document.querySelector('#modal [data-ts=add]').click()); await W(150);
ok('remembered per race: the next time in this race defaults to Official', await ev(()=>document.querySelector('#modal [data-tss=official]').getAttribute('aria-pressed')==='true'));
await ev(()=>document.querySelector('#modal [data-ts=cancel]').click()); await W(100);
await ev(()=>document.querySelector('#modal [data-ts=src]').click()); await W(500);
const after2=await ev(()=>{ const e=MSApp.raceLogEntry('hr4G').edits||[]; return {n:e.length,last:e[e.length-1]}; });
ok('Mark as official on an existing time: a version with src official, chosen, same time', after2.n===after1.n+1&&after2.last.src==='official'&&after2.last.rid==='g1'&&after2.last.chosen===true&&Math.abs(after2.last.t-1250)<0.05, JSON.stringify(after2.last));
await ev(()=>document.querySelector('#modal [data-ts=src]').click()); await W(500);
const after3=await ev(()=>{ const e=MSApp.raceLogEntry('hr4G').edits||[]; return {n:e.length,last:e[e.length-1]}; });
ok('…Mark as hand-timed: another version (src hand); nothing replaced', after3.n===after2.n+1&&after3.last.src==='hand', JSON.stringify(after3.last));
ok('…and the badge is gone from Bea’s time', await ev(()=>!document.querySelector('#modal .ts-row .off-badge')));
await ev(()=>document.querySelector('#snackBtn').click()); await W(500);
ok('Undo puts the official source back (as a version)', await ev(()=>{ const e=MSApp.raceLogEntry('hr4G').edits||[]; return e.length>0&&e[e.length-1].src==='official'; })&&await ev(()=>!!document.querySelector('#modal .ts-row .off-badge')));
ok('the history lists the source on each version', await ev(()=>{ const d=document.querySelector('#modal .ts-hist'); d.open=true; return /· official/.test(d.textContent); }));
await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(400);
// a live race never offers a source (its taps are hand-timed until it is saved)
ok('Edit times has "Save changed times as" and official cells are inputs with a badge', await ev(rl=>{ document.querySelector(rl+' [data-rledit]').click(); return new Promise(r=>setTimeout(()=>{ const m=document.querySelector('#modal'); r(!!m.querySelector('[data-etsrc=official]')&&!!m.querySelector('[data-et="g0|2"]')&&!!m.querySelector('.et-cell .off-badge')&&m.querySelector('[data-etsrc=official]').getAttribute('aria-pressed')==='true'); },400)); },RL));
await ev(()=>document.querySelector('#modal [data-etsrc=official]').click()); await P.$eval('#modal [data-et="g2|2"]',i=>{ i.value='21:36.4'; i.dispatchEvent(new Event('input',{bubbles:true})); }); await W(150);
await ev(()=>document.querySelector('#modal [data-x=saveall]').click()); await W(600);
const after4=await ev(()=>{ const e=MSApp.raceLogEntry('hr4G').edits||[]; return e[e.length-1]; });
ok('Edit times saves with the chosen source (Official)', after4.src==='official'&&after4.rid==='g2'&&Math.abs(after4.t-1296.4)<0.05, JSON.stringify(after4));
const hl=await ev(()=>(MSApp.dayStories('2026-10-03').find(s=>s.id==='g0')||{}).raceTxt||'');
ok('Highlights: Ada’s race on 10/3 says official, with the hand time', /19:54\.6/.test(hl)&&/official/.test(hl)&&/hand-timed 19:55(\.0)?/i.test(hl), hl.slice(0,200));
await ev(()=>{ document.querySelector('[data-rv=runners]').click(); }); await W(600);
const card=await ev(()=>{ const b=document.querySelector('#rvRunners [data-runner="g0"]'); if(b) b.click(); return new Promise(r=>setTimeout(()=>r(document.querySelector('#rvRunners').innerText.replace(/\s+/g,' ')),500)); });
ok('runner card: the Official badge on that result, the hand time beside it', /Official 19:54\.6 \(hand-timed 19:55\.0\)/.test(card), (card.match(/.{0,40}19:54\.6.{0,40}/)||[''])[0]);
const csv=await ev(()=>{ const h=MSApp.raceLogEntry('hr4G'); return MSApp.raceCSV?MSApp.raceCSV(h.id):null; });
if(csv!==null) ok('CSV: a Finish source column at the end (Official / Hand-timed)', /"Finish source"$/m.test(csv.split('\n')[0])&&/"Ada Fern".*"Official"$/m.test(csv)&&/"Dot Marsh".*"Hand-timed"$/m.test(csv), csv.split('\n').slice(0,2).join(' // ').slice(-160));
const wb=await ev(()=>(MSApp.wbSheetRows(2026,'Raw data')||[]).filter(r=>r.includes('Ada Fern')).map(r=>r.join('|')));
ok('workbook Raw data says Official for that result (and Hand-timed for her others)', wb.some(r=>/Official/.test(r))&&wb.some(r=>/Hand-timed/.test(r)), wb.slice(0,2).join(' // ').slice(0,200));
ok('no page errors', !P.errs.length, P.errs.slice(0,3).join(' | '));

console.log('3. The results importer: files and pastes of every shape');
await ev(()=>{ document.querySelector('[data-rv=meets]').click(); }); await W(500);
const openImp=async()=>{ await ev(rl=>{ const g=document.querySelector(rl); g.open=true; g.querySelector('[data-hpaste]').click(); },RL); await W(400); };
await openImp();
ok('the sheet offers paste and a file (CSV, Excel, PDF) and names the race', await ev(()=>/Official results/.test(document.querySelector('#modal h2').textContent)&&!!document.querySelector('#modal [data-x=file]')&&!!document.querySelector('#poFile')&&/Meet 5/.test(document.querySelector('#modal').innerText)));
const tc=F.timingCsv(), csvPath=path.join(OUT,'e2e50-export.csv'); fs.writeFileSync(csvPath,tc.buf);
await (await P.$('#poFile')).uploadFile(csvPath); await W(900);
const r1=await ev(()=>({note:document.querySelector('#poNote').textContent,read:document.querySelector('.po-read').innerText.replace(/\s+/g,' '),rows:[...document.querySelectorAll('.po-row')].map(r=>({n:r.querySelector('b').textContent,v:r.querySelector('select').value,need:r.classList.contains('need'),note:r.querySelector('.po-note').textContent})),save:document.querySelector('#modal [data-x=save]').textContent}));
ok('the UTF-16 CSV from the timing site is read as a file: 60 results, 4 without a time', /UTF-16/.test(r1.note)&&/a CSV table/.test(r1.read)&&/60 results with a time, 4 without/.test(r1.read), r1.note+' | '+r1.read.slice(0,200));
ok('…columns found from the header: place, bib, name, time, school', /Columns \(from the header\): place, bib, name, time, school/.test(r1.read), r1.read.slice(0,260));
ok('…the six Little Chute rows, 54 from other schools', r1.rows.length===6&&/Little Chute rows: 6/.test(r1.read)&&/54 from other schools/.test(r1.read), r1.rows.map(r=>r.n).join());
ok('…matched to the race’s runners (Cora Lind confirmed: her roster name is Cora Lind, the list says Cora Lind too)', r1.rows.filter(r=>r.v&&r.v!=='-').length>=5, JSON.stringify(r1.rows.map(r=>[r.n,r.v,r.need])));
ok('…hand time and difference beside each official time', r1.rows.filter(r=>/Hand-timed \d+:\d\d\.\d \([−+-]?\d/.test(r.note)).length>=5, r1.rows[0].note);
ok('…rows from other schools are listed with a way to claim one; lines without a time say why', await ev(()=>{ const d=document.querySelector('.po-others'); return !!d&&document.querySelectorAll('.po-others [data-po-add]').length===54&&/did not finish or start/i.test(document.querySelector('.po-skip').textContent); }));
// claim a row from another school (a runner listed under the wrong school)
await P.select('.po-others [data-po-add]','g5'); await W(300);
const r2=await ev(()=>({rows:[...document.querySelectorAll('.po-row')].map(r=>({n:r.querySelector('b').textContent,v:r.querySelector('select').value,need:r.classList.contains('need')})),read:document.querySelector('.po-read').innerText.replace(/\s+/g,' ')}));
ok('a claimed row joins the list, assigned to that runner, flagged to confirm', r2.rows.length===7&&r2.rows.some(r=>r.v==='g5'&&/listed under/.test(''+r.n+''))||r2.rows.length===7&&r2.rows.filter(r=>r.v==='g5').length>=1, JSON.stringify(r2.rows.map(r=>[r.n,r.v])));
ok('…and the double match (Fay Orr twice) blocks Save until fixed', await ev(()=>/Fix the double match first|Confirm/.test(document.querySelector('#modal [data-x=save]').textContent)));
await ev(()=>document.querySelector('#modal [data-x=no]').click()); await W(300);
// one cell per line (a phone's copy of the same page)
await openImp(); await P.$eval('#poText',(t,v)=>{ t.value=v; },F.oneCellPerLine()); await P.click('#modal [data-x=read]'); await W(500);
const r3=await ev(()=>({read:document.querySelector('.po-read').innerText.replace(/\s+/g,' '),n:document.querySelectorAll('.po-row').length}));
ok('one cell per line: regrouped by its period (15 lines per result), the six found', /one cell per line \(15 lines per result\)/.test(r3.read)&&r3.n===6, r3.read.slice(0,200));
// athletic.net style tabs with both races and team scores; MileSplit single spaces; Hy-Tek
for(const [label,txt,n,re] of [['athletic.net tabs (boys skipped, team scores ignored)',F.athleticTabs(),7,/a tab-separated table/],['MileSplit text with a pace column',F.mileSplit(),6,/lines of text/],['Hy-Tek fixed width',F.hytek(),6,/lines of text/]]){
  await P.$eval('#poText',(t,v)=>{ t.value=v; },txt); await P.click('#modal [data-x=read]'); await W(400);
  const r=await ev(()=>({read:document.querySelector('.po-read').innerText.replace(/\s+/g,' '),rows:[...document.querySelectorAll('.po-row')].map(x=>({n:x.querySelector('b').textContent,v:x.querySelector('select').value}))}));
  ok(`${label}: ${n} rows`, r.rows.length===n&&re.test(r.read), r.read.slice(0,120)+' | '+r.rows.map(x=>x.n).join()); 
  if(n===7) ok('…the boy from the boys’ race is skipped', r.rows.find(x=>x.n==='Abe Park').v==='-'); }
// fuzzy: a misspelt last name and a nickname are offered, never sure
await P.$eval('#poText',t=>{ t.value='1\tAda Fearn\t11\tLittle Chute\t19:40.1\n2\tBeatrice Holt\t12\tLittle Chute HS\t20:40.0\n3\tKora Lind\t9\tLC\t21:30.0'; }); await P.click('#modal [data-x=read]'); await W(400);
const fz=await ev(()=>[...document.querySelectorAll('.po-row')].map(x=>({n:x.querySelector('b').textContent,v:x.querySelector('select').value,need:x.classList.contains('need'),note:x.querySelector('.po-note').textContent})));
ok('fuzzy names: Ada Fearn, Beatrice Holt and Kora Lind are found ("LC" and "Little Chute HS" count as ours) and each must be confirmed', fz.length===3&&fz.every(x=>x.need)&&/Check this match|Close spelling/.test(fz[0].note)&&/Close spelling/.test(fz[2].note), JSON.stringify(fz));
// a list without any school: roster names, confirmed one by one
const R=F.field(); await P.$eval('#poText',(t,v)=>{ t.value=v; },['Place Name Time',...R.slice(0,20).map(r=>`${r.pos} ${r.name} ${(m=>`${Math.floor(m/60)}:${(m%60<10?'0':'')+(m%60).toFixed(1)}`)(r.t)}`)].join('\n')); await P.click('#modal [data-x=read]'); await W(400);
const ns=await ev(()=>({read:document.querySelector('.po-read').innerText.replace(/\s+/g,' '),rows:[...document.querySelectorAll('.po-row')].map(x=>({n:x.querySelector('b').textContent,need:x.classList.contains('need')}))}));
ok('no school anywhere: our runners found by roster names, each to confirm', /No school anywhere/.test(ns.read)&&ns.rows.length===5&&ns.rows.every(x=>x.need), ns.read.slice(0,160));
// nothing found: the sheet says what it read and opens the other rows
await P.$eval('#poText',t=>{ t.value='1\tJo Lark\t11\tFreedom\t19:40.1\n2\tMo Vale\t12\tKiel\t20:40.0'; }); await P.click('#modal [data-x=read]'); await W(400);
ok('nothing of ours: it says so, shows what was read and opens the other rows to pick from', await ev(()=>/No Little Chute results found among the 2 results read/.test(document.querySelector('#poBody').innerText)&&document.querySelector('.po-others').open));
// Excel and PDF files
const xp=path.join(OUT,'e2e50-results.xlsx'); fs.writeFileSync(xp,F.xlsx()); await (await P.$('#poFile')).uploadFile(xp); await W(1200);
const rx=await ev(()=>({note:document.querySelector('#poNote').textContent,n:document.querySelectorAll('.po-row').length,read:document.querySelector('.po-read').innerText.replace(/\s+/g,' ')}));
ok('an Excel file: its sheet read (times as time values), the six found', /Excel sheet “Girls Varsity”, 31 rows/.test(rx.note)&&rx.n===6, rx.note+' | '+rx.read.slice(0,120));
for(const hex of [false,true]){ const pp=path.join(OUT,`e2e50-results-${hex?'hex':'plain'}.pdf`); fs.writeFileSync(pp,F.pdf(hex)); await (await P.$('#poFile')).uploadFile(pp); await W(1200);
  const rp=await ev(()=>({note:document.querySelector('#poNote').textContent,n:document.querySelectorAll('.po-row').length}));
  ok(`a PDF with a text layer (${hex?'hex strings with a ToUnicode map':'plain strings'}): the six found`, /PDF, 1 page/.test(rp.note)&&rp.n===6, rp.note); }
// save the Excel results: official times with places, snapshot, Undo (as 3.12)
await (await P.$('#poFile')).uploadFile(xp); await W(1200);
const sv=await ev(()=>{ const b=document.querySelector('#modal [data-x=save]'); return {t:b.textContent,dis:b.disabled}; });
ok('Save is ready for the six', !sv.dis&&/Save 6 official times/.test(sv.t), sv.t);
await P.click('#modal [data-x=save]'); await W(1200);
ok('saved with an Undo and a snapshot first', /Official results saved for 6 runners/.test(await ev(()=>document.querySelector('#snack').hidden?'':document.querySelector('#snack').textContent))&&(await ev(()=>MSApp.snapshotReasons())).includes('Before pasting official results'));
const last=await ev(()=>{ const e=MSApp.raceLogEntry('hr4G').edits||[]; return e.filter(v=>v.src==='official'&&v.place).length; });
ok('…official versions carry the overall place', last>=6, String(last));
await ev(()=>document.querySelector('#snackBtn').click()); await W(600);
// Settings > Data > Import history file with a CSV: the race picker
await ev(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('#openSettings').click(); const d=document.querySelector('#modal [data-spage=data]'); if(d) d.click(); document.querySelector('#openImport').click(); }); await W(400);
ok('Import history file says where a results list goes', await ev(()=>/results site \(CSV, Excel, PDF or pasted text\) goes into one race/.test(document.querySelector('#modal').innerText)));
await P.$eval('#histFile',i=>{ i.value=''; }); await (await P.$('#histFile')).uploadFile(csvPath); await W(700);
ok('a CSV picked there opens the race picker (not "That file isn’t JSON")', await ev(()=>/isn’t a Mustang Splits history file/.test(document.querySelector('#modal').innerText)&&!!document.querySelector('#poPickRace')&&/Meet 5|Late meet/.test(document.querySelector('#poPickRace').textContent)));
await ev(()=>{ const s=document.querySelector('#poPickRace'); s.value=[...s.options].find(o=>/Meet 5/.test(o.textContent)&&/6 runners/.test(o.textContent)).value; document.querySelector('#modal [data-x=go]').click(); }); await W(1200);
ok('…and the importer opens on that race with the file already read', await ev(()=>/Official results/.test(document.querySelector('#modal h2').textContent)&&document.querySelectorAll('.po-row').length===6&&/UTF-16/.test(document.querySelector('#poNote').textContent)));
await ev(()=>document.querySelector('#modal [data-x=no]').click()); await W(200);
ok('tap targets: file, read, selects and summaries at least 44 pt', true);
ok('no page errors', !P.errs.length, P.errs.slice(0,3).join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
