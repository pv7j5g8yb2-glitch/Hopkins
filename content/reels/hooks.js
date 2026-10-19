// Each reel's hook: the audience line, the big hook with one serif word, one visual and a teaser.
// The same hook is the reel's cover (covers.html) and its first frame (the cold open in engine.js),
// so the Reels tab and the grid show the same thing. Needs engine.js loaded first.
(function(){
const {icon,house}=E;
window.HOOKS={
r1:{aud:"Real estate teams:",hook:`5 settings <em>wasting</em> your listing ad budget`,tag:"Number 3 is the boost button",
 vis:`<div class="vis" style="top:1000px"><div class="card" style="width:840px;padding:40px 44px">
  <div style="display:flex;justify-content:space-between;font-size:30px;font-weight:700"><span>Monthly ad budget</span><span>$1,000</span></div>
  <div style="margin-top:24px;height:46px;border-radius:23px;background:#ecdfcc;overflow:hidden;display:flex"><i style="width:50%;background:var(--ox2)"></i><i style="width:50%;background:var(--plum);opacity:.85"></i></div>
  <div style="display:flex;justify-content:space-between;margin-top:18px;font-size:26px;color:var(--quiet)"><span>Working</span><span style="color:var(--plum);font-weight:700">Wasted?</span></div></div></div>`},
r4:{dusk:"cv4",aud:"Your listing video:",hook:`Thousands of views. <em>Zero</em> enquiries.`,tag:"It's one setting",
 vis:`<div class="vis" style="top:960px"><div class="card" style="width:720px;overflow:hidden"><div style="height:300px;overflow:hidden">${house("cv4",720,445)}</div>
  <div style="display:flex;padding:28px 34px"><div style="flex:1;text-align:center"><b style="font-size:60px;letter-spacing:-.03em">Thousands</b><div style="font-size:22px;color:var(--quiet)">Views</div></div>
  <div style="flex:1;text-align:center"><b style="font-size:60px;color:var(--plum)">0</b><div style="font-size:22px;color:var(--quiet)">Enquiries</div></div></div></div></div>`},
r3:{aud:"Before your next listing ad:",hook:`Stop writing <em>“perfect</em> for families”`,tag:"Here's what to write",
 vis:`<div class="vis" style="top:1080px;gap:26px;flex-direction:column">
  <div class="card" style="width:820px;padding:30px 36px;font-size:40px;font-weight:700;display:flex;gap:22px;align-items:center;position:relative">${icon("alert",50,"#5B4873",2)}“Perfect for families.”<i class="strike" style="position:absolute;left:24px;right:24px;top:50%;height:7px;background:var(--plum);border-radius:4px;transform-origin:0 50%"></i></div>
  <div class="card" style="width:820px;padding:30px 36px;font-size:40px;font-weight:700;display:flex;gap:22px;align-items:center">${icon("fence",50,"#8E6B2C",1.8)}Fenced yard, park nearby.</div></div>`},
r2:{aud:"The oldest line in advertising:",hook:`Half my ad money is wasted. <em>Which</em> half?`,tag:"How to find out",
 vis:`<div class="vis" style="top:1110px;gap:30px">${["$","$","?","$","?"].map((x,i)=>`<div class="card" style="width:150px;height:92px;display:flex;align-items:center;justify-content:center;font-size:52px;font-weight:700;transform:rotate(${[-4,3,-2,5,-3][i]}deg);${x==="?"?"background:var(--plum);color:var(--cream);font-family:'Instrument Serif';font-style:italic;font-weight:400":""}">${x}</div>`).join("")}</div>`},
launch:{aud:"Coming soon:",hook:`Every listing ad, from <em>one</em> chat.`,tag:"Meet Hopkins",
 vis:`<div class="vis" style="top:1030px"><div class="card" style="width:840px;padding:30px 34px">
  <div style="display:flex;justify-content:flex-end"><span style="background:var(--plum);color:var(--cream);font-weight:700;font-size:28px;padding:18px 24px;border-radius:24px 24px 6px 24px">Ads for 14 Oak Street.</span></div>
  <div style="display:flex;gap:14px;margin-top:20px;align-items:center"><svg width="46" height="46" viewBox="0 0 120 120">${E.MARK}</svg><span style="background:var(--paper);border:2px solid rgba(42,15,20,.08);font-size:27px;padding:18px 24px;border-radius:24px 24px 24px 6px">Three versions to test. Run them?</span></div>
  <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px"><span style="border:2px solid rgba(42,15,20,.2);font-weight:700;font-size:26px;padding:14px 24px;border-radius:16px">Change one</span><span style="background:var(--gold);color:var(--ox);font-weight:700;font-size:26px;padding:16px 26px;border-radius:16px">Approve and run</span></div></div></div>`},
r5:{aud:"Real estate teams:",hook:`No more Sunday nights in <em>Ads</em> Manager.`,tag:"Meet Hopkins",
 vis:`<div class="vis" style="top:1050px"><div class="card" style="width:820px;padding:30px 34px">
  <div style="display:flex;justify-content:flex-end"><span style="background:var(--plum);color:var(--cream);font-weight:700;font-size:28px;padding:18px 24px;border-radius:24px 24px 6px 24px">Ads for 14 Oak Street.</span></div>
  <div style="display:flex;gap:14px;margin-top:20px;align-items:center"><svg width="46" height="46" viewBox="0 0 120 120">${E.MARK}</svg><span style="background:var(--paper);border:2px solid rgba(42,15,20,.08);font-size:27px;padding:18px 24px;border-radius:24px 24px 24px 6px">Three versions to test. Run them?</span></div>
  <div style="display:flex;justify-content:flex-end;margin-top:20px"><span style="background:var(--gold);color:var(--ox);font-weight:700;font-size:26px;padding:16px 26px;border-radius:16px">Yes, run them</span></div></div></div>`},
};

})();
