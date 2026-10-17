import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
const [file,out,...ts]=process.argv.slice(2); mkdirSync(out,{recursive:true});
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1080,height:1920}});
p.on("pageerror",e=>console.log("ERR",e.message));
await p.goto("file://"+process.cwd()+"/"+file); await p.waitForTimeout(900);
const D=await p.evaluate(()=>window.DURATION); console.log("duration",D.toFixed(1));
let list=ts; if(ts[0]==="auto"){const n=+ts[1]||24; list=[...Array(n)].map((_,i)=>(D*(i+.5)/n).toFixed(2));}
for(const t of list){await p.evaluate(t=>render(+t),t);await p.screenshot({path:`${out}/${t}.png`});}
writeFileSync(out+"/list.json",JSON.stringify(list)); await b.close();
