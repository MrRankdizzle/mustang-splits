// 3.12: Highlights as one card per runner, and Paste official results. Fake names only.
// 1. Highlights (the planted season from e2e36, latest meet 10/3): team highlights first, then a card for every runner who
//    raced, collapsed to one line with their top highlights; open: growth at this meet, this race, this season, last
//    year, a next step (coaches only) from their own data; comparisons vs the season opener; nothing invented (a runner
//    who only slowed has no highlight); the shared text has celebrations only.
// 2. Paste official results on a saved race (Hy-Tek text from a results page): only Little Chute lines, matched to the
//    race's runners (an uncertain one must be confirmed), a preview, then official finish times with the hand times
//    beside them, the last split recalculated, a snapshot first, one Undo, nothing lost.
// 3. On a team: pasted on one phone, the official times show on the other coach's finished race screen.
const puppeteer=require('puppeteer-core'), T=require('./tools/fake-team.js'), H=require('./tools/phones.js'), lib=require('./lib.js');
const URL=process.env.URL||'http://localhost:8765/';
const {seed}=require('./tools/fake-season.js');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const P=await T.open(b,{seed,url:URL,now:'2026-10-05T16:00:00'}); const ev=(f,...a)=>P.evaluate(f,...a);

console.log('1. Highlights: one card per runner');
await ev(()=>{ document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=high]').click(); }); await W(900);
const H1=await ev(()=>{ const s=document.querySelector('#rvHigh .latest'); const hs=[...s.querySelectorAll('.hl-h')].map(x=>x.firstChild.textContent.trim());
  const cards=[...s.querySelectorAll('.hlc')].map(c=>({n:c.querySelector('.hl-nm').textContent,sum:c.querySelector('summary').innerText.replace(/\s+/g,' '),h:Math.round(c.querySelector('summary').getBoundingClientRect().height),open:c.open}));
  return {hs,cards,growth:document.querySelector('#growthWrap').innerHTML.trim(),team:[...s.querySelectorAll('.cele-team li')].map(x=>x.textContent)}; });
ok('team highlights come first, then the runners', H1.hs.join()==='Team,Runners', H1.hs.join());
ok('a card for every runner who raced (12)', H1.cards.length===12, H1.cards.length);
ok('every card starts collapsed, on one line', H1.cards.every(c=>!c.open&&c.h<=50), JSON.stringify(H1.cards.filter(c=>c.h>50).map(c=>c.n+':'+c.h)));
const sum=n=>(H1.cards.find(c=>c.n===n)||{sum:''}).sum;
ok('Ada Fern: "★ PR, first sub-20" on her line', /^Ada Fern: ★ PR, first sub-20/.test(sum('Ada Fern')), sum('Ada Fern'));
ok('Bea Holt: ▲ SB', /Bea Holt: ▲ SB/.test(sum('Bea Holt')), sum('Bea Holt'));
const C3=sum('Cal Reyes');
ok('Finn Underwood only slowed: no highlight is made up for him', !/:/.test(sum('Finn Underwood').replace(/\d+:\d+/g,'')), sum('Finn Underwood'));
ok('no separate Growth focus section any more', !H1.growth);
await ev(()=>document.querySelectorAll('#rvHigh .hlc').forEach(d=>{ d.open=true; })); await W(300);
const txt=await ev(()=>Object.fromEntries([...document.querySelectorAll('#rvHigh .hlc')].map(c=>[c.querySelector('.hl-nm').textContent,c.innerText.replace(/\s+/g,' ')])));
ok('an open card: growth at this meet, this race, this season, next step (coaches only)', ['GROWTH AT THIS MEET|Growth at this meet','THIS RACE|This race','THIS SEASON|This season','Coaches only'].every(k=>new RegExp(k,'i').test(txt['Ada Fern'])), txt['Ada Fern'].slice(0,260));
ok('Cal Reyes: his top three on one line; moving up 2 spots inside his card', /^Cal Reyes: ★ PR/.test(C3)&&/Moved up 2 spots on the boys team/.test(txt['Cal Reyes']), C3);
ok('…this race: time, pace, team place and splits', /19:55(\.0)? · \d:\d\d\/mi · #1 of 6 on the girls team/.test(txt['Ada Fern'])&&/Splits: \d:\d\d, \d:\d\d, \d:\d\d \/mi/.test(txt['Ada Fern']), (txt['Ada Fern'].match(/19:55[^A-Z]{0,90}/)||[''])[0]);
ok('…last year at this meet (Eli Tate: 18:40 then)', /This meet last year: 18:40\b/.test(txt['Eli Tate']), (txt['Eli Tate'].match(/This meet last year[^.]*/)||[''])[0]);
ok('vs the season opener (Ben Quill, adjusted for course and weather)', /faster than the season opener/.test(txt['Ben Quill']), txt['Ben Quill'].slice(0,300));
ok('…and a small gain that adjustments can’t vouch for isn’t claimed (Abe Park)', !/season opener/.test(txt['Abe Park']));
ok('next step from the runner’s own data: Eve Nash fades: “Ready for a breakthrough”, check-in first, workout links', /Ready for a breakthrough/.test(txt['Eve Nash'])&&/Check in with Eve: sleep, stress, illness and training load/.test(txt['Eve Nash'])&&(await ev(()=>document.querySelectorAll('#rvHigh .hlc[data-lr=g4] [data-tpl-open]').length))>=2, (txt['Eve Nash'].match(/NEXT STEP.*|Next step.*/i)||[''])[0].slice(0,200));
ok('…a next target for a runner with no pattern (Ada: about m:ss for 5K)', /Next target: about \d+:\d\d for 5K/.test(txt['Ada Fern']));
ok('forward-looking words only (never “worse”, “declining”, “slowing”)', !Object.values(txt).some(t=>/worse|declin|slowing|\bbad\b/i.test(t)));
ok('Dot Marsh (Injury-tagged race before): a strong return; her next step is a check-in', /strong return/i.test(sum('Dot Marsh'))||/first race back/i.test(txt['Dot Marsh']));
const share=await ev(()=>MSApp.latestShare()), SL=share.split('\n');
ok('shared text: the heading, then the team highlights, then runners', /^\*\*🎉 Mustang Invite highlights\*\*$/.test(SL[0])&&/^• (Girls|Boys):/.test(SL[1]), SL.slice(0,3).join(' / '));
ok('…celebrations only: no next step, check-in, target, breakthrough or health reason', !/next step|check in|target|breakthrough|injur|illness/i.test(share), (share.match(/next step|check in|target|breakthrough|injur|illness/i)||[''])[0]);
ok('…and nobody without a highlight (Finn Underwood)', !/Finn Underwood/.test(share));
ok('the profile link on a card opens the runner', await ev(()=>{ document.querySelector('#rvHigh .hlc[data-lr=g0] .hl-prof').click(); return !document.querySelector('#rvRunners').hidden; }));

console.log('2. Paste official results on the Girls race of the latest meet');
await ev(()=>{ document.querySelector('[data-rv=meets]').click(); }); await W(600);
const RL='#raceLogList details[data-entry=hr4G]'; // on a phone without a team: Races on this phone
await ev(rl=>{ const g=document.querySelector(rl); g.open=true; g.querySelector('[data-hpaste]').click(); },RL); await W(400);
ok('the sheet names the race and says what to do', await ev(()=>/Paste official results/.test(document.querySelector('#modal').innerText)&&/Select All, Copy/.test(document.querySelector('#modal').innerText)));
const HYTEK=`Girls 5000 Meter Run Varsity
Place Name                    Year School                  Finals  Points
  1 Quinn, Riley               12 Kaukauna               18:02.40    1
  5 Fern, Ada                  11 Little Chute           19:54.61    4
  8 Holt, Bea                  10 Little Chute           20:49.90    7
 12 Lynd, Cora                  9 Little Chute           21:35.80   10
 13 Nash, Eve                  12 Little Chute           21:38.20   11
 20 Orr, Fay                   11 Little Chute           22:51.00   16
 21 Moss, Tara                 10 Freedom                22:55.10   17
Boys 5000 Meter Run Varsity
  3 Park, Abe                  12 Little Chute           17:08.10    3
Team Scores
  1 Little Chute                 48 (avg 21:13.9, total 1:46:09.5)`;
await P.$eval('#poText',(t,v)=>{ t.value=v; },HYTEK); await P.click('#modal [data-x=read]'); await W(300);
const pv=await ev(()=>({sum:document.querySelector('.po-sum').textContent,rows:[...document.querySelectorAll('.po-row')].map(r=>({n:r.querySelector('b').textContent,need:r.classList.contains('need'),v:r.querySelector('select').value})),save:document.querySelector('#modal [data-x=save]').textContent,dis:document.querySelector('#modal [data-x=save]').disabled}));
ok('only the Little Chute lines (not other schools, not the team score)', pv.rows.map(r=>r.n).join()==='Ada Fern,Bea Holt,Cora Lynd,Eve Nash,Fay Orr,Abe Park', pv.rows.map(r=>r.n).join());
ok('a boy from the boys’ race on the same page is skipped in the girls’ race, and it says why', pv.rows.find(r=>r.n==='Abe Park').v==='-'&&await ev(()=>/Skipped: a boy/.test([...document.querySelectorAll('.po-row')].find(r=>r.querySelector('b').textContent==='Abe Park').textContent)));
ok('“Cora Lynd” is uncertain and must be confirmed; Save waits', pv.rows.find(r=>r.n==='Cora Lynd').need&&pv.dis&&/Confirm 1 match first/.test(pv.save), pv.save);
ok('the others are matched to the race’s runners', pv.rows.filter(r=>!['Cora Lynd','Abe Park'].includes(r.n)).every(r=>!r.need&&r.v&&r.v!=='-'));
ok('the preview shows the hand time beside each official time', await ev(()=>/Hand-timed 19:55\.0/.test(document.querySelector('.po-row').textContent)));
ok('…and who has no official time (Dot Marsh keeps her hand time)', await ev(()=>/No official time for Dot Marsh/.test(document.querySelector('#modal').innerText)));
await P.select('#modal [data-pi="2"] select','g2'); await W(200);
ok('after choosing Cora Lind: Save 5 official times', await ev(()=>{ const b=document.querySelector('#modal [data-x=save]'); return !b.disabled&&/Save 5 official times/.test(b.textContent); }));
const editsBefore=await ev(()=>{ const x=JSON.parse(localStorage.getItem('mustang-splits:v1')).raceLog.find(e=>e.id==='hr4G'); return x?(x.edits||[]).length:-1; });
await P.click('#modal [data-x=save]'); await W(1200);
ok('saved with an Undo', /Official results saved for 5 runners/.test(await ev(()=>document.querySelector('#snack').hidden?'':document.querySelector('#snack').textContent)));
ok('a snapshot was taken first', (await ev(()=>MSApp.snapshotReasons())).includes('Before pasting official results'));
const cardTxt=n=>ev(n=>{ const c=[...document.querySelectorAll('#raceLogList details[data-entry=hr4G] .rcard')].find(x=>x.querySelector('.rc-head b').textContent===n); return c?c.innerText.replace(/\s+/g,' '):''; },n);
const ada=await cardTxt('Ada Fern');
ok('Ada’s finish is the official 19:54.6, the hand 19:55.0 beside it', /19:54\.6/.test(ada)&&/hand 19:55\.0/.test(ada), ada.slice(0,220));
const sp=await ev(()=>{ const c=[...document.querySelectorAll('#raceLogList details[data-entry=hr4G] .rcard')].find(x=>x.querySelector('.rc-head b').textContent==='Ada Fern'); const r=c.querySelectorAll('.rc-row'); return [r[1].querySelector('.t').textContent,r[2].querySelector('.l2').textContent]; });
ok('…her hand-timed splits stay, the last split now runs to the official finish', /12:4\d\.\d/.test(sp[0])&&/^7:\d\d/.test(sp[1]), sp.join(' | '));
ok('Dot Marsh keeps her hand-timed finish (22:00.0)', /22:00\.0/.test(await cardTxt('Dot Marsh')));
ok('the race is marked Official', await ev(rl=>/Official/.test(document.querySelector(rl+' summary').textContent),RL));
ok('an official cell is not editable (it says how to change it)', await ev(()=>{ const c=document.querySelector('#raceLogList details[data-entry=hr4G] [data-offcell]'); if(!c) return false; c.click(); return /Undo the paste or paste again/.test(document.querySelector('#toast').textContent); }));
const editsAfter=await ev(()=>(JSON.parse(localStorage.getItem('mustang-splits:v1')).raceLog.find(e=>e.id==='hr4G').edits||[]).length);
ok('append-only: new versions were added, nothing replaced', editsAfter>editsBefore, `${editsBefore} → ${editsAfter}`);
await ev(()=>{ document.querySelector('#snackBtn').click(); }); await W(800);
const ada2=await cardTxt('Ada Fern');
ok('Undo: the hand times count again (19:55.0, no official note)', /19:55\.0/.test(ada2)&&!/19:54\.6/.test(ada2), ada2.slice(0,160));
ok('…as more versions (the paste is still in the history)', (await ev(()=>(JSON.parse(localStorage.getItem('mustang-splits:v1')).raceLog.find(e=>e.id==='hr4G').edits||[]).length))>editsAfter);
ok('no page errors', !P.errs.length, P.errs.slice(0,3).join(' | '));

console.log('3. On a team: pasted on A, seen on B’s finished race');
const errs=[]; const seedT=S=>{ S.roster=[['g1','Ada Quill','G'],['g2','Bea Rowan','G'],['g3','Cora Vance','G']].map(([id,name,gender])=>({id,name,group:'',gender})); };
const [A,B]=await H.team(b,['Coach Ann','Coach Ben'],errs,seedT);
await A.evaluate(()=>{ const e=document.querySelector('[data-new=race]'); if(e) e.click(); else { document.querySelector('#newBtn').click(); document.querySelector('#modal [data-new=race]').click(); } }); await W(600);
await A.click('[data-pk=all]'); await A.type('[data-rname]','Team paste'); await W(400); await A.click('#readyBtn'); await W(300); await A.click('[data-ra=gun]'); await W(800);
await lib.openTeamRace(B);
const fin=await A.evaluate(()=>MSApp.getRace().checkpoints[MSApp.getRace().checkpoints.length-1].id); await A.evaluate(id=>document.querySelector(`[data-at="${id}"]`).click(),fin); await W(500);
for(const id of ['g1','g2','g3']){ await A.click(`#raceGrid [data-rn="${id}"]`); await W(250); }
await A.click('[data-ra=end]'); await W(300); await A.click('#modal [data-x=save]'); await W(1500);
ok('both phones show the race finished', await H.waitFor(B,()=>MSApp.getRace().status==='done',null,6000));
await A.click('[data-ra=pasteoff]'); await W(300);
await A.$eval('#poText',t=>{ t.value='Place\tGrade\tName\tTime\tTeam\n1.\t12\tAda Quill\t18:23.4\tLittle Chute\n2.\t11\tBea Rowan\t18:40.0\tLittle Chute HS\n3.\t10\tJo Lark\t18:45.0\tWrightstown'; }); await A.click('#modal [data-x=read]'); await W(300);
await A.click('#modal [data-x=save]'); await W(800);
const onB=await H.waitFor(B,()=>{ const c=[...document.querySelectorAll('#v-race .rcard')].find(x=>/Ada Quill/.test(x.textContent)); return c&&/18:23\.4/.test(c.textContent)&&/hand 0:0/.test(c.textContent); },null,10000);
ok('B’s finished race shows Ada’s official 18:23.4 with her hand time', onB, await B.evaluate(()=>{ const c=[...document.querySelectorAll('#v-race .rcard')].find(x=>/Ada Quill/.test(x.textContent)); return c?c.innerText.replace(/\s+/g,' ').slice(0,140):'none'; }));
ok('no page errors on the team phones', !errs.length, errs.slice(0,3).join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
