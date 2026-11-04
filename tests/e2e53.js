// 3.24: Varsity by default, JV tagging for awards. Fake names only.
// 1. The MVR arithmetic still gives 1.875 for the worked example.
// 2. Default: every high school result counts as Varsity right away (nothing waits to be confirmed); a race with more
//    than 7 counted as Varsity is flagged in Awards (Review) and in Data health.
// 3. JV inferred from an imported division label ("Junior Varsity", "Junior", "Boys JV"); "Varsity" and no label = V.
// 4. Tagging after a race: Edit Varsity/JV for a meet (Girls and Boys apart), bulk edit with one Undo, versions with
//    the coach's name and time; the Level switch in a runner's time editor; the JV badge only on result rows.
// 5. Tagging in race setup: Mark JV…, press and hold a name, This is the JV race, a runner added to an all-JV race;
//    the tags travel with the saved race and the awards leave those results out.
// 6. No JV on stopwatches, highlights, shared recaps or graphics.
// 7. Two coach phones (emulator): a level set on one phone reaches the other (hand-timed and, by a member, official).
const puppeteer=require('puppeteer-core'), T=require('./tools/fake-team.js'), H=require('./tools/phones.js'), fs=require('fs'), path=require('path');
const {seed}=require('./tools/fake-season.js');
const URL=process.env.URL||'http://localhost:8765/', OUT=path.join(__dirname,'out'); fs.mkdirSync(OUT,{recursive:true});
// two more girls and a sixth race day (10/10) with all eight girls and the six boys: eight counted as Varsity = a flag
seed.roster.push({id:'g6',name:'Greta Olsen',group:'',gender:'G'},{id:'g7',name:'Hana Petrov',group:'',gender:'G'});
const t6={g0:1190,g1:1240,g2:1280,g3:1300,g4:1230,g5:1350,g6:1402,g7:1455,b0:1025,b1:1060,b2:1120,b3:1100,b4:1080,b5:1150};
['G','B'].forEach(g=>{ const ids=seed.roster.filter(a=>a.gender===g).map(a=>a.id), rid='x6'+g;
  seed.raceLog.unshift({id:'h'+rid,date:'2026-10-10',savedAtMs:Date.parse('2026-10-10T20:00'),uploaded:false,edits:[],race:{name:'Lake Invite',raceId:rid,courseId:'cA',courseName:'',goalSrc:'none',meetId:'mx',seriesId:'sF',division:g+'V',checkpoints:[{id:'k3',name:'Finish',dist:5000,unit:'m'}],rows:ids.map(id=>({id,name:seed.roster.find(a=>a.id===id).name,group:'',goal:null,cells:[]})),marks:ids.map(id=>({id:rid+id,ci:0,rid:id,t:t6[id],dev:'d',byName:'',at:0,chosen:false,deleted:false,hist:[]}))}}); });
seed.series.push({id:'sF',name:'Lake Invite'}); seed.meets.push({id:'mx',seriesId:'sF',courseId:'cA',date:'2026-10-10',time:'',kind:'Invite',levels:['V','JV'],season:2026});
// an official results file (history format) with division labels, for section 3
const res=(date,meet,division,time_s,place)=>({season:2026,grade:11,level:'HS',distance:'5K',distance_m:5000,date,time:'',time_s,place,flag:'',meet,division,meet_name_cut_off:false,possible_duplicate_of:null});
const HIST={format:'mustang-splits-history/v1',generated:'2026-10-19',source:'e2e53 fake results',notes:'',athletes:[
  {name:'Ada Fern',aliases:[],school:'Fake HS',results:[res('2026-09-05','Opener Invite','Girls Junior Varsity',1216,14)]},
  {name:'Bea Holt',aliases:[],school:'Fake HS',results:[res('2026-09-05','Opener Invite','Girls Varsity',1261,9)]},
  {name:'Cora Lind',aliases:[],school:'Fake HS',results:[res('2026-09-05','Opener Invite','',1301,20)]},
  {name:'Dot Marsh',aliases:[],school:'Fake HS',results:[res('2026-09-05','Opener Invite','Junior',1331,22)]},
  {name:'Abe Park',aliases:[],school:'Fake HS',results:[res('2026-09-05','Opener Invite','Boys JV',1041,5)]},
  {name:'Eve Nash',aliases:[],school:'Fake HS',results:[res('2026-10-17','River Run','',1232,8)]}]};
const HFILE=path.join(OUT,'e2e53-history.json'); fs.writeFileSync(HFILE,JSON.stringify(HIST));

(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const P=await T.open(b,{seed,url:URL,now:'2026-10-20T16:00:00'}); const ev=(f,...a)=>P.evaluate(f,...a);
const closeModal=async()=>{ await ev(()=>{ document.querySelector('#overlay').hidden=true; }); await W(150); };
const openAwards=async()=>{ await closeModal(); await ev(()=>{ document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=high]').click(); }); await W(400); await ev(()=>{ const s=document.querySelector('[data-hlm=season]'); if(s&&s.getAttribute('aria-pressed')!=='true') s.click(); }); await W(300); await ev(()=>{ const a=document.querySelector('[data-ssaw]'); if(a) a.click(); }); await W(500); };
const awards=g=>ev(g=>MSApp.awards(2026,g),g);
const levelOf=(aid,date)=>ev((aid,date)=>MSApp.levelOf(aid,date),aid,date);
const snackText=()=>ev(()=>{ const s=document.querySelector('#snack'); return s.hidden?'':s.textContent; });

console.log('1. The MVR example');
const ex=await ev(()=>MSApp.mvrCalc([{id:'r1',name:'Runner 1',places:[2,1,3,1,2,2,2,3]},{id:'r2',name:'Runner 2',places:[1,2,5,2,1,1,1,2]}],8,80));
ok('Runner 2: 1,2,5,2,1,1,1,2 = 15 (1.875) and wins', ex.rows.find(r=>r.id==='r2').avg===1.875&&ex.winners.join()==='r2', JSON.stringify(ex.winners));

console.log('2. Varsity by default');
await openAwards();
let G=await awards('G'), B=await awards('B');
ok('Girls: six race days all counted, nothing waiting to be confirmed', G.total===6&&G.unknown===0&&G.vDates.length===6, JSON.stringify([G.total,G.unknown,G.vDates]));
ok('every result is Varsity (no JV anywhere yet)', G.days.every(d=>d.JV.length===0)&&B.days.every(d=>d.JV.length===0));
ok('MVR calculates immediately: six girls ranked with the math', G.mvr.ranked.length===6&&G.mvr.ranked.every(r=>/ = \d+ \(/.test(r.math)), JSON.stringify(G.mvr.ranked.map(r=>r.math)));
ok('the Awards page no longer waits for levels to be confirmed', await ev(()=>{ const t=document.querySelector('#rvHigh .aw').textContent; return !/to confirm|until confirmed|Varsity at each meet|no Varsity or JV level|isn’t known/i.test(t); }));
ok('10/10 Girls: eight counted as Varsity = one flag (Awards and Data health), none for Boys', G.flags.length===1&&G.flags[0].date==='2026-10-10'&&G.flags[0].g==='G'&&G.flags[0].n===8&&B.flags.length===0, JSON.stringify(G.flags));
ok('the flag shows on the Awards page with a Review button, with an icon and the words', await ev(()=>{ const f=document.querySelector('#rvHigh .aw-flag'); return !!f&&!!f.querySelector('svg.ic')&&/Girls at Lake Invite/.test(f.textContent)&&/8 runners counted as Varsity/.test(f.textContent)&&!!f.querySelector('[data-awrev]')&&f.querySelector('[data-awrev]').getBoundingClientRect().height>=44; }));
const health=await ev(()=>MSApp.health());
ok('Data health lists it with a Review fix', health.some(x=>x.kind==='jv'&&/Girls at Lake Invite/.test(x.text)&&/8 runners/.test(x.text)), JSON.stringify(health.map(x=>x.kind)));
await ev(()=>document.querySelector('#rvHigh .aw-flag [data-awrev]').click()); await W(400);
ok('Review opens Edit Varsity/JV for that meet, Girls only, eight rows, All Varsity / All JV', await ev(()=>{ const m=document.querySelector('#modal .jv-sheet'); return !!m&&/Lake Invite/.test(m.textContent)&&m.querySelectorAll('.jv-grp').length===1&&m.querySelectorAll('[data-jvl=JV]').length===8&&!!m.querySelector('[data-jvall=JV][data-g=G]')&&/more than 7 Varsity/.test(m.textContent); }));
ok('the Save button is off with a reason until something changes', await ev(()=>{ const b=document.querySelector('#modal [data-x=yes]'); return b.disabled&&!!b.dataset.why; }));

console.log('4a. Edit Varsity/JV: a bulk edit with one Undo');
await ev(()=>document.querySelector('#modal [data-jvall=JV][data-g=G]').click()); await W(200);
ok('All JV: eight changes pending, counts update ("0 Varsity · 8 JV")', await ev(()=>{ const b=document.querySelector('#modal [data-x=yes]'); return b.textContent==='Save 8 changes'&&/0 Varsity · 8 JV/.test(document.querySelector('#modal .jv-grp h3').textContent); }));
await ev(()=>document.querySelector('#modal [data-x=yes]').click()); await W(600);
G=await awards('G');
ok('saved: 10/10 Girls has no Varsity runner, so it is no longer a varsity meet and the flag is gone', !G.vDates.includes('2026-10-10')&&G.flags.length===0&&G.days.find(d=>d.date==='2026-10-10'&&d.g==='G').JV.length===8, JSON.stringify([G.vDates,G.flags]));
ok('one Undo for the whole edit', /8 levels set/.test(await snackText()), await snackText());
const ent=await ev(()=>MSApp.raceLogEntry('hx6G'));
ok('append-only versions on the hand-timed race, with coach name and time', ent.edits.length===8&&ent.edits.every(v=>v.op==='level'&&v.level==='JV'&&v.byName==='Coach Ann'&&v.at>0&&v.rid), JSON.stringify(ent.edits[0]));
await ev(()=>document.querySelector('#snackBtn').click()); await W(600);
G=await awards('G'); const ent2=await ev(()=>MSApp.raceLogEntry('hx6G'));
ok('Undo: all eight back to Varsity, as eight more versions (nothing rewritten), the flag back', G.flags.length===1&&ent2.edits.length===16&&ent2.edits.slice(8).every(v=>v.op==='level'&&v.level===''), JSON.stringify([G.flags.length,ent2.edits.length]));
await ev(()=>MSApp.setLevels([{aid:'g7',date:'2026-10-10',level:'JV'}],true)); await W(300); G=await awards('G');
ok('one runner tagged JV: seven Varsity, the flag clears, her place is left out of the math', G.flags.length===0&&G.days.find(d=>d.date==='2026-10-10'&&d.g==='G').V.length===7&&!G.days.find(d=>d.date==='2026-10-10'&&d.g==='G').V.includes('g7'), JSON.stringify(G.flags));
const l7=await levelOf('g7','2026-10-10');
ok('levelOf: JV, set by Coach Ann', l7.lv==='JV'&&l7.src==='coach'&&l7.by==='Coach Ann', JSON.stringify(l7));
ok('the spreadsheet’s Awards tracker is filled (MVR rows), no "blank until confirmed"', await ev(()=>{ const sh=MSApp.sheet.content().sheets[0]; const t=sh.rows.map(r=>r.map(c=>c&&c.v!=null?c.v:c).join(' ')).join('\n'); return !/Blank until/.test(t)&&sh.keys.some(k=>k&&k.startsWith('mvr|G|')); }));

console.log('3. JV from an imported division label');
await T.load(P,{file:HFILE,schedule:false}); await W(800);
const L=await Promise.all([['g0','2026-09-05'],['g1','2026-09-05'],['g2','2026-09-05'],['g3','2026-09-05'],['b0','2026-09-05'],['g4','2026-10-17']].map(([a,d])=>levelOf(a,d)));
ok('"Girls Junior Varsity" = JV (imported label)', L[0].lv==='JV'&&L[0].src==='file', JSON.stringify(L[0]));
ok('"Girls Varsity" = V', L[1].lv==='V', JSON.stringify(L[1]));
ok('no label = Varsity by default', L[2].lv==='V'&&L[2].src==='default', JSON.stringify(L[2]));
ok('"Junior" (cut off) = JV; "Boys JV" = JV', L[3].lv==='JV'&&L[4].lv==='JV', JSON.stringify([L[3],L[4]]));
ok('an official-only day with no label (10/17) = Varsity', L[5].lv==='V'&&L[5].src==='default', JSON.stringify(L[5]));
G=await awards('G');
ok('awards: Ada’s 9/5 is out of her places (five days counted of the six she ran + 10/17 for Eve)', G.mvr.ranked.concat(G.mvr.out).find(r=>r.id==='g0').n===5, JSON.stringify(G.mvr.ranked.concat(G.mvr.out).map(r=>r.id+':'+r.n)));
await closeModal(); await ev(()=>MSApp.setLevels([{aid:'g0',date:'2026-09-05',level:'V'}],true)); await W(300);
const l0=await levelOf('g0','2026-09-05');
ok('a coach’s choice beats the label (V, set by a coach), written on the hand-timed race any member may edit', l0.lv==='V'&&l0.src==='coach', JSON.stringify(l0));
await ev(()=>MSApp.setLevels([{aid:'g4','date':'2026-10-17',level:'JV'}],true)); await W(300);
const l4=await levelOf('g4','2026-10-17');
ok('an official-only result takes the level as an edit on the official record', l4.lv==='JV'&&l4.src==='coach', JSON.stringify(l4));

console.log('4b. Data › Meets: the badge, Edit Varsity/JV, the Level switch');
await closeModal(); await ev(()=>{ document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=meets]').click(); }); await W(600);
await ev(()=>{ const d=document.querySelector('#histList details.hist-meet[data-meet="mx"]'); d.open=true; d.querySelectorAll('details.div-race').forEach(x=>{ x.open=true; }); }); await W(300);
ok('the 10/10 Girls race shows one JV badge (Hana), icon + word, and an Edit Varsity/JV button', await ev(()=>{ const d=document.querySelector('#histList details.hist-meet[data-meet="mx"]'); const r=[...d.querySelectorAll('details.div-race')].find(x=>/Girls/.test(x.querySelector('summary').textContent)); const bd=[...r.querySelectorAll('.rcard .bdg-jv')]; return bd.length===1&&!!bd[0].querySelector('svg.ic')&&bd[0].textContent.trim()==='JV'&&bd[0].closest('[data-rrow]').dataset.rrow==='g7'&&!!r.querySelector('[data-jvedit]'); }));
ok('no JV badge on Varsity runners (Boys race: none)', await ev(()=>{ const d=document.querySelector('#histList details.hist-meet[data-meet="mx"]'); const r=[...d.querySelectorAll('details.div-race')].find(x=>/Boys/.test(x.querySelector('summary').textContent)); return r.querySelectorAll('.bdg-jv').length===0; }));
await ev(()=>{ const d=document.querySelector('#histList details.hist-meet[data-meet="mx"]'); const r=[...d.querySelectorAll('details.div-race')].find(x=>/Girls/.test(x.querySelector('summary').textContent)); r.querySelector('[data-jvedit]').click(); }); await W(400);
ok('Edit Varsity/JV from the meet: Girls and Boys sections, the hint says where each level came from', await ev(()=>{ const m=document.querySelector('#modal .jv-sheet'); return !!m&&m.querySelectorAll('.jv-grp').length===2&&/set by Coach Ann/.test(m.textContent)&&/Varsity by default/.test(m.textContent); }));
await closeModal();
await ev(()=>{ const d=document.querySelector('#histList details.hist-meet[data-meet="mx"]'); const c=d.querySelector('[data-rcid^="g6:"]'); c.click(); }); await W(400);
ok('a runner’s time editor has a Level switch (Varsity | JV), 44 pt', await ev(()=>{ const s=document.querySelector('#modal .ts .ts-level'); return !!s&&s.querySelector('[data-tsl=V]').getAttribute('aria-pressed')==='true'&&s.querySelector('[data-tsl=JV]').getBoundingClientRect().height>=44; }));
await ev(()=>document.querySelector('#modal .ts [data-tsl=JV]').click()); await W(400);
const l6=await levelOf('g6','2026-10-10');
ok('JV from the switch: saved as a version, Undo offered', l6.lv==='JV'&&l6.src==='coach'&&/Greta Olsen: JV/.test(await snackText()), JSON.stringify(l6));
await ev(()=>document.querySelector('#snackBtn').click()); await W(400);
ok('…Undo puts her back to Varsity', (await levelOf('g6','2026-10-10')).lv==='V');

console.log('5. Tagging in race setup');
await closeModal(); await ev(()=>{ const s=document.querySelector('#snack'); s.hidden=true; }); await P.click('.tab[data-tab=watches]'); await W(400); await ev(()=>{ const b=document.querySelector('#newBtn'); if(!b.hidden) b.click(); }); await W(300); await ev(()=>{ const c=[...document.querySelectorAll('[data-new=race]')].find(x=>x.offsetParent); c.click(); }); await W(800);
ok('Mark JV… is off, with a reason, until runners are picked', await ev(()=>{ const b=document.querySelector('#v-race [data-ra=markjv]'); return !!b&&b.disabled&&/Pick runners first/.test(b.dataset.why||''); }));
await P.click('#v-race [data-pk=G]'); await W(600);
ok('eight girls picked; Mark JV… on; "This is the JV race" switch off', await ev(()=>MSApp.getRace().runners.length===8&&!document.querySelector('#v-race [data-ra=markjv]').disabled&&document.querySelector('#v-race [data-ra=jvall]').getAttribute('aria-checked')==='false'));
await P.click('#v-race [data-ra=markjv]'); await W(400);
ok('Mark JV sheet: a switch per picked runner, Girls heading', await ev(()=>{ const m=document.querySelector('#modal .jv-mark'); return !!m&&m.querySelectorAll('[data-jvm]').length===8&&/Girls/.test(m.textContent)&&/don’t count for awards/.test(m.textContent); }));
await P.click('#modal [data-jvm="g0"]'); await W(200); await P.click('#modal [data-x=done]'); await W(400);
ok('Ada tagged JV: on the race and marked on her name chip', await ev(()=>MSApp.getRace().runners.find(x=>x.id==='g0').jv===true&&!!document.querySelector('#v-race [data-rr="g0"] small.jv')&&!document.querySelector('#v-race [data-rr="g1"] small.jv')));
// press and hold a picked name (scrolled into the middle of the screen first; the mouse stands in for a finger)
const hold=async sel=>{ await ev(s=>document.querySelector(s).scrollIntoView({block:'center'}),sel); await W(250); const el=await P.$(sel); const bx=await el.boundingBox(); await P.mouse.move(bx.x+bx.width/2,bx.y+bx.height/2); await P.mouse.down(); await W(750); await P.mouse.up(); await W(300); };
await hold('#v-race [data-rr="g1"]');
ok('press and hold a picked name: an action sheet with Mark as JV', await ev(()=>{ const m=document.querySelector('#modal .as-group'); return !!m&&/Bea Holt/.test(m.textContent)&&!!m.querySelector('[data-as="0"]')&&m.querySelector('[data-as="0"]').textContent==='Mark as JV'; }));
await P.click('#modal [data-as="0"]'); await W(400);
ok('…Bea is JV', await ev(()=>MSApp.getRace().runners.find(x=>x.id==='g1').jv===true));
await P.click('#v-race [data-ra=jvall]'); await W(400);
ok('This is the JV race: everyone picked is JV, the switch is on', await ev(()=>MSApp.getRace().runners.every(x=>x.jv)&&document.querySelector('#v-race [data-ra=jvall]').getAttribute('aria-checked')==='true'));
await P.click('#v-race [data-rr="b0"]'); await W(600);
ok('a runner added to an all-JV race is JV too', await ev(()=>MSApp.getRace().runners.find(x=>x.id==='b0').jv===true));
await P.click('#v-race [data-rr="b0"]'); await W(400);
await hold('#v-race [data-rr="g1"]');
ok('press and hold again offers Mark as Varsity', await ev(()=>document.querySelector('#modal [data-as="0"]').textContent==='Mark as Varsity'));
await P.click('#modal [data-as="0"]'); await W(400);
ok('…Bea is Varsity again, the switch is off (not everyone is JV)', await ev(()=>!MSApp.getRace().runners.find(x=>x.id==='g1').jv&&document.querySelector('#v-race [data-ra=jvall]').getAttribute('aria-checked')==='false'));
// gun, finishes, save
await P.click('#readyBtn'); await W(200); await P.click('[data-ra=gun]'); await W(500);
ok('the running screen shows no JV marks', await ev(()=>!document.querySelector('#raceGrid .bdg-jv')&&!/\bJV\b/.test(document.querySelector('#raceGrid').textContent)));
await ev(()=>{ const r=MSApp.getRace(), ci=r.checkpoints.length-1, t={g0:1200,g1:1230,g2:1260,g3:1290,g4:1220,g5:1340,g6:1400,g7:1450}; MSApp.applyRemote({marks:{upsert:Object.entries(t).map(([id,s])=>({id:'f'+id,cp:r.checkpoints[ci].id,local:r.gun.local+s*1000,off:r.gun.off,runnerId:id,by:'o',byName:'Coach'})),remove:[]}}); }); await W(400);
await P.click('[data-ra=end]'); await W(300); await P.click('#modal [data-x=save]'); await W(1200); if(await P.$('#modal .pr-offer')){ await P.click('#modal [data-x=no]'); await W(); }
const saved=await ev(()=>{ const r=MSApp.getRace(); const e=r.saved&&MSApp.raceLogEntry(r.saved.id); return e&&{jv:e.race.rows.filter(x=>x.jv).map(x=>x.id).sort(),rows:e.race.rows.length}; });
ok('the tags are saved with the race (seven JV rows, Bea not)', saved&&saved.rows===8&&saved.jv.join()==='g0,g2,g3,g4,g5,g6,g7', JSON.stringify(saved));
ok('the finished race’s results show the JV badge on the tagged rows only', await ev(()=>{ const t=document.querySelector('#v-race .race-res'); if(!t) return false; t.open=true; const b=[...t.querySelectorAll('.rcard .bdg-jv')].map(x=>x.closest('[data-rrow]').dataset.rrow).sort(); return b.join()==='g0,g2,g3,g4,g5,g6,g7'; }));
const lS=await levelOf('g0','2026-10-20'), lV=await levelOf('g1','2026-10-20');
ok('levelOf: JV from race setup; Bea Varsity by default', lS.lv==='JV'&&lS.src==='setup'&&lV.lv==='V', JSON.stringify([lS,lV]));
G=await awards('G');
ok('awards: today’s race counts one Varsity runner (Bea) and seven JV', (()=>{ const d=G.days.find(x=>x.date==='2026-10-20'&&x.g==='G'); return d&&d.V.join()==='g1'&&d.JV.length===7; })(), JSON.stringify(G.days.find(x=>x.date==='2026-10-20')));

console.log('6. No JV outside result rows and Awards');
await P.click(await P.$('#raceClose:not([hidden])')?'#raceClose':'.tab[data-tab=watches]'); await W(400);
ok('Stopwatches tab: no JV', await ev(()=>!document.querySelector('#v-watches .bdg-jv, #grid .bdg-jv')&&!/\bJV\b/.test((document.querySelector('#grid')||{textContent:''}).textContent)));
const share=await ev(()=>[MSApp.seasonShare(2026),...MSApp.getRoster().map(a=>MSApp.seasonShare(2026,a.id))].join('\n'));
ok('shared season recaps never say JV or Varsity', !/\b(JV|varsity)\b/i.test(share));
const gfx=await ev(async()=>{ const r=await MSApp.gfx(2026,{kind:'recap',size:'sq',team:'both',pick:'2026-10-10',names:'full',bg:'stripes'}); return r.log.map(l=>l.t).join('\n'); });
ok('the meet recap graphic has no JV', !/\bJV\b/.test(gfx)&&/Hana Petrov/.test(gfx));
await openAwards();
ok('Highlights › Season (not Awards) has no JV badge; Awards’ Varsity / JV by meet lists the counts', await ev(()=>{ document.querySelector('[data-hlback]').click(); return !document.querySelector('#rvHigh .bdg-jv'); }));
// 3.24: Most Improved is one list per team (one award a year); a recipient marked before stays marked
await ev(()=>MSApp.awPut('s-2026',{k:'s',season:2026},{recip:{'G.mir':['g2']}})); await openAwards();
G=await awards('G');
ok('Most Improved: one ranked list from the three criteria, rank points summed, one Recommended', G.mir.list.length>=2&&G.mir.list[0].rank===1&&G.mir.list.every(p=>p.parts.length>=1&&p.pts>0)&&await ev(()=>{ const s=document.querySelector('#rvHigh #aw-mir').closest('.aw-sec'); return s.querySelectorAll('ol.aw-list').length===1&&!s.querySelector('h4')&&s.querySelectorAll('.bdg-best').length>=1&&/rank points|Rank points/i.test(s.textContent); }), JSON.stringify(G.mir.list.slice(0,3)));
ok('…the recipient marked earlier is still marked (Cora Lind)', await ev(()=>{ const s=document.querySelector('#rvHigh #aw-mir').closest('.aw-sec'); return /Recipient: Cora Lind/.test(s.textContent)&&s.querySelector('[data-awmark="G.mir|g2"]').getAttribute('aria-pressed')==='true'&&MSApp.getAwards().find(d=>d.id==='s-2026').recip['G.mir'].join()==='g2'; }));
await ev(()=>document.querySelector('[data-awvar]').click()); await W(400);
ok('Varsity / JV by meet: a row per race day and team with "n Varsity · n JV", a tap opens the editor', await ev(()=>{ const m=document.querySelector('#modal .aw-var'); const rows=[...m.querySelectorAll('.aw-dayrow')]; return rows.length>=12&&rows.some(r=>/7 Varsity · 1 JV of 8/.test(r.textContent))&&rows.every(r=>r.getBoundingClientRect().height>=44); }));
await ev(()=>{ [...document.querySelectorAll('#modal .aw-dayrow')].find(r=>/7 Varsity · 1 JV of 8/.test(r.textContent)).click(); }); await W(400);
ok('…the editor for that day', await ev(()=>!!document.querySelector('#modal .jv-sheet')&&/Lake Invite/.test(document.querySelector('#modal .jv-sheet').textContent)));
await closeModal();
ok('no page errors', !P.errs.length, P.errs.slice(0,3).join(' | '));

console.log('7. Two coach phones (emulator)');
const errs=[]; const seedFn=new Function('S',`Object.assign(S,${JSON.stringify({...seed,raceLog:seed.raceLog.filter(h=>h.date==='2026-10-10'||h.date==='2026-09-05')})})`);
const [A,Bp]=await H.team(b,['Coach Ann','Coach Bo'],errs,seedFn);
// A uploads this phone's races to the team
await A.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=meets]').click(); }); await W(600);
await A.evaluate(()=>{ const u=document.querySelector('[data-rlup]'); if(u) u.click(); }); await W(400); await A.evaluate(()=>{ const y=document.querySelector('#modal [data-x=yes]'); if(y) y.click(); }); await W(2500);
ok('B has the team’s races', await H.waitFor(Bp,()=>MSApp.awards(2026,'G').days.length>=2,null,20000));
await A.evaluate(()=>MSApp.setLevels([{aid:'g7',date:'2026-10-10',level:'JV'}],true));
ok('a level set on A reaches B (JV, set by Coach Ann)', await H.waitFor(Bp,()=>{ const l=MSApp.levelOf('g7','2026-10-10'); return !!l&&l.lv==='JV'&&l.by==='Coach Ann'; },null,15000), JSON.stringify(await Bp.evaluate(()=>MSApp.levelOf('g7','2026-10-10'))));
await A.evaluate(()=>{ document.querySelector('#overlay').hidden=true; }); await T.load(A,{file:HFILE,schedule:false}); await W(1500);
ok('B has the official results A imported (Eve on 10/17, Varsity by default)', await H.waitFor(Bp,()=>{ const l=MSApp.levelOf('g4','2026-10-17'); return !!l&&l.lv==='V'; },null,20000));
await Bp.evaluate(()=>MSApp.setLevels([{aid:'g4',date:'2026-10-17',level:'JV'}],true));
ok('a member (B, not admin) tags an official-only result JV and A sees it (rules 3.24)', await H.waitFor(A,()=>{ const l=MSApp.levelOf('g4','2026-10-17'); return !!l&&l.lv==='JV'&&l.by==='Coach Bo'; },null,15000), JSON.stringify(await A.evaluate(()=>MSApp.levelOf('g4','2026-10-17'))));
// setup tags travel with the shared race
await A.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=watches]').click(); }); await W(400); await A.evaluate(()=>{ const b=document.querySelector('#newBtn'); if(!b.hidden) b.click(); }); await W(300); await A.evaluate(()=>{ const c=[...document.querySelectorAll('[data-new=race]')].find(x=>x.offsetParent); c.click(); }); await W(1000);
await A.click('#v-race [data-pk=G]'); await W(800); await A.click('#v-race [data-ra=jvall]'); await W(800);
await require('./lib.js').openTeamRace(Bp,20000);
ok('B follows the race with every girl tagged JV', await H.waitFor(Bp,()=>{ const r=MSApp.getRace(); return !!r&&r.runners.length===8&&r.runners.every(x=>x.jv); },null,15000), JSON.stringify(await Bp.evaluate(()=>{ const r=MSApp.getRace(); return r&&r.runners.map(x=>x.id+(x.jv?'*':'')); })));
ok('no page errors on either phone', !errs.length, errs.slice(0,3).join(' | '));

console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.log('CRASH',e); process.exit(1); });
