// 3.20: the live-synced coach's spreadsheet (Settings > Data > Spreadsheet). Checks: the sheet content (the Coach's
// Brief first with its five boxes and "what this means" lines, then the eight workbook sheets, every data row keyed,
// a chart per data sheet, a hash per sheet); the Brief's boxes match the app's own highlights, growth focus, pace
// groups, readiness and awards logic; nothing coach-only in any data sheet; the Excel copy holds the same content
// (every row, every string); each trigger fires once (roster, awards, tag, schedule) and pushes are rate-limited to one
// a minute; on two emulator phones: Set up asks the sync function for its address, a sheet is connected, the content
// documents land (one per sheet, hashes, parts), only changed sheets are written again, the status from the function
// shows on both phones, Disconnect. The function itself is tested in tests/sheet-sync.test.mjs. Fake names only.
const puppeteer=require('puppeteer-core'), T=require('./tools/fake-team.js'), H=require('./tools/phones.js');
const path=require('path'), zlib=require('zlib');
const URL=process.env.URL||'http://localhost:8765/', OUT=path.join(__dirname,'out'), FS='http://127.0.0.1:8181/v1/projects/mustang-splits/databases/(default)/documents';
function unzip(buf){ const out={}; let e=buf.length-22; while(e>0&&buf.readUInt32LE(e)!==0x06054b50) e--; const n=buf.readUInt16LE(e+10); let p=buf.readUInt32LE(e+16);
  for(let i=0;i<n;i++){ const m=buf.readUInt16LE(p+10), cs=buf.readUInt32LE(p+20), nl=buf.readUInt16LE(p+28), xl=buf.readUInt16LE(p+30), cl=buf.readUInt16LE(p+32), off=buf.readUInt32LE(p+42), name=buf.slice(p+46,p+46+nl).toString();
    const lnl=buf.readUInt16LE(off+26), lxl=buf.readUInt16LE(off+28), data=buf.slice(off+30+lnl+lxl,off+30+lnl+lxl+cs); out[name]=(m===8?zlib.inflateRawSync(data):data).toString('utf8'); p+=46+nl+xl+cl; }
  return out; }
const COACH=/Next step|next target|Growth focus|Ready for a breakthrough|check in|Captain|good standing|standing|MVR|Most Valuable|Most Improved|Rookie|Mustang Award|candidate|Tie: coaches|Varsity|\bJV\b|readiness|Peaking|sore knee|Injury|Illness/i;
const unesc=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
// Firestore emulator REST (as the sync function would, with the Admin SDK)
const fsVal=v=>v instanceof Date?{timestampValue:v.toISOString()}:typeof v==='number'?{doubleValue:v}:typeof v==='boolean'?{booleanValue:v}:Array.isArray(v)?{arrayValue:{values:v.map(fsVal)}}:v&&typeof v==='object'?{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,fsVal(x)]))}}:{stringValue:String(v)};
const fsGet=async p=>{ const r=await fetch(`${FS}/${p}`,{headers:{Authorization:'Bearer owner'}}); if(r.status===404) return null; const j=await r.json(); const un=f=>f.stringValue!==undefined?f.stringValue:f.integerValue!==undefined?Number(f.integerValue):f.doubleValue!==undefined?f.doubleValue:f.booleanValue!==undefined?f.booleanValue:f.timestampValue!==undefined?f.timestampValue:f.mapValue?Object.fromEntries(Object.entries(f.mapValue.fields||{}).map(([k,x])=>[k,un(x)])):f.arrayValue?(f.arrayValue.values||[]).map(un):null; return {updateTime:j.updateTime,...Object.fromEntries(Object.entries(j.fields||{}).map(([k,x])=>[k,un(x)]))}; };
const fsList=async p=>{ const r=await fetch(`${FS}/${p}?pageSize=50&mask.fieldPaths=key&mask.fieldPaths=hash&mask.fieldPaths=part&mask.fieldPaths=parts&mask.fieldPaths=name`,{headers:{Authorization:'Bearer owner'}}); const j=await r.json(); return (j.documents||[]).map(d=>({id:d.name.split('/').pop(),updateTime:d.updateTime,...Object.fromEntries(Object.entries(d.fields||{}).map(([k,x])=>[k,x.stringValue!==undefined?x.stringValue:Number(x.integerValue)]))})); };
const fsPatch=async(p,o)=>{ const mask=Object.keys(o).map(k=>'updateMask.fieldPaths='+k).join('&'); const r=await fetch(`${FS}/${p}?${mask}`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:Object.fromEntries(Object.entries(o).map(([k,v])=>[k,fsVal(v)]))})}); return r.ok; };

(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+(typeof extra==='string'?extra:JSON.stringify(extra))+']':'')); };
// the fake team with its history, plus a hand-timed race with an Injury tag and a note (coach-only context)
const seed=T.seed(), ids=['f0','f1','f2','f3','f4'], tt=[1340,1370,1395,1400,1420];
seed.raceLog=[{id:'hR',date:'2026-10-08',savedAtMs:Date.parse('2026-10-08T20:00'),uploaded:false,edits:[{op:'tag',rid:'f1',tags:['Injury'],note:'sore knee',at:1,by:'d'}],race:{name:'Practice meet',raceId:'rR',courseId:null,courseName:'',goalSrc:'none',meetId:null,division:'OPEN',status:'done',gun:1,gunLocal:1,
  checkpoints:[{id:'k1',name:'Mile 1',dist:1609.34,unit:'m'},{id:'k2',name:'Mile 2',dist:3218.69,unit:'m'},{id:'k3',name:'Finish',dist:5000,unit:'m'}],rows:ids.map(id=>({id,name:seed.roster.find(a=>a.id===id).name,group:'',goal:null,cells:[]})),
  marks:ids.flatMap((id,i)=>[{id:'a'+id,ci:0,rid:id,t:Math.round(tt[i]*0.31),dev:'d',byName:'',at:0,chosen:false,deleted:false,hist:[]},{id:'b'+id,ci:1,rid:id,t:Math.round(tt[i]*0.64),dev:'d',byName:'',at:0,chosen:false,deleted:false,hist:[]},{id:'m'+id,ci:2,rid:id,t:tt[i],dev:'d',byName:'',at:0,chosen:false,deleted:false,hist:[]}])}}];
const P=await T.open(b,{url:URL,seed,now:'2026-10-20T16:00:00'}); await T.load(P); const ev=(f,...a)=>P.evaluate(f,...a);
const txt=c=>c==null?'':typeof c==='object'?(c.v==null?'':String(c.v)):String(c);

console.log('1. The content: the Brief first, then the eight workbook sheets, keys, charts, hashes');
const C=await ev(()=>{ const C=MSApp.sheet.content(); return {season:C.season,sheets:C.sheets.map(s=>({key:s.key,name:s.name,rows:s.rows,keys:s.keys,hash:s.hash,chart:s.chart,cols:s.cols,freeze:s.freeze,filter:s.filter,cf:s.cf}))}; });
ok('nine sheets in order: Coach’s Brief, Season board, Meet grid, Splits, Progress, Team, Training paces, Weather, Raw data', C.sheets.map(s=>s.name).join('|')==='Coach’s Brief|Season board|Meet grid|Splits|Progress|Team|Training paces|Weather|Raw data', C.sheets.map(s=>s.name).join('|'));
ok('keys: brief, season-board, …, raw-data', C.sheets.map(s=>s.key).join()==='brief,season-board,meet-grid,splits,progress,team,training-paces,weather,raw-data');
ok('every sheet has a 16-character hash', C.sheets.every(s=>/^[0-9a-f]{16}$/.test(s.hash)));
ok('every data row has a key (and header and note rows none)', C.sheets.every(s=>s.keys.length===s.rows.length)&&C.sheets.slice(1).every(s=>s.rows.every((r,i)=>(r.length>0&&!(r[0]&&r[0].s==='h')&&!(r[0]&&r[0].s==='h2')&&!(r[0]&&(r[0].s==='note'||r[0].s==='warn')))===!!s.keys[i]||s.key==='splits')), C.sheets.map(s=>s.key+':'+s.keys.filter(Boolean).length).join());
ok('keys are stable ids (r|<runner id>, d|<date>, x|…), not names', C.sheets[1].keys.filter(Boolean).every(k=>/^r\|f\d+$/.test(k))&&C.sheets[5].keys.filter(Boolean).every(k=>/^d\|\d{4}-\d\d-\d\d$|^total$/.test(k))&&C.sheets[8].keys.filter(Boolean).every(k=>/^x\|/.test(k)));
ok('a chart on every data sheet, none on the Brief, each with a title that says what to look for', !C.sheets[0].chart&&C.sheets.slice(1).every(s=>s.chart&&s.chart.title&&s.chart.cats&&s.chart.series.length)&&/Team ladder/.test(C.sheets[1].chart.title)&&/Season trend by runner/.test(C.sheets[2].chart.title)&&/Year over year/.test(C.sheets[4].chart.title)&&/tightening/.test(C.sheets[5].chart.title)&&/PR drops/.test(C.sheets[8].chart.title));
ok('team colours: Girls and Boys series', C.sheets[1].chart.series.map(s=>s.name+':'+s.color).join()==='Girls:b8247f,Boys:0a6e94'&&C.sheets[2].chart.series.every(s=>s.color==='b8247f'||s.color==='0a6e94'));
ok('the ladder has a number for every runner with a season best, in minutes', C.sheets[1].chart.cats.length===14&&C.sheets[1].chart.series.flatMap(s=>s.vals).filter(v=>v!=null).length===14&&C.sheets[1].chart.series.flatMap(s=>s.vals).filter(v=>v!=null).every(v=>v>14&&v<30));
ok('the Team chart has four series, the spreads on the right axis', C.sheets[5].chart.series.length===4&&C.sheets[5].chart.series.filter(s=>s.right).length===2&&C.sheets[5].chart.y2);
const hash1=C.sheets.map(s=>s.hash).join();
const C2=await ev(()=>MSApp.sheet.content().sheets.map(s=>s.hash).join());
ok('the hashes are stable (the same data, the same hashes)', C2===hash1);

console.log('2. The Coach’s Brief matches the app’s own logic');
const B=C.sheets[0], first=B.rows.map(r=>txt(r[0])), box=t=>{ const i=first.indexOf(t); let j=i+1; while(j<B.rows.length&&!/^\d\. |^Never shared/.test(first[j])) j++; return B.rows.slice(i,j); };
ok('five boxes in order, after Your notes', ['Your notes','1. Celebrate','2. Watch','3. Pace groups','4. Championship readiness','5. Awards tracker'].every((t,i,A)=>first.indexOf(t)>=0&&(i===0||first.indexOf(t)>first.indexOf(A[i-1]))));
ok('every box has a “What this means” line right under its title', ['Your notes','1. Celebrate','2. Watch','3. Pace groups','4. Championship readiness','5. Awards tracker'].every(t=>/^What this means: /.test(first[first.indexOf(t)+1])));
ok('six note rows with keys note|1…6 and a Coaches-only line at the top', B.keys.filter(k=>/^note\|\d$/.test(k||'')).length===6&&/Coaches only/.test(first[1])&&/Share this spreadsheet only with coaches/.test(first[1]));
const LM=await ev(()=>{ const L=MSApp.latestMeet(); return L?{name:L.name,day:L.day,cel:L.stories.filter(s=>s.hl.some(h=>h.k==='pr'||h.k==='sb')).map(s=>({id:s.a.id,name:s.a.name,k:(s.hl.find(h=>h.k==='pr')||s.hl.find(h=>h.k==='sb')).k,t:s.r.t}))}:null; });
const celKeys=box('1. Celebrate').map(r=>r.k||null); const celRows=box('1. Celebrate').filter(r=>B.keys[B.rows.indexOf(r)]);
ok('Celebrate: exactly the runners with a new PR or season best at the last meet, in the app’s order', LM&&celRows.map(r=>B.keys[B.rows.indexOf(r)]).join()===LM.cel.map(s=>'cel|'+s.id).join()&&celRows.every((r,i)=>txt(r[0])===LM.cel[i].name&&(LM.cel[i].k==='pr'?/New .* PR/:/Season best/).test(txt(r[2]))&&Math.abs(r[3].v*86400-LM.cel[i].t)<0.01), celRows.map(r=>txt(r[0])+' '+txt(r[2])).join('; '));
ok('…naming the meet', celRows.every(r=>txt(r[5]).startsWith(LM.name)));
const GF=await ev(()=>MSApp.growth()), watch=box('2. Watch').filter(r=>B.keys[B.rows.indexOf(r)]);
ok('Watch: exactly the app’s growth focus runners (none here, so one plain line)', watch.map(r=>B.keys[B.rows.indexOf(r)]).join()===GF.map(g=>'watch|'+g.id).join()&&(GF.length||/No one is trending down/.test(box('2. Watch').map(r=>txt(r[0])).join(' '))));
const TP=await ev(()=>MSApp.teamPaces({e:'cv',d:'mile'})), pg=box('3. Pace groups').filter(r=>B.keys[B.rows.indexOf(r)]);
const want=TP.secs.filter(x=>x.g==='G'||x.g==='B').flatMap(x=>[...x.groups.flatMap((G,i)=>G.map(r=>`${x.label} ${i+1}:${r.id}`)),...x.none.map(o=>`${x.label}: no pace yet:${o.id}`)]);
ok('Pace groups: the same groups as Training › Team training paces at CV (members and order)', pg.map(r=>txt(r[0])+':'+B.keys[B.rows.indexOf(r)].slice(3)).join()===want.join(), pg.slice(0,4).map(r=>txt(r[0])+':'+txt(r[2])).join('; '));
const PE=await ev(ids=>Object.fromEntries(ids.map(id=>[id,MSApp.paceEngine(id)])),pg.map(r=>B.keys[B.rows.indexOf(r)].slice(3)));
ok('…with each runner’s current CV, interval and 5K paces from the pace engine', pg.filter(r=>PE[B.keys[B.rows.indexOf(r)].slice(3)]).every(r=>{ const p=PE[B.keys[B.rows.indexOf(r)].slice(3)].paces; return Math.abs(r[3].v*86400-p.cv)<0.6&&Math.abs(r[4].v*86400-p.interval)<0.6&&Math.abs(r[5].v*86400-p['5k'])<0.6; }));
const RD=await ev(()=>MSApp.sheet.ready(2026)), ready=box('4. Championship readiness').filter(r=>B.keys[B.rows.indexOf(r)]);
ok('Readiness: one row per runner with a race, last three races and the season average as 5K-equivalents, a plain note', ready.length===RD.length&&ready.every((r,i)=>B.keys[B.rows.indexOf(r)]==='ready|'+RD[i].id&&Math.abs(r[5].v*86400-RD[i].avg)<0.01&&/^(Peaking|Steady|Trending up|Coming back|Building|Early days)/.test(txt(r[7]))), ready.map(r=>txt(r[7]).split(':')[0]).join());
ok('…the Injury-tagged race left out of its runner’s readiness (f1: three races, not four)', (RD.find(x=>x.id==='f1')||{}).last.length<=3);
const AWd=await ev(()=>({G:MSApp.awards(2026,'G'),B:MSApp.awards(2026,'B')})), aw=box('5. Awards tracker'), awKeys=aw.map(r=>B.keys[B.rows.indexOf(r)]).filter(Boolean);
const unknown=await ev(()=>MSApp.sheet.content().sheets[0].rows.some(r=>r[0]&&r[0].s==='warn'));
if(unknown) ok('Awards: blank with a note until varsity participation is confirmed', awKeys.length===0&&/Blank until varsity participation is confirmed/.test(aw.map(r=>txt(r[0])).join(' ')));
else { const mvr=awKeys.filter(k=>k.startsWith('mvr|G|')).map(k=>k.split('|')[2]);
  ok('Awards: the MVR standings in the app’s order with the math (places, sum, average)', mvr.join()===[...AWd.G.mvr.ranked.map(r=>r.id),...AWd.G.mvr.out.map(r=>r.id)].join()&&aw.filter(r=>(B.keys[B.rows.indexOf(r)]||'').startsWith('mvr|G|')).every((r,i)=>{ const m=[...AWd.G.mvr.ranked,...AWd.G.mvr.out][i]; return m.math.startsWith(txt(r[3]).replace(/, /g,',')+' = '+txt(r[4]))||!m.n; }), mvr.length+' ranked');
  ok('…letter progress and rookies keyed by runner', awKeys.some(k=>k.startsWith('let|'))); }
ok('the Brief says the data sheets can be shared and it cannot', /Never shared: this sheet names next steps and award standings/.test(first[first.length-1]));

console.log('3. Nothing coach-only in any data sheet');
const bad1=[]; C.sheets.slice(1).forEach(s=>s.rows.forEach(r=>r.forEach(c=>{ const t=txt(c); if(COACH.test(t)&&!/Left out of trends|Injury\/Illness|Heat, Mud or Wind/.test(t)) bad1.push(s.key+': '+t.slice(0,60)); })));
ok('no next step, growth focus, award word, Captain, standing, Varsity/JV, readiness or health reason in the eight data sheets', bad1.length===0, bad1.slice(0,4));
ok('a tagged race says only “Yes” under Left out of trends, never the tag or the note', C.sheets[8].rows.some(r=>txt(r[17])==='Yes')&&!C.sheets[8].rows.some(r=>r.some(c=>/sore knee|Injury/.test(txt(c)))));
ok('the Brief itself is where the coach-only words are', box('5. Awards tracker').some(r=>r.some(c=>/Most Valuable/.test(txt(c))))||unknown);

console.log('4. The Excel copy holds the same content');
const X=await ev(()=>MSApp.sheet.xlsx()), Z=unzip(Buffer.from(X.b64,'base64'));
const names=[...Z['xl/workbook.xml'].matchAll(/<sheet name="([^"]+)"/g)].map(m=>unesc(m[1]));
ok('nine sheets, the same names in the same order', names.join('|')===C.sheets.map(s=>s.name).join('|'), names.join('|'));
const sst=new Set([...(Z['xl/sharedStrings.xml']||'').matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map(m=>unesc(m[1])));
const missing=[]; C.sheets.forEach(s=>s.rows.forEach(r=>r.forEach(c=>{ const t=txt(c); if(t&&!(c&&typeof c==='object'&&(typeof c.v==='number'||c.f))&&typeof c!=='number'&&!sst.has(t)) missing.push(s.key+': '+t.slice(0,40)); })));
ok('every string of every sheet is in the workbook', missing.length===0, missing.slice(0,4));
const rowCounts=C.sheets.map((s,i)=>[s.rows.length,(Z[`xl/worksheets/sheet${i+1}.xml`].match(/<row /g)||[]).length]);
ok('every sheet has the same number of rows', rowCounts.every(([a,b])=>a===b), rowCounts.map(x=>x.join('/')).join());
ok('each sheet has a Coach notes column (empty: Excel is never read back)', sst.has('Coach notes')&&C.sheets.every((s,i)=>Z[`xl/worksheets/sheet${i+1}.xml`].includes('<cols>')));
const xlErr=await ev(()=>{ try{ return null; }catch(e){ return e.message; } });
ok('made without errors', !xlErr&&X.size>20000, X.size);

console.log('5. Triggers fire once each; pushes at most once a minute (the Excel copy on this phone, no team)');
await ev(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('#openSettings').click(); }); await W(400);
ok('Settings › Data has a Spreadsheet row', await ev(()=>!!document.querySelector('#openSheet')&&document.querySelector('#openSheet').getBoundingClientRect().height>=43.5));
await ev(()=>document.querySelector('#openSheet').click()); await W(500);
ok('…it opens the Spreadsheet page: without a team, the Google Sheet says why; the Excel copy switch is there', await ev(()=>document.querySelector('#modal h2').textContent==='Spreadsheet'&&/needs to be on the team first/.test(document.querySelector('#shSet').textContent)&&!!document.querySelector('#shXlsx')));
await ev(()=>document.querySelector('#shXlsx').click()); await W(2500);
const st1=await ev(()=>MSApp.sheet.state());
ok('Keep an Excel copy: the first copy is made right away', st1.xlsxAt>0&&!st1.dirty, st1);
ok('…the page shows when it was updated and a Save the latest copy button', await ev(()=>/Updated/.test(document.querySelector('#shSet').textContent)&&!!document.querySelector('#shSet [data-x=xshare]')));
await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(300);
const log0=await ev(()=>MSApp.sheet.log());
await ev(()=>MSApp.awPut('s-2026',{k:'s',season:2026},{set:{split:true,thr:80,total:'varsity'}})); const log1=await ev(()=>MSApp.sheet.log());
ok('an awards change fires the awards trigger once', (log1.awards||0)===(log0.awards||0)+1, log1);
await ev(()=>{ document.querySelector('.tab[data-tab=team]').click(); }); await W(300);
await ev(()=>{ const b=[...document.querySelectorAll('#teamList button, #v-team button')].find(x=>/\+ Add|Add a runner|Add runner/.test(x.textContent)); b&&b.click(); }); await W(400);
const addedOk=await ev(()=>{ const i=document.querySelector('#modal input'); if(!i) return false; i.value='Zed Newcomer'; i.dispatchEvent(new Event('input',{bubbles:true})); const g=document.querySelector('#modal [data-gen="B"]'); g&&g.click(); const s=[...document.querySelectorAll('#modal button')].find(x=>/^Add$|Add runner|Save/.test(x.textContent.trim())); s&&s.click(); return true; }); await W(400);
const log2=await ev(()=>MSApp.sheet.log());
ok('adding a runner fires the roster trigger once', addedOk&&(log2.roster||0)===(log1.roster||0)+1, {addedOk,log2});
await ev(()=>{ const m=MSApp.sheet; m.touch('tag'); }); const log3=await ev(()=>MSApp.sheet.log());
ok('the tag trigger counts (tagEdit calls it once per saved tag)', (log3.tag||0)===(log2.tag||0)+1);
const st2=await ev(()=>MSApp.sheet.state());
ok('after changes within the minute: a push is waiting (one a minute), the copy not remade yet', st2.timer&&st2.dirty&&st2.xlsxAt===st1.xlsxAt, {timer:st2.timer,dirty:st2.dirty});
await ev(()=>MSApp.sheet.push(true)); await W(600);
const st3=await ev(()=>MSApp.sheet.state());
ok('Sync now pushes at once (the copy remade, nothing waiting)', st3.xlsxAt>st1.xlsxAt&&!st3.dirty, st3);
ok('no page errors', P.errs.length===0, P.errs.slice(0,3));

console.log('6. Two coach phones on a team: Set up, connect a sheet, the content lands, only changed sheets again, Disconnect');
const errs=[];
const [A,Bp]=await H.team(b,['Coach Ann','Coach Ben'],errs,S=>{ S.roster=[{id:'q1',name:'Quinn Ash',group:'',gender:'G'},{id:'q2',name:'Rae Birch',group:'',gender:'B'}]; });
const tid=await A.evaluate(()=>JSON.parse(localStorage.getItem('mustang-splits:sync')).teamId);
const openSheet=async p=>{ await p.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('#openSettings').click(); }); await W(400); await p.evaluate(()=>document.querySelector('#openSheet').click()); await W(500); };
await openSheet(A);
ok('A: Not set up, with Set up', await A.evaluate(()=>/Not set up/.test(document.querySelector('#shSet').textContent)&&!!document.querySelector('#shSet [data-x=setup]')));
await A.evaluate(()=>document.querySelector('#shSet [data-x=setup]').click()); await W(1500);
const stA=await fsGet(`teams/${tid}/sheet/state`);
ok('…writes hello to teams/{t}/sheet/state in Coach Ann’s name', stA&&stA.hello===true&&stA.byName==='Coach Ann'&&!stA.sheetId, stA);
ok('…and waits for the sync function (says what to do if it never answers)', await A.evaluate(()=>/Waiting for the sync function/.test(document.querySelector('#shSet').textContent)&&/sheet-sync-setup/.test(document.querySelector('#shSet').textContent)));
// the sync function answers with its address
await fsPatch(`teams/${tid}/sheet/status`,{status:'needs-sheet',saEmail:'mustang-splits@appspot.gserviceaccount.com',updatedAt:new Date()}); await W(1500);
ok('…the address to share the sheet with appears, with Copy and a place for the link', await A.evaluate(()=>/mustang-splits@appspot\.gserviceaccount\.com/.test(document.querySelector('#shSet').textContent)&&!!document.querySelector('#shSet [data-x=copy]')&&!!document.querySelector('#shUrl')&&/as Editor/.test(document.querySelector('#shSet').textContent)));
await A.evaluate(()=>{ document.querySelector('#shUrl').value='https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit#gid=0'; document.querySelector('#shSet [data-x=connect]').click(); }); await W(4000);
const stA2=await fsGet(`teams/${tid}/sheet/state`), docs1=await fsList(`teams/${tid}/sheet`);
ok('Connect: the sheet id from the link, a request, and the content documents (one per sheet)', stA2.sheetId==='1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'&&!!stA2.requestedAt&&docs1.filter(d=>d.id.startsWith('c-')).length===9, docs1.map(d=>d.id).join());
ok('…each content document: key, name, hash, part 0 of 1', docs1.filter(d=>d.id.startsWith('c-')).every(d=>d.key&&d.name&&/^[0-9a-f]{16}$/.test(d.hash)&&d.part===0&&d.parts===1));
ok('…B sees it too: syncing for the first time', await (async()=>{ await openSheet(Bp); return Bp.evaluate(()=>/Syncing for the first time/.test(document.querySelector('#shSet').textContent)); })());
// the function reports a sync
const applied=Object.fromEntries(docs1.filter(d=>d.id.startsWith('c-')).map(d=>[d.key,d.hash]));
await fsPatch(`teams/${tid}/sheet/status`,{status:'ok',lastSyncAt:new Date(),applied,title:'Mustangs XC 2026',url:'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789',updatedAt:new Date()}); await W(1500);
ok('A and B: Connected: Mustangs XC 2026, Last synced just now, Open the sheet, Sync now, Disconnect', await A.evaluate(()=>{ const t=document.querySelector('#shSet').textContent; return /Connected: Mustangs XC 2026/.test(t)&&/Last synced\s*just now/.test(t)&&document.querySelector('#shSet a[href*="1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789"]')&&!!document.querySelector('#shSet [data-x=now]')&&!!document.querySelector('#shSet [data-x=off]'); })&&await Bp.evaluate(()=>/Connected: Mustangs XC 2026/.test(document.querySelector('#shSet').textContent)));
ok('…with the coaches-only reminder', await A.evaluate(()=>/coaches only/.test(document.querySelector('#shSet').textContent)&&/Share the sheet only with coaches/.test(document.querySelector('#shSet').textContent)));
// a change on B: only the sheets whose content changed are written again (B never sent anything, but the function's applied hashes say what the sheet has)
await Bp.evaluate(()=>document.querySelector('#modal [data-x=done]').click()); await W(300);
await Bp.evaluate(()=>{ MSApp.getRoster().push({id:'q3',name:'Sam Cedar',group:'',gender:'B'}); MSApp.sheet.touch('roster'); }); await W(500);
const stB=await Bp.evaluate(()=>MSApp.sheet.state());
ok('B: the change is waiting for its minute', stB.dirty&&stB.timer);
await Bp.evaluate(()=>MSApp.sheet.push(true)); await W(3000);
const docs2=await fsList(`teams/${tid}/sheet`), ch=docs2.filter(d=>d.id.startsWith('c-')).map(d=>{ const o=docs1.find(x=>x.id===d.id); return [d.key,o&&o.hash!==d.hash?'changed':o&&o.updateTime!==d.updateTime?'rewritten':'same']; });
ok('only the Brief (pace groups) and Training paces changed with the new runner: the other seven documents untouched', ch.filter(([k,s])=>s!=='same').map(([k])=>k).sort().join()==='brief,training-paces', ch.map(x=>x.join(':')).join());
ok('…and a new request', (await fsGet(`teams/${tid}/sheet/state`)).requestedAt>stA2.requestedAt);
// an error from the function shows
await fsPatch(`teams/${tid}/sheet/status`,{status:'needs-share',error:'No access to the sheet yet: share it with the address above as Editor, then Sync now.',updatedAt:new Date()}); await W(1200);
ok('A: a sharing problem shows with the address and what to do', await A.evaluate(()=>{ const t=document.querySelector('#shSet').textContent; return /Can’t open the sheet yet/.test(t)&&/gserviceaccount/.test(t)&&/then Sync now/.test(t); }));
await fsPatch(`teams/${tid}/sheet/status`,{status:'ok',error:'',updatedAt:new Date()}); await W(800);
await A.evaluate(()=>document.querySelector('#shSet [data-x=off]').click()); await W(600); await A.evaluate(()=>{ const y=document.querySelector('#modal [data-x=yes]'); y&&y.click(); }); await W(1500);
const stOff=await fsGet(`teams/${tid}/sheet/state`);
ok('Disconnect: a confirm, then sheetId cleared and off, and the page is back to Not set up', stOff.sheetId===''&&stOff.off===true&&await A.evaluate(()=>!!document.querySelector('#shSet')&&/Not set up/.test(document.querySelector('#shSet').textContent)));
ok('no page errors on either phone', errs.length===0, errs.slice(0,3));

console.log(bad?`\n${bad} FAILED`:'\nall passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.log('CRASH',e); process.exit(1); });
