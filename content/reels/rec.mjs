import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdirSync } from "node:fs"; import { execFileSync } from "node:child_process";
const [file,out]=process.argv.slice(2); const FPS=30, dir="fr_"+file.replace(".html","")+"_"+Date.now(); mkdirSync(dir);
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1080,height:1920}});
p.on("pageerror",e=>console.log("ERR",e.message));
await p.goto("file://"+process.cwd()+"/"+file); await p.waitForTimeout(1000);
const D=await p.evaluate(()=>window.DURATION); const N=Math.round(D*FPS);
for(let i=0;i<N;i++){await p.evaluate(t=>render(t),i/FPS);await p.screenshot({path:`${dir}/f${String(i).padStart(5,"0")}.jpg`,type:"jpeg",quality:93});}
await b.close();
execFileSync("/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2",["-hide_banner","-loglevel","error","-y","-framerate","30","-i",`${dir}/f%05d.jpg`,"-c:v","libx264","-pix_fmt","yuv420p","-crf","18","-preset","slow","-movflags","+faststart",out]);
console.log("done",out,N,"frames",D.toFixed(1)+"s");
