// Renders each reel's cover to PNG: node covers.mjs out_dir
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdirSync } from "node:fs";
const [out="."]=process.argv.slice(2); mkdirSync(out,{recursive:true});
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1080,height:1920}});
p.on("pageerror",e=>console.log("ERR",e.message));
for(const c of ["r1","r2","r3","r4","r5","launch","meet","r6","r7","r8","r9","r10","r11","r12","r13","r14","r15","r16","r17"]){await p.goto(`file://${process.cwd()}/${c==="meet"?"cover-meet.html?notiming":`covers.html?c=${c}&notiming`}`);await p.waitForTimeout(500);await p.screenshot({path:`${out}/${c}.png`});}
await b.close();
