// Renders film.html to MP4 with real motion blur: frames are drawn at 90 fps across parallel
// browsers, then every 3 frames are blended into one 30 fps frame.
//   node rec.mjs out.mp4 [audio.wav]          stills: node rec.mjs --stills dir 2.5 9.8
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdirSync, existsSync, readFileSync } from "node:fs"; import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:http"; import { join, extname } from "node:path";
const FFMPEG="/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2";
const PAGE=process.env.PAGE||"film.html",SUB=3,FPS=30,WORKERS=+(process.env.WORKERS||4),VW=+(process.env.W||1080),VH=+(process.env.H||1920);
const args=process.argv.slice(2);
async function open(){
 // module scripts and fonts load over http, so serve content/ on a local port
 const ROOT=join(process.cwd(),".."),MT={".html":"text/html",".js":"text/javascript",".woff2":"font/woff2",".png":"image/png",".jpg":"image/jpeg"};
 const srv=createServer((q,r)=>{const f=join(ROOT,decodeURIComponent(q.url.split("?")[0]));if(!f.startsWith(ROOT)||!existsSync(f)){r.writeHead(404);return r.end()}r.writeHead(200,{"Content-Type":MT[extname(f)]||"application/octet-stream"});r.end(readFileSync(f))}).listen(0);
 const b=await chromium.launch();
 const p=await b.newPage({viewport:{width:VW,height:VH},deviceScaleFactor:+(process.env.DSF||1)});
 p.on("pageerror",e=>console.log("ERR",e.message));
 await p.goto(`http://127.0.0.1:${srv.address().port}/launch/${PAGE}?notiming&w=${VW}&h=${VH}`);await p.waitForFunction(()=>window.READY,null,{timeout:120000});
 return {p,close:async()=>{await b.close();srv.close()}};
}
if(args[0]==="--stills"){const [,dir,...ts]=args;mkdirSync(dir,{recursive:true});const {p,close}=await open();
 for(const t of ts){await p.evaluate(t=>render(+t),t);await p.screenshot({path:`${dir}/${t}.png`})}await close();process.exit(0)}
if(args[0]==="--range"){const [,a,b,dir]=args;const {p,close}=await open();
 for(let i=+a;i<+b;i++){await p.evaluate(t=>render(t),i/(FPS*SUB));await p.screenshot({path:`${dir}/f${String(i).padStart(5,"0")}.jpg`,type:"jpeg",quality:95})}await close();process.exit(0)}
const [out,audio]=args;const {p,close}=await open();const D=await p.evaluate(()=>window.DURATION);await close();
const N=Math.round(D*FPS*SUB),dir="fr_"+Date.now();mkdirSync(dir);
await Promise.all([...Array(WORKERS)].map((_,w)=>new Promise((res,rej)=>{const a=Math.floor(N*w/WORKERS),b=Math.floor(N*(w+1)/WORKERS);
 const c=spawn(process.execPath,[process.argv[1],"--range",a,b,dir],{stdio:"inherit"});c.on("exit",k=>k?rej(new Error("worker "+w)):res())})));
const au=audio&&existsSync(audio)?["-i",audio]:[];
execFileSync(FFMPEG,["-hide_banner","-loglevel","error","-y","-framerate",String(FPS*SUB),"-i",`${dir}/f%05d.jpg`,...au,
 "-vf",`tmix=frames=${SUB},select='not(mod(n+1\\,${SUB}))',setpts=N/${FPS}/TB`,"-r",String(FPS),"-map","0:v",...(au.length?["-map","1:a","-c:a","aac","-b:a","256k"]:[]),
 "-c:v","libx264","-pix_fmt","yuv420p","-crf","16","-preset","slow","-movflags","+faststart",out]);
console.log("done",out,D+"s");
