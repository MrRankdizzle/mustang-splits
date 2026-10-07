// 3.5: the Schedule page (Data > Meets, race setup, Settings), swipe actions on each meet (Edit, Not attending, Delete
// with Undo), "Not attending this year" (out of the next meet, kept in the series, reversible), the one-time Brillion
// 10/8 mark, edits that show everywhere, Start a new season, and Import schedule (CSV preview, series matching,
// one Undo). Fake team, fake names.
const puppeteer=require('puppeteer-core'), path=require('path'), fs=require('fs'), T=require('./tools/fake-team.js');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const P=await T.open(b,{now:'2026-10-06T15:30:00',flat:false,brillion:true}); await T.load(P);
const st=()=>P.evaluate(()=>JSON.parse(localStorage.getItem('mustang-splits:v1')));
const ev=(f,...a)=>P.evaluate(f,...a), hide=()=>ev(()=>{ document.querySelector('#overlay').hidden=true; });
const BR='m26-2026-10-08-brillion-invite', AL='m26-2026-10-10-albany-invite';
const act=(id,a)=>ev((id,a)=>document.querySelector(`#modal .sched-sw[data-mid="${id}"] [data-ms=${a}]`).click(),id,a), sheet=()=>ev(()=>document.querySelector('#modal').textContent.replace(/\s+/g,' '));

console.log('1. Brillion 10/8 is marked "not attending" once');
await W(4300);
let S=await st(); const br=S.meets.find(m=>m.id===BR);
ok('Brillion 10/8 is not attending, and the one-time flag is set', br&&br.notAttending===true&&S.settings.brillionNA350===true, JSON.stringify(br));
ok('…it keeps its series and course', br&&br.seriesId==='s-brillion-invite'&&!!br.courseId);

console.log('2. Data > Meets > Schedule');
await hide(); await ev(()=>{ document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=meets]').click(); }); await W(500);
const nx=await ev(()=>document.querySelector('#schedNext').textContent);
ok('the Schedule row shows the next meet, skipping Brillion', /^Next: .*Albany.*10\/10/.test(nx)||/^Next: (?!.*Brillion).*/.test(nx), nx);
ok('…and never Brillion', !/Brillion/.test(nx));
await P.click('#openSched'); await W(400);
ok('the Schedule page opens on the 2026 season with "+ Add meet" at the top', await ev(()=>{ const s=document.querySelector('#modal [data-sy]'); const add=document.querySelector('#modal .sched-top [data-mx=add]'); return s&&s.value==='2026'&&!!add&&/Add meet/.test(add.textContent); }));
const rows=await ev(()=>[...document.querySelectorAll('#modal .sched-sw')].map(r=>r.dataset.mid));
ok('every 2026 meet is a swipe row, in date order', rows.length===(await st()).meets.filter(m=>(m.season===2026)).length&&rows.length>=8, rows.length);
ok('Brillion\'s row says "Not attending" and is dimmed', await ev(id=>{ const r=document.querySelector(`#modal .sched-sw[data-mid="${id}"]`); return r&&r.classList.contains('na')&&/Not attending/.test(r.querySelector('.sd-main').textContent); },BR));
ok('each row has Edit (leading), Not attending and Delete (trailing)', await ev(()=>[...document.querySelectorAll('#modal .sched-sw')].every(r=>r.querySelector('.sw-lead [data-ms=edit]')&&r.querySelector('.sw-trail [data-ms=att]')&&r.querySelector('.sw-trail [data-ms=del]'))));
ok('the footer has Import schedule and Start a new season', await ev(()=>!!document.querySelector('#modal [data-mx=import]')&&!!document.querySelector('#modal [data-mx=season]')));
// a real swipe to the left opens the trailing actions
const box=await (await P.$(`#modal .sched-sw[data-mid="${AL}"] .sw-front`)).boundingBox();
await P.mouse.move(box.x+box.width-30,box.y+box.height/2); await P.mouse.down(); for(let i=1;i<=8;i++){ await P.mouse.move(box.x+box.width-30-i*25,box.y+box.height/2); await W(20); } await P.mouse.up(); await W(400);
ok('swiping left reveals Not attending and Delete', await ev(id=>document.querySelector(`#modal .sched-sw[data-mid="${id}"]`).classList.contains('sw-open'),AL));

console.log('3. Not attending and back, with Undo');
await P.click(`#modal .sched-sw[data-mid="${AL}"] [data-ms=att]`); await W(400);
S=await st(); ok('Albany is now not attending', S.meets.find(m=>m.id===AL).notAttending===true);
ok('…the snack offers Undo', await ev(()=>!document.querySelector('#snack').hidden&&/not attending/.test(document.querySelector('#snackText').textContent)));
ok('…and its row button now says "Attending"', await ev(id=>/^Attending$/.test(document.querySelector(`#modal .sched-sw[data-mid="${id}"] [data-ms=att]`).textContent.trim()),AL));
await ev(()=>document.querySelector('#snackBtn').click()); await W(400);
S=await st(); ok('Undo: Albany is attending again (no field left behind)', !('notAttending' in S.meets.find(m=>m.id===AL)));
await act(BR,'att'); await W(400);
S=await st(); ok('Brillion can be turned back to attending', !('notAttending' in S.meets.find(m=>m.id===BR)));
await ev(()=>document.querySelector('#snackBtn').click()); await W(400);
S=await st(); ok('…and Undo makes it not attending again', S.meets.find(m=>m.id===BR).notAttending===true);
await W(4200); S=await st(); ok('the one-time mark never runs again (still one flag, value unchanged)', S.settings.brillionNA350===true);

console.log('4. Delete with Undo');
const before=(await st()).meets.length;
await act(AL,'del'); await W(400);
S=await st(); ok('Delete takes the meet off the schedule', S.meets.length===before-1&&!S.meets.some(m=>m.id===AL));
ok('…and the row is gone from the page', await ev(id=>!document.querySelector(`#modal .sched-sw[data-mid="${id}"]`),AL));
await ev(()=>document.querySelector('#snackBtn').click()); await W(500);
S=await st(); ok('Undo puts it back, same id', S.meets.some(m=>m.id===AL));
ok('…and the page shows it again', await ev(id=>!!document.querySelector(`#modal .sched-sw[data-mid="${id}"]`),AL));

console.log('5. Editing a meet shows everywhere');
await P.click(`#modal [data-meet-ed="${AL}"]`); await W(400);
ok('tapping a meet opens the editor with a Not attending switch', await ev(()=>!!document.querySelector('#modal [data-me=na]')));
await ev(()=>{ const d=document.querySelector('#modal [data-me=date]'); d.value='2026-10-09'; const t=document.querySelector('#modal [data-me=time]'); t.value='5:15 PM'; }); await P.click('#modal [data-x=yes]'); await W(500);
S=await st(); const al=S.meets.find(m=>m.id===AL); ok('saved: date 10/9, time 5:15 PM', al.date==='2026-10-09'&&al.time==='5:15 PM');
ok('the Schedule page shows the new date and time', await ev(id=>{ const r=document.querySelector(`#modal .sched-sw[data-mid="${id}"]`); return r&&/10\/9/.test(r.textContent)&&/5:15 PM/.test(r.textContent); },AL));
ok('…and it is labeled the next meet', await ev(id=>/Next meet/.test(document.querySelector(`#modal .sched-sw[data-mid="${id}"]`).textContent),AL));
await P.click('#modal [data-x=no]'); await W(300);
ok('Data > Meets: "Next: … 10/9"', /10\/9/.test(await ev(()=>document.querySelector('#schedNext').textContent)), await ev(()=>document.querySelector('#schedNext').textContent));
await hide(); await ev(()=>document.querySelector('.tab[data-tab=workouts]').click()); await W(500);
const today=await ev(()=>document.querySelector('#wkToday').textContent.replace(/\s+/g,' '));
ok('Workouts: the schedule line counts to Albany in 3 days, not Brillion', /3 days/.test(today)&&!/Brillion/.test(today), today.slice(0,160));
await ev(()=>document.querySelector('.tab[data-tab=watches]').click()); await W(300);
await ev(()=>{ const n=document.querySelector('[data-new=race]'); if(n) n.click(); else { document.querySelector('#newBtn').click(); } }); await W(300); await ev(()=>{ const n=document.querySelector('#modal [data-new=race]'); if(n) n.click(); }); await W(600); await hide();
const rs=await ev(()=>{ const s=document.querySelector('[data-meet]'); return s&&{v:s.value,opts:[...s.options].map(o=>o.textContent)}; });
ok('race setup picks Albany (10/9), not Brillion', rs&&rs.v===AL, rs&&rs.v);
ok('…and lists Brillion as "(not attending)"', rs&&rs.opts.some(o=>/Brillion.*\(not attending\)/.test(o)), rs&&rs.opts.filter(o=>/Brillion/.test(o)).join(','));
ok('race setup has a "Schedule" button that opens the Schedule page', await ev(()=>{ const b2=document.querySelector('[data-ra=meets]'); if(!b2||b2.textContent.trim()!=='Schedule') return false; b2.click(); return true; })&&await ev(()=>!!document.querySelector('#modal .sched-top')));
await hide();

console.log('6. Start a new season');
await P.click('#openSettings'); await W(300); await P.click('#modal [data-spage=data]'); await W(300);
ok('Settings > Data has "Schedule"', await ev(()=>/Schedule/.test(document.querySelector('#openMeets').textContent)));
await P.click('#openMeets'); await W(300); await P.click('#modal [data-mx=season]'); await W(400); await P.click('#modal [data-x=yes]'); await W(800);
S=await st(); const n27=S.meets.filter(m=>m.season===2027);
ok('the 2027 season has copies of the 2026 meets, dates blank, same series', n27.length>=8&&n27.every(m=>m.date===''&&S.series.some(x=>x.id===m.seriesId)), n27.length);
ok('…all attending (Brillion too)', n27.every(m=>!m.notAttending)&&n27.some(m=>m.seriesId==='s-brillion-invite'));
ok('…and the Schedule page now shows 2027', await ev(()=>document.querySelector('#modal [data-sy]').value==='2027'));
ok('…the 2026 Brillion is still not attending', S.meets.find(m=>m.id===BR).notAttending===true);

console.log('7. Import schedule (CSV)');
const tmp=path.join(__dirname,'out','sched-test.csv'); fs.mkdirSync(path.dirname(tmp),{recursive:true});
fs.writeFileSync(tmp,'﻿Date,Meet,Levels,Location,Start Time,Bus,Notes\r\n8/27/2027,"Winneconne Invite",JV / V,Winneconne HS,4:30 PM,2:45,"bring tent, cooler"\r\n2027-09-11,Winagamie Meet,Varsity,Winagamie GC,7:45 PM,,\r\n9/18/2027,Fakeville Twilight,JV,Fakeville Park,6:00 PM,,\r\nnot a date,Mystery Meet,,,,,\r\n');
await ev(()=>{ document.querySelector('#modal [data-sy]').value='2026'; document.querySelector('#modal [data-sy]').dispatchEvent(new Event('change')); }); await W(300);
await (await P.$('#modal #schedFile')).uploadFile(tmp); await W(800);
ok('a preview opens before anything is saved', await ev(()=>document.querySelectorAll('#modal .imp-srow').length===4), await ev(()=>document.querySelectorAll('#modal .imp-srow').length));
S=await st(); const mBefore=S.meets.length, sBefore=S.series.length, cBefore=S.courses.length;
const pv=await ev(()=>[...document.querySelectorAll('#modal .imp-srow')].map(r=>({t:r.querySelector('.is-head').textContent.replace(/\s+/g,' '),s:(r.querySelector('[data-is]')||{}).value,tag:(r.querySelector('.ok-tag,.chk-tag,.field .hint')||{}).textContent,c:(r.querySelector('[data-ic]')||{}).value})));
ok('quoted fields, extra columns and M/D/YYYY dates read correctly', /Winneconne Invite/.test(pv[0].t)&&/8\/27/.test(pv[0].t)&&/4:30 PM/.test(pv[0].t)&&/JV \/ V/.test(pv[0].t), pv[0].t);
ok('Winagamie Meet matches the existing series ("same name")', pv[1].s==='s-winagamie-meet'||(pv[1].tag||'').includes('same name'), JSON.stringify(pv[1]));
ok('…and the existing Winagamie GC course', pv[1].c&&pv[1].c!=='__new'&&pv[1].c!=='', pv[1].c);
ok('an unknown meet becomes a new series and a new course', pv[2].s==='__new'&&pv[2].c==='__new', JSON.stringify(pv[2]));
ok('a row without a date is kept as TBA and says so', /isn’t a date/.test(pv[3].t), pv[3].t);
ok('Winneconne is matched or new, either way confirmable with a picker', !!pv[0].s, pv[0].s);
// change one match: make the Fakeville row use the Winagamie series instead, then back
await ev(()=>{ const s=document.querySelector('#modal [data-is="2"]'); s.value='__new'; s.dispatchEvent(new Event('change')); });
await P.click('#modal [data-x=yes]'); await W(900);
S=await st(); const added=S.meets.filter(m=>m.season===2027&&m.date);
ok('Add: 3 dated meets added in 2027 (plus 1 TBA)', S.meets.length===mBefore+4&&added.length===3, S.meets.length-mBefore);
const fk=S.meets.find(m=>m.date==='2027-09-18'), fs2=S.series.find(x=>x.id===fk.seriesId), fc=S.courses.find(c=>c.id===fk.courseId);
ok('Fakeville: new series "Fakeville Twilight", new course "Fakeville Park", 6:00 PM, JV', fs2&&fs2.name==='Fakeville Twilight'&&fc&&fc.name==='Fakeville Park'&&fk.time==='6:00 PM'&&fk.levels.join()==='JV', JSON.stringify(fk));
ok('Winagamie 9/11/2027 uses the existing series', S.meets.find(m=>m.date==='2027-09-11').seriesId==='s-winagamie-meet');
ok('a snapshot was saved first', await ev(async()=>(await MSApp.snapshotReasons()).some(r=>/importing a schedule/.test(r))));
ok('the page shows the 2027 season with the new meets', await ev(()=>document.querySelector('#modal [data-sy]').value==='2027'&&/Fakeville/.test(document.querySelector('#modal .sched-list').textContent)));
ok('one Undo for the whole import', await ev(()=>/Imported 4 meets/.test(document.querySelector('#snackText').textContent)), await ev(()=>document.querySelector('#snackText').textContent));
await ev(()=>document.querySelector('#snackBtn').click()); await W(600);
S=await st(); ok('Undo removes all 4 meets and the series and course the import made', S.meets.length===mBefore&&S.series.length===sBefore&&S.courses.length===cBefore, [S.meets.length-mBefore,S.series.length-sBefore,S.courses.length-cBefore].join(','));
ok('…they wait in Recently deleted', await ev(()=>{ const t=MSApp.trashKinds(); return t.filter(x=>x.kind==='meet').length>=4&&t.some(x=>x.kind==='series'&&x.label==='Fakeville Twilight'); }));
// import twice: the second time, meets already on the schedule are skipped
await (await P.$('#modal #schedFile')).uploadFile(tmp); await W(700); await P.click('#modal [data-x=yes]'); await W(800);
await ev(()=>{ const f=document.querySelector('#modal #schedFile'); f.value=''; }); await (await P.$('#modal #schedFile')).uploadFile(tmp); await W(700);
ok('importing the same file again skips the meets already there', await ev(()=>document.querySelectorAll('#modal .imp-srow.dup').length===3));
await P.click('#modal [data-x=no]'); await W(300);

console.log('8. the template');
const tpl=fs.readFileSync(path.join(__dirname,'..','docs','schedule-template.csv'),'utf8').split(/\r?\n/)[0];
ok('docs/schedule-template.csv has date, meet, levels, location, start time', tpl==='date,meet,levels,location,start time', tpl);
await (await P.$('#modal #schedFile')).uploadFile(path.join(__dirname,'..','docs','schedule-template.csv')); await W(700);
ok('…and it imports (preview of 5 meets)', await ev(()=>document.querySelectorAll('#modal .imp-srow').length===5));
await P.click('#modal [data-x=no]'); await W(300);

ok('no page errors', !P.errs.length, P.errs.join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0); })().catch(e=>{ console.log('CRASH',e); process.exit(1); });
