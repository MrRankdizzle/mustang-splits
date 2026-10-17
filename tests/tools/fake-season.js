// The planted fake season from e2e36 (3.8), shared with e2e38 (3.10). Fake names only.
const T=require('./fake-team.js');
const MI=1609.344;
// --- the planted season ---------------------------------------------------------------------------------------------
const G=['Ada Fern','Bea Holt','Cora Lind','Dot Marsh','Eve Nash','Fay Orr'], B=['Abe Park','Ben Quill','Cal Reyes','Dan Stone','Eli Tate','Finn Underwood'];
const roster=[...G.map((n,i)=>({id:'g'+i,name:n,group:'',gender:'G'})),...B.map((n,i)=>({id:'b'+i,name:n,group:'',gender:'B'}))];
const days=[['2026-09-05','cA','sA'],['2026-09-12','cB','sB'],['2026-09-19','cA','sC'],['2026-09-26','cB','sD'],['2026-10-03','cA','sE']];
// finish times (s) per runner per day; the last day is the "latest meet"
const base={g0:1215,g1:1260,g2:1300,g3:1330,g4:1250,g5:1380,b0:1040,b1:1100,b2:1135,b3:1110,b4:1090,b5:1170};
const T5={
  g0:[1215,1210,1206,1208,1195],      // 19:55: PR and first sub-20
  g1:[1262,1258,1255,1257,1250],      // season best (her PR is a 2025 time)
  g2:[1290,1300,1302,1305,1296],      // best time on Alpha Park (not SB: 9/5 1290 was Alpha... see below)
  g3:[1330,1325,1328,1400,1320],      // 9/26 tagged Injury, then back on 10/3
  g4:[1240,1252,1266,1281,1297],      // growth focus: fades
  g5:[1380,1378,1376,1374,1372],
  b0:[1040,1036,1033,1031,1029],
  b1:[1100,1098,1097,1099,1068],      // big step forward vs last race
  b2:[1135,1133,1131,1134,1075],      // up in team order (#5 -> #3)
  b3:[1110,1108,1106,1104,1102],      //
  b4:[1090,1088,1086,1085,1083],      // faster than this meet last year
  b5:[1170,1182,1195,1206,1221]};     // growth focus: across the board
// g2: make Alpha slower before, so 10/3 is her best there but not her season best (9/12 Beta 1275)
T5.g2=[1310,1275,1308,1290,1296];
// splits: [mile1, mile2] as fractions; most runners even; g4 fades (fast first mile); b0 negative split on 10/3
const split=(id,di,t)=>{ let f=[0.322,0.322];
  if(id==='g4') f=[0.300,0.320];
  if(id==='b0'&&di===4) f=[0.330,0.333];
  if(id==='b3'&&di===4) f=[0.32185,0.32185]; // 3.12: exactly even splits (the others' are nearly even: a tie names nobody)
  const m1=Math.round(t*f[0]*10)/10, m2=Math.round(t*(f[0]+f[1])*10)/10; return [m1,m2,t]; };
const race=(di,g)=>{ const [date,cid,sid]=days[di], ids=roster.filter(a=>a.gender===g).map(a=>a.id), rid=`r${di}${g}`;
  const marks=[]; ids.forEach(id=>split(id,di,T5[id][di]).forEach((t,ci)=>marks.push({id:`${rid}-${id}-${ci}`,ci,rid:id,t,dev:'d',byName:'Coach Ann',at:0,chosen:false,deleted:false,hist:[]})));
  const edits=(di===3&&g==='G')?[{op:'tag',rid:'g3',tags:['Injury'],note:'',uid:'u',dev:'d',byName:'Coach Ann',at:1}]:[];
  return {id:'h'+rid,date,savedAtMs:Date.parse(date+'T20:00'),uploaded:false,edits,race:{name:`Meet ${di+1}`,raceId:rid,courseId:cid,courseName:'',goalSrc:'none',meetId:'m'+di,seriesId:sid,division:g+'V',
    checkpoints:[{id:'k1',name:'Mile 1',dist:MI,unit:'mi'},{id:'k2',name:'Mile 2',dist:2*MI,unit:'mi'},{id:'k3',name:'Finish',dist:5000,unit:'m'}],
    rows:ids.map(id=>({id,name:roster.find(a=>a.id===id).name,group:'',goal:null,cells:[]})),marks}}; };
// last season: the same meet as 10/3 (series sE) with b4 at 18:40 and g1's PR (20:40)
const lastYear=g=>{ const ids=g==='B'?['b4']:['g1'], t={b4:1120,g1:1240}; const rid='ly'+g;
  return {id:'h'+rid,date:'2025-10-04',savedAtMs:Date.parse('2025-10-04T20:00'),uploaded:false,edits:[],race:{name:'Meet 5 (2025)',raceId:rid,courseId:'cA',courseName:'',goalSrc:'none',meetId:'m25',seriesId:'sE',division:g+'V',
    checkpoints:[{id:'k3',name:'Finish',dist:5000,unit:'m'}],rows:ids.map(id=>({id,name:roster.find(a=>a.id===id).name,group:'',goal:null,cells:[]})),marks:ids.map(id=>({id:rid+id,ci:0,rid:id,t:t[id],dev:'d',byName:'',at:0,chosen:false,deleted:false,hist:[]}))}}; };
const log=[...days.flatMap((d,di)=>[race(di,'G'),race(di,'B')]),lastYear('G'),lastYear('B')].reverse();
const seed=T.seed(); Object.assign(seed,{roster,raceLog:log,courses:[{id:'cA',name:'Alpha Park',checkpoints:[]},{id:'cB',name:'Beta Woods',checkpoints:[]}],
  series:['sA','sB','sC','sD','sE'].map((id,i)=>({id,name:['Opener Invite','Woods Invite','Park Classic','Conference Relays','Mustang Invite'][i]})),
  meets:[...days.map(([date,cid,sid],i)=>({id:'m'+i,seriesId:sid,courseId:cid,date,time:'',kind:'Invite',levels:['V','JV'],season:2026})),{id:'m25',seriesId:'sE',courseId:'cA',date:'2025-10-04',time:'',kind:'Invite',levels:['V'],season:2025}]});

module.exports={seed,roster,T5,days};
