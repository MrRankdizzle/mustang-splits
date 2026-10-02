// Shared test helpers.
// patchClick: page.click first scrolls the element into the middle of the screen, but only when something fixed
// (the tab bar, the "Ready for the gun" bar, the "Race running" bar) covers it, like a coach scrolling a little.
// Elements in view are clicked where they are, so the "name buttons never move" checks stay meaningful.
module.exports.patchClick=p=>{
  const orig=p.click.bind(p);
  p.click=async(sel,opts)=>{
    try{ await p.$eval(sel,e=>{ const r=e.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2, hit=document.elementFromPoint(x,y);
      if(!hit||!(e===hit||e.contains(hit))) e.scrollIntoView({block:'center'}); }); }catch(err){}
    return orig(sel,opts);
  };
  return p;
};
