// Hopkins reel engine: brand background, word-by-word captions, scene helpers, end card.
(function(){
const MARK=`<path d="M55.9 85.8C54.8 88.1 52.2 89.9 49.9 91.2C47.6 92.6 44.8 93.5 42.1 93.9C39.4 94.4 35.9 94.8 33.4 93.7C31.0 92.6 29.1 89.4 27.5 87.3C25.9 85.2 25.4 83.2 24.0 81.0C22.7 78.9 20.2 76.8 19.5 74.3C18.7 71.8 18.8 68.5 19.6 66.0C20.5 63.4 22.3 60.3 24.6 58.9C27.0 57.4 30.9 57.0 33.8 57.5C36.6 57.9 39.2 60.5 41.7 61.7C44.1 62.9 46.4 63.2 48.6 64.6C50.7 66.0 53.2 67.9 54.5 70.0C55.9 72.2 56.2 75.1 56.4 77.7C56.7 80.3 57.0 83.5 55.9 85.8Z" fill="#5B4873" class="pl"/><path d="M97.0 31.0C98.4 33.8 99.0 36.2 100.4 39.5C101.7 42.7 105.3 46.7 105.1 50.5C104.9 54.3 102.0 59.3 99.0 62.3C95.9 65.2 90.8 67.3 86.7 68.2C82.7 69.1 78.3 68.5 74.7 67.7C71.2 67.0 68.2 65.4 65.3 63.8C62.4 62.2 59.8 60.5 57.4 58.1C55.1 55.7 51.8 52.7 51.2 49.4C50.7 46.1 52.8 41.9 54.1 38.3C55.4 34.7 56.8 30.9 59.3 27.7C61.7 24.4 65.2 20.5 68.9 18.8C72.7 17.1 77.8 16.8 81.6 17.5C85.4 18.1 89.2 20.3 91.7 22.6C94.3 24.8 95.5 28.2 97.0 31.0Z" fill="#D7AE62" class="gd"/>`;
const CSS=`
@font-face{font-family:"Inter Tight";font-weight:400;src:url(../fonts/Inter_Tight_400_normal.woff2)}
@font-face{font-family:"Inter Tight";font-weight:700;src:url(../fonts/Inter_Tight_700_normal.woff2)}
@font-face{font-family:"Instrument Serif";font-style:italic;src:url(../fonts/Instrument_Serif_400_italic.woff2)}
:root{--ox:#2A0F14;--ox2:#36151C;--cream:#F4EBDD;--paper:#FBF5EC;--gold:#D7AE62;--bronze:#8E6B2C;--plum:#5B4873;--lilac:#B79DC2;--rose:#C3A9A2;--ink:#2A0F14;--quiet:#7d6862}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1920px;overflow:hidden;background:var(--ox)}
body{font-family:"Inter Tight",sans-serif;-webkit-font-smoothing:antialiased;color:var(--cream);position:relative}
#grid{position:absolute;inset:0;background-image:linear-gradient(rgba(244,235,221,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(244,235,221,.035) 1px,transparent 1px);background-size:54px 54px}
#vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,transparent 40%,rgba(10,2,4,.55) 100%)}
#grain{position:absolute;inset:0;opacity:.09;mix-blend-mode:overlay;pointer-events:none}
#wm{position:absolute;top:150px;left:90px;display:flex;align-items:center;gap:14px;font-size:24px;font-weight:700;color:var(--rose)}
#cap{position:absolute;top:232px;left:80px;width:920px;text-align:center;font-weight:700;font-size:64px;line-height:1.13;letter-spacing:-.025em}
#cap.hookcap{top:196px;font-size:104px;line-height:1.02;letter-spacing:-.045em}
.w{display:inline-block;margin:0 .12em}
.hl{position:relative;padding:0 .16em;border-radius:8px}
.hl i{position:absolute;width:15px;height:15px;border-radius:50%;background:var(--cream);border:3px solid var(--ox)}
.serif{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;font-size:1.2em;letter-spacing:0}
.scene{position:absolute;left:0;top:0;width:1080px;height:1920px;opacity:0}
.card{position:absolute;background:var(--cream);color:var(--ink);border-radius:26px;box-shadow:0 40px 90px rgba(0,0,0,.45)}
.src{position:absolute;left:90px;width:900px;text-align:center;font-size:22px;color:var(--rose);line-height:1.35}
.lbl{font-size:19px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.pill{display:inline-flex;align-items:center;gap:10px;border-radius:40px;padding:10px 20px;font-weight:700;font-size:22px}
.ico{fill:none;stroke-linecap:round;stroke-linejoin:round}
#end{position:absolute;inset:0;opacity:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
#end .lock{display:flex;align-items:center;gap:30px;margin-top:-60px}
#end .nm{font-size:132px;font-weight:700;letter-spacing:-.05em;line-height:1}
#end .cta{margin-top:84px;font-size:46px;font-weight:700;color:var(--ox);background:var(--gold);padding:28px 56px;border-radius:70px}
#fol{position:absolute;left:0;width:1080px;top:1420px;display:flex;justify-content:center;opacity:0}
#fol span{display:inline-flex;align-items:center;gap:16px;font-size:44px;font-weight:700;color:var(--ox);background:var(--gold);padding:24px 48px;border-radius:70px;box-shadow:0 18px 50px rgba(0,0,0,.45)}
#fade{position:absolute;inset:0;background:var(--ox);opacity:0;pointer-events:none}
`;
const E={};window.E=E;
E.clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
E.P=(t,a,b)=>E.clamp((t-a)/(b-a));
E.ease=x=>{x=E.clamp(x);return 1-Math.pow(1-x,3)};
E.inout=x=>{x=E.clamp(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2};
E.back=x=>{x=E.clamp(x);const c=1.7;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
E.$=s=>document.querySelector(s);E.$$=s=>[...document.querySelectorAll(s)];
let seed=11;E.rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
E.MARK=MARK;
// show/hide an element with blur + rise, like the reference reels
E.vis=(sel,t,a,b,o={})=>{const el=typeof sel==="string"?E.$(sel):sel;if(!el)return 0;
  const i=E.ease(E.P(t,a,a+(o.dur||.45))), q=b==null?0:E.inout(E.P(t,b,b+.35));
  const k=i*(1-q);el.style.opacity=k;
  el.style.filter=k>.995?"none":`blur(${(1-i)*(o.blur??16)+q*14}px)`;
  const dy=o.dy??60;const dr=(o.drift??(el.classList.contains('scene')?1:0))*Math.min(.03,.004*Math.max(0,t-a));el.style.transform=`translate(${(o.dx||0)*(1-i)}px,${(1-i)*dy-q*(o.up||0)}px) scale(${(o.s0??1)+(1-(o.s0??1))*i-q*.05+dr})`;
  return k};
E.pop=(sel,k)=>{const el=typeof sel==="string"?E.$(sel):sel;if(!el)return;const e=E.back(k);el.style.opacity=E.clamp(k*3);el.style.transform=`scale(${.4+.6*e})`};
E.draw=(sel,k)=>{(typeof sel==="string"?E.$$(sel):[sel]).forEach(p=>{p.style.strokeDasharray="1 1";p.style.strokeDashoffset=1-E.clamp(k)})};
E.count=(sel,k,a,b,f=v=>Math.round(v).toLocaleString("en-US"))=>{const el=E.$(sel);if(el)el.textContent=f(a+(b-a)*E.ease(k))};
// The hook: in the first seconds things hit the screen instead of fading in. slam() lands an
// element from big and tilted with an overshoot in about a fifth of a second; jolt() gives the
// frame a short jolt after each time in a list.
E.slam=(sel,t,a,o={})=>{const el=typeof sel==="string"?E.$(sel):sel;if(!el)return 0;const k=E.P(t,a,a+(o.dur||.22)),e=E.back(k),s=o.s??1.35;
  el.style.opacity=E.clamp(k*5);el.style.filter="none";el.style.transform=`translate(${o.dx||0}px,${o.dy||0}px) scale(${s+(1-s)*e}) rotate(${(o.r||0)*(1-e)}deg)`;return k};
E.jolt=(t,times,amp=12)=>{let x=0,y=0;times.forEach(([a,m])=>{const d=t-a;if(d>=0&&d<.3){const f=(m||amp)*(1-d/.3);x+=Math.sin(d*90)*f;y+=Math.cos(d*77)*f*.6}});return [x,y]};
E.type=(sel,k,text)=>{const el=E.$(sel);if(el)el.textContent=text.slice(0,Math.round(text.length*E.clamp(k)))};
E.dusk=id=>{const s=document.getElementById(id);if(!s)return;s.querySelector('rect').setAttribute('fill','#3a1f3c');s.querySelector('g').setAttribute('stroke','#F4EBDD');s.querySelector('.sun').setAttribute('fill','#F4EBDD');s.querySelector('.sun').setAttribute('r','26');s.querySelector('.sun').setAttribute('cx','150');s.querySelector('.sun').setAttribute('cy','110');s.querySelector('.sunglow').style.opacity=.25;s.querySelector('.win').setAttribute('stroke','#F4EBDD');s.querySelector('.win').style.filter='drop-shadow(0 0 12px rgba(215,174,98,.9))'};
E.shake=(k)=>Math.sin(k*Math.PI*5)*10*(1-k)*(k>0&&k<1?1:0);
// line icons (24 grid, pathLength=1 so they can draw on)
const I={
 lock:'<rect x="5" y="11" width="14" height="10" rx="2" pathLength="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3" pathLength="1"/>',
 pin:'<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" pathLength="1"/><circle cx="12" cy="9.5" r="2.6" pathLength="1"/>',
 send:'<path d="M21 3 10 14" pathLength="1"/><path d="M21 3l-7 18-4-7-7-4Z" pathLength="1"/>',
 chat:'<path d="M4 5h16v11H9l-5 4Z" pathLength="1"/>',
 check:'<path d="M5 12.5l4.5 4.5L19 7" pathLength="1"/>',
 x:'<path d="M6 6l12 12M18 6 6 18" pathLength="1"/>',
 sun:'<circle cx="12" cy="12" r="4" pathLength="1"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" pathLength="1"/>',
 form:'<rect x="5" y="3" width="14" height="18" rx="2" pathLength="1"/><path d="M8 8h8M8 12h8M8 16h5" pathLength="1"/>',
 eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" pathLength="1"/><circle cx="12" cy="12" r="3" pathLength="1"/>',
 heart:'<path d="M12 20s-7-4.4-9-9.2C1.7 7.6 4 4.5 7.2 4.5c2 0 3.6 1.2 4.8 3 1.2-1.8 2.8-3 4.8-3 3.2 0 5.5 3.1 4.2 6.3C19 15.6 12 20 12 20Z" pathLength="1"/>',
 calendar:'<rect x="3.5" y="5" width="17" height="15.5" rx="2" pathLength="1"/><path d="M3.5 10h17M8 3v4M16 3v4" pathLength="1"/>',
 scissors:'<circle cx="6" cy="7" r="2.6" pathLength="1"/><circle cx="6" cy="17" r="2.6" pathLength="1"/><path d="M8.2 8.4 20 17M8.2 15.6 20 7" pathLength="1"/>',
 rocket:'<path d="M12 3c3 2 5 5.5 5 9.5L15 16H9l-2-3.5C7 8.5 9 5 12 3Z" pathLength="1"/><circle cx="12" cy="10" r="1.8" pathLength="1"/><path d="M9 16l-1.5 4M15 16l1.5 4" pathLength="1"/>',
 bolt:'<path d="M13 2 5 14h6l-1 8 8-12h-6Z" pathLength="1"/>',
 user:'<circle cx="12" cy="8" r="4" pathLength="1"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" pathLength="1"/>',
 store:'<path d="M3 9.5 4.5 4h15L21 9.5M4.5 9.5V20h15V9.5M3 9.5h18M10 20v-6h4v6" pathLength="1"/>',
 coin:'<circle cx="12" cy="12" r="9" pathLength="1"/><path d="M14.8 9.2c-.6-1-1.6-1.5-2.8-1.5-1.6 0-2.8.8-2.8 2.1 0 3.1 5.8 1.6 5.8 4.4 0 1.3-1.3 2.1-3 2.1-1.3 0-2.4-.6-3-1.6M12 6v1.7M12 16.3V18" pathLength="1"/>',
 refresh:'<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 13a8 8 0 0 0 14.6 4.5L20 16" pathLength="1"/><path d="M4 4v4h4M20 20v-4h-4" pathLength="1"/>',
 target:'<circle cx="12" cy="12" r="9" pathLength="1"/><circle cx="12" cy="12" r="5" pathLength="1"/><circle cx="12" cy="12" r="1.4" pathLength="1"/>',
 train:'<rect x="5" y="3" width="14" height="14" rx="3" pathLength="1"/><path d="M5 10h14M8 21l2-4M16 21l-2-4" pathLength="1"/><circle cx="9" cy="13.5" r=".8" pathLength="1"/><circle cx="15" cy="13.5" r=".8" pathLength="1"/>',
 tree:'<path d="M12 21v-5M7 16h10l-5-13Z" pathLength="1"/>',
 fence:'<path d="M4 20V8l2-2 2 2v12M10 20V8l2-2 2 2v12M16 20V8l2-2 2 2v12M3 11h18M3 16h18" pathLength="1"/>',
 plan:'<rect x="3.5" y="3.5" width="17" height="17" rx="1.5" pathLength="1"/><path d="M3.5 12h7v8.5M10.5 3.5v5M14.5 12h6M14.5 12v3" pathLength="1"/>',
 key:'<circle cx="8" cy="15" r="4.5" pathLength="1"/><path d="M11.2 11.8 20 3M16.5 6.5l2.5 2.5M14 9l2 2" pathLength="1"/>',
 home:'<path d="M3 11 12 4l9 7M5.5 9.5V20h13V9.5M10 20v-5h4v5" pathLength="1"/>',
 alert:'<path d="M12 3 2 20h20Z" pathLength="1"/><path d="M12 10v4.5M12 17.2v.3" pathLength="1"/>',
};
E.icon=(name,size=64,color="currentColor",w=1.8,cls="")=>`<svg class="ico ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" stroke="${color}" stroke-width="${w}">${I[name]}</svg>`;
// line-art listing illustration (no stock photos)
E.house=(id,w=760,h=470)=>`<svg id="${id}" width="${w}" height="${h}" viewBox="0 0 760 470">
 <defs><linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9D9C2"/><stop offset="1" stop-color="#F4EBDD"/></linearGradient>
 <radialGradient id="${id}glow"><stop offset="0" stop-color="#D7AE62" stop-opacity=".55"/><stop offset="1" stop-color="#D7AE62" stop-opacity="0"/></radialGradient></defs>
 <rect width="760" height="470" fill="url(#${id}sky)"/>
 <circle class="sunglow" cx="600" cy="150" r="150" fill="url(#${id}glow)"/>
 <circle class="sun" cx="600" cy="150" r="46" fill="#D7AE62"/>
 <g fill="none" stroke="#5B4873" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
  <path class="ln" pathLength="1" d="M40 400H720"/>
  <path class="ln" pathLength="1" d="M190 400V230L330 120L470 230V400"/>
  <path class="ln" pathLength="1" d="M160 250L330 110L500 250"/>
  <path class="ln" pathLength="1" d="M470 400V280H600V400"/>
  <path class="ln" pathLength="1" d="M455 290L535 235L615 290"/>
  <path class="ln" pathLength="1" d="M300 400V320H360V400"/>
  <path class="ln" pathLength="1" d="M160 400V330H520"/><path class="ln" pathLength="1" d="M200 330V400M240 330V400"/>
  <path class="ln" pathLength="1" d="M95 400V330M80 345C80 300 110 300 110 345"/>
  <path class="ln" pathLength="1" d="M650 400V340M630 360C630 310 670 310 670 360"/>
 </g>
 <g class="win" fill="#D7AE62" stroke="#5B4873" stroke-width="4">
  <rect x="225" y="250" width="56" height="48" rx="3"/><rect x="380" y="250" width="56" height="48" rx="3"/><rect x="505" y="305" width="60" height="44" rx="3"/><circle cx="330" cy="190" r="18"/>
 </g>
</svg>`;
// captions: phrase strings. [a b] = highlight group, _x_ = serif accent, ^x = cue name
function parse(script,RATE=1,TIM=null){
  const out=[];let t=.15;const cues={};
  script.forEach((ph,pi)=>{
    const o=typeof ph==="string"?{t:ph}:ph; if(o.at!=null)t=o.at;
    const toks=[];const re=/\[([^\]]+)\]|(\S+)/g;let m;
    while((m=re.exec(o.t))){let txt,kind;
      if(m[1]){txt=m[1];kind="h"}else{txt=m[2];if(/^_.*_[.,!?]?$/.test(txt)){kind="s";txt=txt.replace(/_/g,"")}}
      let cue=null;if(txt.startsWith("^")){txt=txt.slice(1);cue=txt.replace(/[^A-Za-z0-9]/g,"").toLowerCase()}
      toks.push({txt,kind,cue});}
    let start=t,end;
    if(TIM){const T=TIM[pi];start=T.s;end=T.e;toks.forEach((k,i)=>k.t=T.w[i])}
    else{toks.forEach(k=>{k.t=t;const words=k.txt.split(" ").length;t+=(.27+.022*k.txt.length/words)*words*(o.rate||1)*RATE;
      if(/[,;]$/.test(k.txt))t+=.12;if(/[.?!:]$/.test(k.txt))t+=.22;});end=t+(o.hold??.35)}
    const nm=(n,v)=>{let q=n,i=2;while(q in cues)q=n+(i++);cues[q]=v};
    toks.forEach(k=>{if(k.cue)nm(k.cue,k.t);else if(k.kind)nm(k.txt.replace(/[^A-Za-z0-9]/g,"").toLowerCase(),k.t)});
    cues["p"+pi]=start;cues["e"+pi]=end;
    out.push({start,end,toks,say:o.say,pause:o.pause});t=end+.05;
  });
  return {phrases:out,cues,end:TIM?out[out.length-1].end:t};
}
// voiceover timing: rN.timing.js sets window.TIMING={text,phrases}. ?notiming skips it.
const REEL=location.pathname.split("/").pop().replace(".html","");
if(!/notiming/.test(location.search))document.write(`<script src="${REEL}.timing.js"><\/script>`);
document.write(`<script src="hooks.js"><\/script>`);
// The first HOOK phrases are the hook: big, all cream, each word slamming in. The rest build
// softly at the top.
function caption(t,P,HOOK=0){
  const el=E.$("#cap");const pi=P.findIndex(p=>t>=p.start&&t<p.end),p=P[pi];if(!p){el.innerHTML="";return}
  const big=pi<HOOK;el.classList.toggle("hookcap",big);
  const fo=1-E.P(t,p.end-.12,p.end);let last=-1;p.toks.forEach((w,i)=>{if(t>=w.t)last=i});
  el.innerHTML=p.toks.map((w,i)=>{const e=E.ease(E.P(t,w.t,w.t+.2));
    let st;if(big){const k=E.P(t,w.t-.02,w.t+.12);st=`opacity:${E.clamp(k*6)*fo};transform:scale(${1.45-.45*E.back(k)});color:var(--cream)`}
    else st=`opacity:${e*fo};filter:blur(${(1-e)*10}px);transform:translateY(${(1-e)*14}px);color:${i===last||w.kind?"var(--cream)":"var(--rose)"}`;
    if(w.kind==="h"){const b=E.ease(E.P(t,w.t,w.t+.25));st+=`;background:rgba(54,21,28,${b});box-shadow:0 0 0 ${3*b}px rgba(244,235,221,${b})`;
      return `<span class="w hl" style="${st}">${w.txt}${b>.05?`<i style="left:-8px;top:-8px;opacity:${b}"></i><i style="right:-8px;bottom:-8px;opacity:${b}"></i>`:""}</span>`}
    if(w.kind==="s")return `<span class="w serif" style="${st};color:var(--gold)">${w.txt}</span>`;
    return `<span class="w" style="${st}">${w.txt}</span>`}).join("");
}
E.boot=(R)=>{
  const st=document.createElement("style");st.textContent=CSS+(R.css||"");document.head.appendChild(st);
  document.body.innerHTML=`<div id="grid"></div><div id="vig"></div>
  <svg id="grain" width="1080" height="1920"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>
  <div id="wm"><svg width="44" height="44" viewBox="0 0 120 120">${MARK}</svg>@gethopkins</div><div id="cap"></div><div id="fol"><span>${E.icon("user",40,"#2A0F14",2.4)}Follow @gethopkins</span></div>
  ${R.scenes}
  <div id="end"><div class="lock"><svg id="endmark" width="160" height="160" viewBox="0 0 120 120">${MARK}</svg><div class="nm">Hopkins</div></div>
  <div class="cta">${R.cta||"Follow @gethopkins"}</div></div><div id="fade"></div>`;
  const spoken=R.script.map(ph=>typeof ph==="string"?ph:ph.t).join("|");
  let TIM=null;if(window.TIMING){if(window.TIMING.text===spoken)TIM=window.TIMING.phrases;else console.warn("timing is stale, run vo.py again")}
  const {phrases,cues,end}=parse(R.script,R.rate||.9,TIM);
  window.SPOKEN={tail:R.tail??.3,signoff:!!R.signoff,text:spoken,phrases:phrases.map(p=>({toks:p.toks.map(k=>k.txt),say:p.say||null,pause:p.pause??null}))};window.TIMED=!!TIM;
  const C=new Proxy(cues,{get:(o,k)=>{if(!(k in o))throw new Error("no cue "+String(k));return o[k]}});
  const endAt=end+(R.tail??.3), D=endAt+3.4;
  // Sound effects on the reel's own clock: R.sfx is a list of {s:sound, at:seconds or cue, d:offset,
  // g:gain, shake:pixels}. rec.mjs mixes them under the voice with sfx.py.
  const SFX=(R.sfx||[]).map(x=>({s:x.s,t:(typeof x.at==="string"?C[x.at]:x.at)+(x.d||0),g:x.g??1,shake:x.shake||0}));
  window.SFX=SFX.map(({s,t,g})=>({s,t,g}));const SHAKES=SFX.filter(x=>x.shake).map(x=>[x.t,x.shake]);
  window.CUES=cues;window.END_AT=endAt;window.DURATION=D;
  window.render=t=>{
    caption(t,phrases,R.hook??2);E.vis("#wm",t,0,endAt,{dy:0,blur:0});E.vis("#fol",t,cues["p"+(phrases.length-1)]-.1,endAt,{dy:40});
    const [sx,sy]=E.jolt(t,SHAKES);document.body.style.transform=sx||sy?`translate(${sx}px,${sy}px)`:"none";
    R.update(t,C,endAt);
    // end card
    const ek=E.vis("#end",t,endAt+.15,null,{dy:40});
    const m=E.$("#endmark");const r=E.ease(E.P(t,endAt+.3,endAt+1.1));
    m.querySelector(".gd").style.transform=`translate(${(1-r)*-6}px,${(1-r)*14}px)`;
    const nk=E.ease(E.P(t,endAt+.45,endAt+1));E.$("#end .nm").style.opacity=nk;E.$("#end .nm").style.transform=`translateX(${(1-nk)*-24}px)`;
    E.$("#end .cta").style.opacity=E.ease(E.P(t,endAt+1.4,endAt+1.8));
    E.$("#end .cta").style.transform=`translateY(${(1-E.ease(E.P(t,endAt+1.4,endAt+1.8)))*20}px)`;
    E.$("#fade").style.opacity=E.ease(E.P(t,D-.4,D));
  };
};
})();
