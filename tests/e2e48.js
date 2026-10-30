// 3.19: the banquet book, social graphics and the coach's workbook (Data > Highlights > Share, Settings > Data > Export),
// and runner photos. Checks: the Share mode and its sheets; the book's pages (cover, teams, meets, runners, awards from
// the marked recipients only when asked, the season by the numbers), full-bleed landscape PDF, a photo on its runner's
// page; graphics of every kind and size fit every line of text at every name length (never cut), names as full / first /
// initials (remembered), previewed before sharing; the workbook is valid Office Open XML (every part well-formed, the
// schema's element order, real time values, frozen headers, filters, colours, formulas with values, sparklines) and opens
// in Excel and Numbers without a repair prompt (on a Mac that has them; XLSX_APPS=0 skips); nothing coach-only in any
// export (next steps, growth focus, award candidates, Captain, good standing, varsity, health reasons or notes); photos:
// Edit sheet, Undo, Recently deleted, backup, two coach phones (emulator). Fake names only.
const puppeteer=require('puppeteer-core'), T=require('./tools/fake-team.js'), H=require('./tools/phones.js');
const fs=require('fs'), path=require('path'), zlib=require('zlib'), { execFileSync, execFile }=require('child_process');
const URL=process.env.URL||'http://localhost:8765/', OUT=path.join(__dirname,'out');

// a .xlsx's parts (a zip: stored or deflated)
function unzip(buf){ const out={}; let e=buf.length-22; while(e>0&&buf.readUInt32LE(e)!==0x06054b50) e--; const n=buf.readUInt16LE(e+10); let p=buf.readUInt32LE(e+16);
  for(let i=0;i<n;i++){ const m=buf.readUInt16LE(p+10), cs=buf.readUInt32LE(p+20), nl=buf.readUInt16LE(p+28), xl=buf.readUInt16LE(p+30), cl=buf.readUInt16LE(p+32), off=buf.readUInt32LE(p+42), name=buf.slice(p+46,p+46+nl).toString('utf8');
    const lnl=buf.readUInt16LE(off+26), lxl=buf.readUInt16LE(off+28), data=buf.slice(off+30+lnl+lxl,off+30+lnl+lxl+cs); out[name]=(m===8?zlib.inflateRawSync(data):data).toString('utf8'); p+=46+nl+xl+cl; }
  return out; }
// CT_Worksheet's sequence (ECMA-376): Excel asks to repair a sheet whose parts are out of this order
const WS_ORDER=['sheetPr','dimension','sheetViews','sheetFormatPr','cols','sheetData','sheetCalcPr','sheetProtection','protectedRanges','scenarios','autoFilter','sortState','dataConsolidate','customSheetViews','mergeCells','phoneticPr','conditionalFormatting','dataValidations','hyperlinks','printOptions','pageMargins','pageSetup','headerFooter','rowBreaks','colBreaks','customProperties','cellWatches','ignoredErrors','smartTags','drawing','legacyDrawing','legacyDrawingHF','picture','oleObjects','controls','webPublishItems','tableParts','extLst'];
const SS_ORDER=['numFmts','fonts','fills','borders','cellStyleXfs','cellXfs','cellStyles','dxfs','tableStyles','colors','extLst'];
const COACH=/Next step|next target|Growth focus|Ready for a breakthrough|check in|Captain|good standing|standing|MVR|Most Valuable|Most Improved|Rookie|Mustang Award|candidate|Tie: coaches|Varsity|\bJV\b|Injury|Illness|sore knee|Coaches only|recipient/i;
const LONG=['W','Wu Wo','Ana Bé','Maximiliana Featherstonehaugh','Wwwwwwwwwwwwww Wwwwwwwwwwwwwww','Bartholomew-Alexander Montgomery-Featherstonehaugh III','Mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm'];

(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
// a hand-timed race with an Injury tag and a note (coach-only context: never in an export)
const seed=T.seed(), ids=['f0','f1','f2','f3','f4'], tt=[1340,1370,1395,1400,1420];
seed.raceLog=[{id:'hR',date:'2026-10-08',savedAtMs:Date.parse('2026-10-08T20:00'),uploaded:false,edits:[{op:'tag',rid:'f1',tags:['Injury'],note:'sore knee',at:1,by:'d'}],race:{name:'Practice meet',raceId:'rR',courseId:null,courseName:'',goalSrc:'none',meetId:null,seriesId:null,division:'GV',
  checkpoints:[{id:'k1',name:'Mile 1',dist:1609.34,unit:'m'},{id:'k2',name:'Mile 2',dist:3218.69,unit:'m'},{id:'k3',name:'Finish',dist:5000,unit:'m'}],rows:ids.map(id=>({id,name:seed.roster.find(a=>a.id===id).name,group:'',goal:null,cells:[]})),
  marks:ids.flatMap((id,i)=>[{id:'a'+id,ci:0,rid:id,t:Math.round(tt[i]*0.31),dev:'d',byName:'',at:0,chosen:false,deleted:false,hist:[]},{id:'b'+id,ci:1,rid:id,t:Math.round(tt[i]*0.64),dev:'d',byName:'',at:0,chosen:false,deleted:false,hist:[]},{id:'m'+id,ci:2,rid:id,t:tt[i],dev:'d',byName:'',at:0,chosen:false,deleted:false,hist:[]}])}}];
const P=await T.open(b,{url:URL,seed,now:'2026-10-20T16:00:00'}); await T.load(P); const ev=(f,...a)=>P.evaluate(f,...a);
const openHigh=async()=>{ await ev(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=high]').click(); }); await W(500); };

console.log('1. Data > Highlights > Share');
await openHigh();
ok('Highlights has Latest meet | Season | Share', await ev(()=>[...document.querySelectorAll('#rvHigh .hl-mode [data-hlm]')].map(x=>x.textContent).join('|')==='Latest meet|Season|Share'));
await ev(()=>document.querySelector('[data-hlm=share]').click()); await W(400);
ok('Share lists the banquet book, social graphics and the coach’s workbook, each with an icon', await ev(()=>{ const R=[...document.querySelectorAll('#rvHigh [data-shx]')]; return R.map(x=>x.dataset.shx).join()==='book,gfx,wb'&&R.every(x=>x.querySelector('svg.ic')); }));
ok('…and says nothing coach-only goes in them', await ev(()=>/Never in any of these: next steps, growth focus or award candidates/.test(document.querySelector('#rvHigh .sh').textContent)));
await P.reload(); await P.waitForFunction(()=>window.MSApp); await W(600); await openHigh();
ok('the Share mode is remembered', await ev(()=>!!document.querySelector('#rvHigh .sh')&&document.querySelector('[data-hlm=share]').getAttribute('aria-pressed')==='true'));
for(const [k,t] of [['book','Banquet book'],['gfx','Social graphics'],['wb','Coach’s workbook']]){ await ev(k=>document.querySelector(`[data-shx=${k}]`).click(),k); await W(900);
  ok(`${t} opens as a sheet`, await ev(t=>document.querySelector('#modal h2').textContent===t,t)); await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(250); }
ok('Settings > Data > Export has the same three', await ev(()=>{ document.querySelector('#openSettings').click(); const r=['exBook','exGfx','exWb'].every(id=>!!document.querySelector('#'+id)); document.querySelector('#exWb').click(); return r&&document.querySelector('#modal h2').textContent==='Coach’s workbook'; }));
await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(250);
const tgt=await ev(()=>{ const B=[...document.querySelectorAll('#rvHigh .hl-mode button,#rvHigh [data-shx]')]; return B.every(x=>x.getBoundingClientRect().height>=43.5); });
ok('tap targets at least 44 pt', tgt);

console.log('2. Runner photos (Team tab > profile > Edit)');
const jpg=path.join(OUT,'e2e48-photo.jpg'); fs.mkdirSync(OUT,{recursive:true});
fs.writeFileSync(jpg,Buffer.from(await ev(()=>{ const c=document.createElement('canvas'); c.width=900; c.height=1200; const x=c.getContext('2d'); x.fillStyle='#e01010'; x.fillRect(0,0,900,1200); return c.toDataURL('image/jpeg',0.9).split(',')[1]; }),'base64'));
await ev(()=>{ document.querySelector('.tab[data-tab=team]').click(); }); await W(400);
await ev(()=>document.querySelector('#teamList [data-id="f0"] [data-t=open]').click()); await W(400); await ev(()=>document.querySelector('#profEdit').click()); await W(400);
ok('the Edit sheet has Add a photo (for the banquet book)', await ev(()=>/Add a photo/.test(document.querySelector('#modal [data-ph=pick]').textContent)&&/for the banquet book/.test(document.querySelector('#modal .ph-field').textContent)));
await (await P.$('#modal [data-ph=file]')).uploadFile(jpg); await P.waitForFunction(()=>!!document.querySelector('#modal .ph-thumb'),{timeout:8000}).catch(()=>{});
const ph=await ev(()=>MSApp.photo('f0'));
ok('the photo is kept, at most 600 px on the long side and under 300 KB', ph&&Math.max(ph.w,ph.h)<=600&&ph.len<=300000&&ph.h>ph.w, JSON.stringify(ph));
ok('…the sheet shows it, with Change photo and Remove', await ev(()=>!!document.querySelector('#modal .ph-thumb')&&/Change photo/.test(document.querySelector('#modal [data-ph=pick]').textContent)&&!!document.querySelector('#modal [data-ph=rm]')));
ok('…never in the live-data entry (its own IndexedDB database)', await ev(()=>!/data:image\/jpeg/.test(localStorage.getItem('mustang-splits:v1'))));
await ev(()=>document.querySelector('#modal [data-ph=rm]').click()); await W(500);
ok('Remove: gone, with an Undo', await ev(()=>!MSApp.photo('f0')&&/Photo removed/.test(document.querySelector('#snack').textContent)));
await ev(()=>document.querySelector('#snack button').click()); await W(500);
ok('…Undo brings it back', await ev(()=>!!MSApp.photo('f0')));
ok('…and Recently deleted kept a copy meanwhile (now restored)', await ev(()=>!MSApp.trashKinds().some(k=>k.kind==='photo')));
await ev(()=>document.querySelector('#modal [data-x=done]')&&document.querySelector('#modal [data-x=done]').click()); await W(300);
await ev(()=>{ document.querySelector('[data-profback]')&&document.querySelector('[data-profback]').click(); }); await W(300);

console.log('3. The banquet book');
const run=async o=>ev(async o=>{ const r=await MSApp.bookPages(2026,o); return {n:r.n,w:r.w,h:r.h,bad:r.log.filter(l=>l.w>l.box[1]+0.5||l.x<l.box[0]-0.5).map(l=>l.t).slice(0,5),cut:r.log.filter(l=>!l.pill&&!l.full.replace(/\s/g,'').includes(l.t.replace(/\s/g,''))).length,
  text:r.log.map(l=>l.t).join('\n'),lines:r.log.length}; },o);
const B1=await run({team:'both',full:false,awards:true,ms:false});
ok('pages: cover, Girls and Boys, every meet, one per runner, the season by the numbers', B1.n>=1+2+7+14+1&&B1.w===1650&&B1.h===1275, `${B1.n} pages`);
ok('…every line of text fits its box (never cut)', !B1.bad.length&&!B1.cut, B1.bad.join(' | '));
ok('…cover, team pages, meets with weather, runner stories, closing page', /Little Chute Mustangs/.test(B1.text)&&/Girls: the season at a glance/.test(B1.text)&&/Weather: /.test(B1.text)&&/Avery opened at/.test(B1.text)&&/The season by the numbers/.test(B1.text)&&/Biggest improvements/.test(B1.text));
ok('…celebrations only: nothing coach-only, no health reason or note (an Injury-tagged race is in the data)', !COACH.test(B1.text), (B1.text.match(COACH)||[''])[0]);
ok('…no awards page while no recipient is marked', !/^Awards$/m.test(B1.text));
await ev(()=>{ MSApp.awPut('s-2026',{k:'s',season:2026},{recip:{'G.mvr':['f0'],'B.letter':['f7','f8']}}); MSApp.awPut('r-2026-f0',{k:'r',season:2026,aid:'f0'},{captain:true,standing:'yes'}); });
const B2=await run({team:'both',full:false,awards:true,ms:false}), B3=await run({team:'both',full:false,awards:false,ms:false});
const awPage=B2.text.slice(B2.text.indexOf('\nAwards\n'));
ok('Include awards: an awards page with the marked recipients', B2.n===B1.n+1&&/Most Valuable Runner/.test(awPage)&&/Avery Lindqvist/.test(awPage)&&/Varsity Letter/.test(awPage), `${B2.n} vs ${B1.n}`);
ok('…only names: no math, ranks, candidates, Captain or good standing', !/= \d+ \(|Tie|candidate|Captain|standing|#\d/.test(awPage));
ok('…switched off: no awards page and no award name anywhere', B3.n===B1.n&&!/Most Valuable|Varsity Letter|Award/.test(B3.text));
const B4=await run({team:'G',full:true,awards:false,ms:true});
ok('Girls only, full stats: fewer pages, every race with paces and team places', B4.n<B1.n&&/Every race: /.test(B4.text)&&/\/mi/.test(B4.text)&&/Team place/.test(B4.text)&&!/Boys: the season at a glance/.test(B4.text), `${B4.n} pages`);
ok('…full stats is still never coach-only', !COACH.test(B4.text.replace(/Varsity Letter/g,'')), (B4.text.match(COACH)||[''])[0]);
const pdf=await ev(async()=>{ const bl=await MSApp.bookPdf(2026,{team:'both',full:false,awards:true}), all=await bl.text(); return {type:bl.type,size:bl.size,head:all.slice(0,8),pages:(all.match(/\/Type \/Page\b/g)||[]).length,box:(all.match(/\/MediaBox \[0 0 792 612\]/g)||[]).length,full:(all.match(/q 792\.00 0 0 612\.00 0\.00 0\.00 cm/g)||[]).length}; });
ok('the PDF: landscape letter, every page edge to edge', pdf.head.startsWith('%PDF')&&pdf.pages===B2.n&&pdf.box===pdf.pages&&pdf.full===pdf.pages, JSON.stringify(pdf));
// the photo on its runner's page: Avery (f0) is the first girl alphabetically
const red=await ev(async()=>{ const r=await MSApp.bookPages(2026,{team:'G',full:false,awards:false,ms:false},true); const pg=r.imgs.findIndex((_,i)=>i>0&&i<r.n);
  const look=async i=>{ const im=new Image(); im.src='data:image/jpeg;base64,'+r.imgs[i]; await im.decode(); const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const x=c.getContext('2d'); x.drawImage(im,0,0); return [...x.getImageData(238,400,1,1).data]; };
  const out=[]; for(let i=0;i<r.n;i++) out.push(await look(i)); return out; });
ok('the runner’s photo is on their page (and only theirs)', red.filter(p=>p[0]>200&&p[1]<60&&p[2]<60).length===1, JSON.stringify(red.filter(p=>p[0]>200&&p[1]<60)));
ok('no page errors so far', !P.errs.length, P.errs.join(' | '));

console.log('4. Social graphics');
const G=await ev(async()=>{ const out=[]; const BG=['stripes','navy','carolina','team','split','light']; let k=0; for(const kind of ['recap','pr','team','wrap']) for(const size of ['sq','story']) for(const names of ['full','first','init']){ const bg=BG[k++%BG.length]; const g=await MSApp.gfx(2026,{kind,size,names,bg,team:'both'});
    out.push({kind,size,names,w:g.w,h:g.h,n:g.log.length,bad:g.log.filter(l=>l.w>l.box[1]+0.5||l.x<-0.5||l.x+l.w>g.w+0.5||l.y>g.h).map(l=>l.t),cut:g.log.filter(l=>!l.pill&&!l.full.replace(/\s/g,'').includes(l.t.replace(/\s/g,''))).map(l=>l.t),text:g.log.map(l=>l.t).join(' ')}); } return out; });
ok('every kind (meet recap, PR spotlight, team milestone, season wrap) in square 1080 × 1080 and story 1080 × 1920', G.every(g=>g.n>3&&g.w===1080&&g.h===(g.size==='story'?1920:1080)), G.filter(g=>g.n<=3).map(g=>g.kind+g.size).join());
ok('…every line fits its box, nothing cut', G.every(g=>!g.bad.length&&!g.cut.length), JSON.stringify(G.filter(g=>g.bad.length||g.cut.length).map(g=>[g.kind,g.size,g.bad,g.cut])));
ok('…celebrations only', G.every(g=>!COACH.test(g.text)), (G.map(g=>g.text).join(' ').match(COACH)||[''])[0]);
ok('“Cross Country” in Title Case at the top of every graphic', G.every(g=>/Cross Country · 2026/.test(g.text)&&!/Cross country/.test(g.text)));
// every name: all the runners with a highlight fit on the meet recap (two columns when needed), no “+ n more”
const RC=await ev(async()=>{ const L=MSApp.latestMeet('2026-10-01'), want=L.stories.filter(s=>s.hl.some(h=>h.b)).map(s=>s.a.name), out={want:want.length};
  for(const size of ['sq','story']){ const g=await MSApp.gfx(2026,{kind:'recap',size,names:'full',team:'both',pick:'2026-10-01'}), t=g.log.map(l=>l.full).join('\n'); out[size]={all:want.every(n=>t.includes(n)),more:g.log.some(l=>/^\+ \d+ more$/.test(l.t))}; }
  const w=await MSApp.gfx(2026,{kind:'wrap',size:'sq',names:'full',team:'both'}); out.wrap=w.log.some(l=>/^\+ \d+ more$/.test(l.t)); return out; });
ok(`every name fits on the meet recap (${RC.want} runners with a highlight), square and story, and on the square season wrap`, RC.want>=10&&RC.sq.all&&!RC.sq.more&&RC.story.all&&!RC.story.more&&!RC.wrap, JSON.stringify(RC));
// backgrounds: six, each in every kind fits (above); remembered; swatches are 44 pt and named
const BGS=await ev(async()=>{ const out=[]; for(const bg of ['stripes','navy','carolina','team','split','light']) for(const team of ['G','B','both']){ const g=await MSApp.gfx(2026,{kind:'wrap',size:'story',names:'full',bg,team});
  out.push(g.log.filter(l=>l.w>l.box[1]+0.5).length); } return out; });
ok('six backgrounds (navy stripes, navy, Carolina blue, team colour, navy and blue, light), each with every team, every line fits', BGS.length===18&&BGS.every(n=>n===0), BGS.join());
const gpr=G.filter(g=>g.kind==='pr'), nm=await ev(()=>MSApp.gfxChoices(2026,'pr')[0].label.split(':')[0]);
ok('names: full, first name only, or initials', gpr.find(g=>g.names==='full').text.includes(nm)&&gpr.find(g=>g.names==='first').text.includes(nm.split(' ')[0])&&!gpr.find(g=>g.names==='first').text.includes(nm)&&gpr.find(g=>g.names==='init').text.includes(nm.split(' ').map(w=>w[0]+'.').join(' ')), nm);
// long names: every length from 1 to 60 characters, in every kind and size
const L=await ev(async LONG=>{ const R=MSApp.getRoster().filter(a=>a.gender==='G'), orig=R.map(a=>a.name), bad=[]; let n=0;
  for(let len=1;len<=60;len+=1){ R.forEach((a,i)=>{ const base=LONG[i%LONG.length]; let s=base; while(s.length<len) s+=' '+base; MSApp.renameRunner(a.id,s.slice(0,len).trim()||'W'); });
    for(const kind of ['recap','pr','wrap']) for(const size of ['sq','story']){ const g=await MSApp.gfx(2026,{kind,size,names:'full',team:'G',bg:len%2?'light':'stripes'}); n++;
      g.log.forEach(l=>{ if(l.w>l.box[1]+0.5||l.x<-0.5||l.x+l.w>g.w+0.5||(!l.pill&&!l.full.replace(/\s/g,'').includes(l.t.replace(/\s/g,'')))) bad.push(`${len}/${kind}/${size}: ${l.t}`); }); } }
  R.forEach((a,i)=>MSApp.renameRunner(a.id,orig[i])); return {n,bad:bad.slice(0,6),count:bad.length}; },LONG);
ok(`long names: every length from 1 to 60 characters fits without truncation (${L.n} graphics)`, L.count===0, L.bad.join(' | '));
const LB=await ev(async()=>{ const a=MSApp.getRoster().find(x=>x.id==='f0'), was=a.name; MSApp.renameRunner('f0','Bartholomew-Alexander Montgomery-Featherstonehaugh III'); const r=await MSApp.bookPages(2026,{team:'G',full:true,awards:true,ms:false}); MSApp.renameRunner('f0',was);
  return r.log.filter(l=>l.w>l.box[1]+0.5||(!l.pill&&!l.full.replace(/\s/g,'').includes(l.t.replace(/\s/g,'')))).map(l=>l.t); });
ok('…and in the banquet book (a 53-character name)', !LB.length, LB.join(' | '));
// the sheet: preview first, then share; names remembered
await openHigh(); await ev(()=>document.querySelector('[data-shx=gfx]').click()); await W(300);
ok('the sheet previews the graphic before sharing', await P.waitForFunction(()=>{ const i=document.querySelector('#gxImg'), s=document.querySelector('#modal [data-x=share]'); return i&&i.src.startsWith('data:image/png')&&i.naturalWidth===1080&&s&&!s.disabled; },{timeout:10000}).then(()=>true,()=>false));
await ev(()=>document.querySelector('#modal [data-gx=names][data-v=init]').click()); await W(300); await ev(()=>document.querySelector('#modal [data-gx=size][data-v=story]').click()); await W(300);
ok('…Story and Initials redraw it (1080 × 1920)', await P.waitForFunction(()=>{ const i=document.querySelector('#gxImg'); return i&&i.naturalHeight===1920; },{timeout:10000}).then(()=>true,()=>false));
await ev(()=>document.querySelector('#modal [data-x=done]').click()); await P.reload(); await P.waitForFunction(()=>window.MSApp); await W(600); await openHigh(); await ev(()=>document.querySelector('[data-shx=gfx]').click()); await W(500);
ok('…the names choice is remembered', await ev(()=>document.querySelector('#modal [data-gx=names][data-v=init]').getAttribute('aria-pressed')==='true'));
ok('Background: six named swatches, 44 pt', await ev(()=>{ const B=[...document.querySelectorAll('#modal [data-gx=bg]')]; return B.length===6&&B.every(b=>b.getAttribute('aria-label')&&b.getBoundingClientRect().height>=43.5&&b.getBoundingClientRect().width>=43.5)&&B[0].getAttribute('aria-pressed')==='true'; }));
await ev(()=>document.querySelector('#modal [data-gx=bg][data-v=light]').click()); await W(400);
ok('…choosing one redraws the preview and names it', await P.waitForFunction(()=>{ const i=document.querySelector('#gxImg'); return i&&i.naturalWidth>0&&/Light/.test(document.querySelector('#modal .gx-bg-row').textContent)&&document.querySelector('#modal [data-gx=bg][data-v=light]').getAttribute('aria-pressed')==='true'; },{timeout:10000}).then(()=>true,()=>false));
await ev(()=>document.querySelector('#modal [data-x=done]').click()); await P.reload(); await P.waitForFunction(()=>window.MSApp); await W(600); await openHigh(); await ev(()=>document.querySelector('[data-shx=gfx]').click()); await W(500);
ok('…and remembered', await ev(()=>document.querySelector('#modal [data-gx=bg][data-v=light]').getAttribute('aria-pressed')==='true'));
await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(200);
ok('the sheets’ content fits a 320-pt phone and their buttons are 44 pt (the Data tab’s nav bar overflow is the known 3.17 issue)', await (async()=>{ await P.setViewport({width:320,height:700,isMobile:true,hasTouch:true}); let good=true;
  for(const k of ['book','gfx','wb']){ await ev(k=>document.querySelector(`[data-shx=${k}]`).click(),k); await W(700);
    const r=await ev(()=>{ const m=document.querySelector('#modal'), M=m.querySelector('.modal')||m, W2=M.getBoundingClientRect().right; const wide=[...m.querySelectorAll('*')].filter(n=>n.offsetParent&&n.getBoundingClientRect().right>W2+0.5&&!n.closest('.gx-prev')).map(n=>n.className||n.tagName);
      const small=[...m.querySelectorAll('button,select')].filter(x=>x.offsetParent&&x.getBoundingClientRect().height<43.5).map(x=>(x.textContent||x.tagName).trim().slice(0,20)+':'+Math.round(x.getBoundingClientRect().height)); return [...wide.slice(0,3),...small.slice(0,4)]; });
    if(r.length){ good=false; console.log('    '+k+': '+r.join(', ')); }
    await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(250); }
  await P.setViewport({width:390,height:844,isMobile:true,hasTouch:true}); return good; })());

console.log('5. The coach’s workbook');
const wb=await ev(()=>MSApp.workbook(2026)), file=path.join(OUT,'e2e48-workbook.xlsx'); fs.writeFileSync(file,Buffer.from(wb.b64,'base64'));
const Z=unzip(fs.readFileSync(file)), names=Object.keys(Z);
ok('a zip with the Office Open XML parts', ['[Content_Types].xml','_rels/.rels','xl/workbook.xml','xl/_rels/workbook.xml.rels','xl/styles.xml','xl/sharedStrings.xml','docProps/core.xml','docProps/app.xml'].every(n=>names.includes(n))&&names.filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n)).length===8, names.join());
const wf=await ev(Z=>Object.entries(Z).filter(([n,x])=>new DOMParser().parseFromString(x,'application/xml').querySelector('parsererror')).map(([n])=>n),Z);
ok('every part is well-formed XML', !wf.length, wf.join());
const sheetNames=[...Z['xl/workbook.xml'].matchAll(/<sheet name="([^"]+)"/g)].map(m=>m[1].replace(/&amp;/g,'&'));
ok('eight sheets in order', sheetNames.join('|')==='Season board|Meet grid|Splits|Progress|Team|Training paces|Weather|Raw data', sheetNames.join('|'));
const order=(xml,root,seq)=>{ const body=xml.slice(xml.indexOf('<'+root)); const inner=body.slice(body.indexOf('>')+1); const tags=[]; let depth=0; for(const m of inner.matchAll(/<(\/?)([A-Za-z0-9:]+)([^>]*?)(\/?)>/g)){ const close=m[1], self=m[4]||m[3].endsWith('/'); if(close){ depth--; continue; } if(depth===0) tags.push(m[2]); if(!self) depth++; }
  const idx=tags.filter(t=>t!==root).map(t=>seq.indexOf(t)); return idx.every((v,i)=>v>=0&&(i===0||v>=idx[i-1]))?'':tags.join(','); };
const sh=i=>Z[`xl/worksheets/sheet${i}.xml`], badOrder=[1,2,3,4,5,6,7,8].map(i=>order(sh(i),'worksheet',WS_ORDER)).filter(Boolean);
ok('every sheet’s parts in the schema’s order (no repair prompt)', !badOrder.length, badOrder.join(' / '));
ok('styles in the schema’s order', !order(Z['xl/styles.xml'],'styleSheet',SS_ORDER));
const nXf=+(Z['xl/styles.xml'].match(/<cellXfs count="(\d+)"/)||[])[1], nDxf=+(Z['xl/styles.xml'].match(/<dxfs count="(\d+)"/)||[])[1], uniq=+(Z['xl/sharedStrings.xml'].match(/uniqueCount="(\d+)"/)||[])[1];
const refsOk=[1,2,3,4,5,6,7,8].every(i=>[...sh(i).matchAll(/ s="(\d+)"/g)].every(m=>+m[1]<nXf)&&[...sh(i).matchAll(/<c [^>]*t="s"[^>]*><v>(\d+)<\/v>/g)].every(m=>+m[1]<uniq)&&[...sh(i).matchAll(/dxfId="(\d+)"/g)].every(m=>+m[1]<nDxf));
ok('every style, shared string and colour rule points at something that exists', refsOk&&(Z['xl/sharedStrings.xml'].match(/<si>/g)||[]).length===uniq);
const fmts=Object.fromEntries([...Z['xl/styles.xml'].matchAll(/<numFmt numFmtId="(\d+)" formatCode="([^"]+)"/g)].map(m=>[m[1],m[2].replace(/&quot;/g,'"')]));
const xfs=[...Z['xl/styles.xml'].slice(Z['xl/styles.xml'].indexOf('<cellXfs')).matchAll(/<xf numFmtId="(\d+)"/g)].map(m=>fmts[m[1]]||m[1]);
const e2=(sh(1).match(/<c r="E2"([^>]*)>(.*?)<\/c>/)||[]);
ok('times are real time values with a time format (Season best: [m]:ss.0), not text', e2[0]&&!/t="s"/.test(e2[1])&&/^<v>0\.0\d+<\/v>$/.test(e2[2])&&xfs[+e2[1].match(/s="(\d+)"/)[1]]==='[m]:ss.0', e2[0]);
ok('Season board: frozen header and name column, filters on, colour scales on the improvement columns, widths set', /<pane xSplit="1" ySplit="1" topLeftCell="B2" activePane="bottomRight" state="frozen"\/>/.test(sh(1))&&/<autoFilter ref="A1:N\d+"\/>/.test(sh(1))&&/conditionalFormatting sqref="I2:I\d+"><cfRule type="colorScale"/.test(sh(1))&&/conditionalFormatting sqref="J2:J\d+"/.test(sh(1))&&/<col min="1" max="1" width="26" customWidth="1"\/>/.test(sh(1))&&/_xlnm\._FilterDatabase" localSheetId="0"/.test(Z['xl/workbook.xml']));
const board=await ev(()=>MSApp.wbSheets(2026));
const gb=[...sh(1).matchAll(/<c r="B(\d+)"[^>]*t="s"[^>]*><v>(\d+)<\/v>/g)].map(m=>[...Z['xl/sharedStrings.xml'].matchAll(/<si><t[^>]*>([^<]*)<\/t><\/si>/g)][+m[2]][1]);
gb.shift(); ok('Season board: Girls, then Boys', gb.length>=14&&gb.indexOf('Boys')===gb.filter(x=>x==='Girls').length&&gb.slice(gb.indexOf('Boys')).every(x=>x==='Boys'), gb.join());
ok('Meet grid: three header rows (meet, date, course), a season-average formula per runner, each time coloured against it', /<f>IF\(COUNT\(D4:[A-Z]+4\)&gt;0,AVERAGE\(D4:[A-Z]+4\),&quot;&quot;\)<\/f><v>0\.0\d+<\/v>/.test(sh(2))&&(sh(2).match(/cfRule type="expression"/g)||[]).length===2&&/<pane xSplit="3" ySplit="3"/.test(sh(2)));
ok('Splits: every checkpoint split and pace per mile (the hand-timed race with splits)', (sh(3).match(/<row /g)||[]).length>=1+15&&/<autoFilter/.test(sh(3)));
const sp=(sh(4).match(/<x14:sparkline>/g)||[]).length, prog=board.find(s=>s.name==='Progress');
ok('Progress: season bests by year, a “vs the season before” formula and a sparkline per runner (Excel’s x14)', sp>=10&&sp===prog.spark&&/<extLst><ext uri="\{05C60535-1F16-4fd2-B633-F4F36F0B64E0\}"/.test(sh(4))&&/<xm:f>'Progress'!C2:D2<\/xm:f><xm:sqref>F2<\/xm:sqref>/.test(sh(4))&&/<f>IF\(AND\(ISNUMBER\(C2\),ISNUMBER\(D2\)\),ROUND\(\(C2-D2\)\*86400,1\),&quot;&quot;\)<\/f><v>-?\d/.test(sh(4)), `${sp} sparklines`);
ok('Team: top-5 average and 1–5 spread per meet, Girls and Boys, season averages as formulas', /Girls top-5 average/.test(Z['xl/sharedStrings.xml'])&&/<f>IF\(COUNT\(D2:D\d+\)&gt;0,AVERAGE\(D2:D\d+\)/.test(sh(5)));
ok('Training paces, Weather (with the Open-Meteo credit) and Raw data (every result, official and hand-timed)', /Needs a race|Easy \(fast end\)/.test(Z['xl/sharedStrings.xml'])&&/Weather data by Open-Meteo\.com/.test(Z['xl/sharedStrings.xml'])&&/<t xml:space="preserve">Official<\/t>/.test(Z['xl/sharedStrings.xml'])&&/Hand-timed/.test(Z['xl/sharedStrings.xml'])&&(sh(8).match(/<row /g)||[]).length>100);
ok('Girls/Boys colour accents', /<fgColor rgb="FFF7E4F0"\/>/.test(Z['xl/styles.xml'])&&/<fgColor rgb="FFDDEFF7"\/>/.test(Z['xl/styles.xml']));
const allText=Z['xl/sharedStrings.xml'].replace(/<[^>]+>/g,'\n');
ok('nothing coach-only: no next step, award, Captain, standing, varsity, health reason or note (a tagged race says “left out of trends”)', !COACH.test(allText), (allText.match(COACH)||[''])[0]);
// Excel and Numbers: open it (as a double-click would), read cells back, close it without saving
const apps=process.platform==='darwin'&&process.env.XLSX_APPS!=='0';
const viaApp=(app,script,args)=>new Promise(res=>{ try{ execFileSync('open',['-g','-a',app,file]); }catch(e){ return res('OPEN FAILED '+e.message); }
  execFile('osascript',[path.join(__dirname,'tools',script),...args],{timeout:90000},(err,out)=>res(err?'ERROR '+(err.killed?'timed out (a dialog, such as a repair prompt, is waiting)':err.message):out)); });
if(apps&&fs.existsSync('/Applications/Microsoft Excel.app')){ const r=await viaApp('Microsoft Excel','xl-check.applescript',['e2e48-workbook.xlsx','Meet grid!C4','Progress!E2','Season board!E2']);
  ok('Excel opens it without a repair prompt: 8 sheets, formulas calculated, times shown as times', /^sheets=8/.test(r)&&/S Season board\|Runner\|/.test(r)&&/C Meet grid!C4\|\d+:\d\d\.\d\|=IF\(COUNT/.test(r)&&/C Progress!E2\|[+-]?\d+\.\d s\|=IF\(AND/.test(r)&&/C Season board!E2\|\d+:\d\d\.\d\|/.test(r), r.replace(/\n/g,' / ').slice(0,300)); }
else console.log('  (Excel not on this Mac, or XLSX_APPS=0: not opened in Excel)');
if(apps&&fs.existsSync('/Applications/Numbers.app')){ const was=(()=>{ try{ execFileSync('pgrep',['-x','Numbers']); return true; }catch(e){ return false; } })();
  const r=await viaApp('Numbers','numbers-check.applescript',['e2e48-workbook','Meet grid!C4','Progress!E2']);
  ok('Numbers opens it: 8 sheets, formulas calculated', /^sheets=8/.test(r)&&/C Meet grid!C4\|\d+:\d\d/.test(r)&&/C Progress!E2\|[+-]?\d+\.\d s/.test(r), r.replace(/\n/g,' / ').slice(0,300));
  if(!was) try{ execFileSync('osascript',['-e','tell application "Numbers" to quit']); }catch(e){} }
else console.log('  (Numbers not on this Mac, or XLSX_APPS=0: not opened in Numbers)');

console.log('6. Backups carry the photos');
const bk=await ev(async()=>{ const d=await MSApp.backupData(); return {n:(d.photos||[]).length,aid:(d.photos||[])[0]&&d.photos[0].aid,inState:/data:image/.test(JSON.stringify(d.state))}; });
ok('Back up includes each runner’s photo (beside the live data, not in it)', bk.n===1&&bk.aid==='f0'&&!bk.inState, JSON.stringify(bk));
ok('no page errors', !P.errs.length, P.errs.join(' | '));
await P.close();

console.log('7. Two coach phones share a photo (emulator)');
if(!process.env.NO_EMU){ const errs=[];
  const [PA,PB]=await H.team(b,['Coach Ann','Coach Ben'],errs,S=>{ S.roster=[{id:'q1',name:'Quinn Ash',group:'',gender:'G'}]; });
  await PA.evaluate(async()=>{ const c=document.createElement('canvas'); c.width=300; c.height=400; const x=c.getContext('2d'); x.fillStyle='#1060e0'; x.fillRect(0,0,300,400); const b=await new Promise(r=>c.toBlob(r,'image/jpeg',0.9)); await MSApp.setPhotoFile('q1',new File([b],'q.jpg',{type:'image/jpeg'})); });
  ok('Coach Ben’s phone gets the photo Coach Ann added', await H.waitFor(PB,()=>!!MSApp.photo('q1'),null,15000));
  ok('…and it’s marked as on the team on Coach Ann’s phone', await H.waitFor(PA,()=>{ const p=MSApp.photo('q1'); return p&&p.synced; },null,15000));
  ok('no errors on either phone', !errs.length, errs.join(' | '));
}
console.log(bad?`\n${bad} FAILED`:'\nall passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.log('CRASH',e); process.exit(2); });
