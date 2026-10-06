// Writes tests/fixtures/fake-team-history.json: a history file (mustang-splits-history/v1) with FAKE names that has
// the shape of the coach's 2026 season (2.12.0): 7 girls and 7 boys, six 2026 meets plus four 2025 ones, near-equal
// season bests (23:11.0 / 23:12.0 girls, 18:33 / 18:59 boys), Kiel with only 4 varsity boys, Jim Bremser with 5, and
// cut-off level labels. Deterministic (no randomness), so screenshots and tests are repeatable.
// node tests/tools/make-fake-team.js
const fs=require('fs'), path=require('path');
const M26=[['2026-08-28','Appleton West Terror Invite',1.04],['2026-09-03','Kiel Raiders Invite',1.0],['2026-09-11','Nightfall Classic 920 - Neenah',0.985],
  ['2026-09-19','Smiley Invitational',0.99],['2026-09-24','Jim Bremser Memorial XC Meet',1.03],['2026-10-01','Waupaca Invitational',0.995]];
const M25=[['2025-08-29','Appleton West Terror Invite',1.04],['2025-09-04','Kiel Raiders Invite',1.0],['2025-09-20','Smiley Invitational',0.99],['2025-10-02','Waupaca Invitational',0.995]];
// name, grade (2026), base 5K seconds, levels per 2026 meet (V/J/-: did not run), improvement over the season (s)
const G=[['Avery Lindqvist',12,1388,'VVVVVV',30],['Maren Schoenfeld',11,1392,'VVVVVV',22],['Tessa Vandenheuvel',10,1441,'VVVVVV',25],['Juniper Castellano',9,1446,'VVVVVV',40],
  ['Nora Pikkarainen',10,1500,'VJVVVV',28],['Sloane Whitcombe',12,1560,'-VVV-V',20],['Ivy Delacroix-Moss',9,1700,'VJVVJV',35]];
// 2.13: Appleton West has 3 varsity + 4 JV boys (a top-5 only with Varsity and JV together); Kiel has only 4 boys.
const B=[['Rowan Haverkamp',12,1000,'VVVVVV',15],['Silas Brightwater',11,1113,'VVVVVV',30],['Emmett Vanderwyst',11,1139,'JV-VVV',20],['Calvin Oduya',12,1200,'JVVVVV',35],
  ['Jasper Kleinschmidt',12,1290,'V-VVVV',25],['Theo Marchetti',9,1390,'J-VVJV',30],['Felix Ostrowski',9,1450,'J-VVJV',40]];
// exact season bests the coach's screenshot showed colliding (girls 23:11 / 23:12 at Waupaca, boys 18:33 / 18:59)
const FIX={'Avery Lindqvist|2026-10-01':1391.0,'Maren Schoenfeld|2026-10-01':1392.0,'Rowan Haverkamp|2026-09-19':992.2,'Silas Brightwater|2026-10-01':1113.0,'Emmett Vanderwyst|2026-09-19':1139.0};
const LBL={V:['Varsity','Varsity -','Varsity D2/3','Varsi'],J:['Junior Varsity','Junior V','Junior Varsi','Junior']};
const wob=(i,j)=>((i*37+j*53)%17-8)*1.3; // deterministic +-10 s
const fmt=s=>`${Math.floor(s/60)}:${(s%60).toFixed(1).padStart(4,'0')}`;
const athletes=[...G,...B].map(([name,grade,base,lv,imp],i)=>{ const res=[];
  M26.forEach(([date,meet,f],j)=>{ const L=lv[j]; if(L==='-') return; const k=name+'|'+date; const t=FIX[k]||Math.round((base*f-imp*j/5+wob(i,j))*10)/10;
    res.push({season:2026,grade,level:'HS',distance:'5K',distance_m:5000,date,time:fmt(t),time_s:t,place:10+i+j,flag:'',meet,division:LBL[L][(i+j)%4],meet_name_cut_off:false,possible_duplicate_of:null}); });
  if(grade>9) M25.forEach(([date,meet,f],j)=>{ const t=Math.round((base*f+35-imp*j/4+wob(i,j+7))*10)/10;
    res.push({season:2025,grade:grade-1,level:'HS',distance:'5K',distance_m:5000,date,time:fmt(t),time_s:t,place:20+i+j,flag:'',meet,division:LBL[lv[j]==='J'?'J':'V'][j%4],meet_name_cut_off:false,possible_duplicate_of:null}); });
  return {name,aliases:[],school:'Fake HS',results:res}; });
const out={format:'mustang-splits-history/v1',generated:'2026-10-04',source:'Fake team for tests (2.12.0). Every name is made up.',notes:'',athletes};
const f=path.join(__dirname,'..','fixtures','fake-team-history.json'); fs.writeFileSync(f,JSON.stringify(out,null,1)); console.log('wrote',f,athletes.length,'athletes',athletes.reduce((n,a)=>n+a.results.length,0),'results');
