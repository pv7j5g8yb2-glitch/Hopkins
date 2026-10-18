// Renders launch.html to MP4: node rec.mjs out.mp4 [audio.wav]. Stills: node rec.mjs --stills dir t1 t2 ...
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdirSync, existsSync, readFileSync } from "node:fs"; import { execFileSync } from "node:child_process";
import { createServer } from "node:http"; import { join, extname, dirname } from "node:path";
// module scripts don't load from file://, so serve content/ over a local port
const ROOT=join(process.cwd(),".."),MT={".html":"text/html",".js":"text/javascript",".woff2":"font/woff2",".png":"image/png",".jpg":"image/jpeg"};
const srv=createServer((q,r)=>{const f=join(ROOT,decodeURIComponent(q.url.split("?")[0]));if(!f.startsWith(ROOT)||!existsSync(f)){r.writeHead(404);return r.end()}r.writeHead(200,{"Content-Type":MT[extname(f)]||"application/octet-stream"});r.end(readFileSync(f))}).listen(0);
const PORT=srv.address().port;
const FFMPEG="/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2";
const args=process.argv.slice(2), stills=args[0]==="--stills";
const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
const p=await b.newPage({viewport:{width:1080,height:1920}});
p.on("pageerror",e=>console.log("ERR",e.message));p.on("console",m=>{if(m.type()==="error")console.log("console",m.text())});
await p.goto(`http://127.0.0.1:${PORT}/launch/launch.html`);await p.waitForFunction(()=>window.READY,null,{timeout:120000});
if(stills){const [,dir,...ts]=args;mkdirSync(dir,{recursive:true});for(const t of ts){await p.evaluate(t=>render(+t),t);await p.screenshot({path:`${dir}/${t}.png`})}await b.close();srv.close();process.exit(0)}
const [out,audio]=args,FPS=30,D=await p.evaluate(()=>window.DURATION),dir="fr_"+Date.now();mkdirSync(dir);
for(let i=0;i<Math.round(D*FPS);i++){await p.evaluate(t=>render(t),i/FPS);await p.screenshot({path:`${dir}/f${String(i).padStart(5,"0")}.jpg`,type:"jpeg",quality:94})}
await b.close();srv.close();
const a=audio&&existsSync(audio)?["-i",audio]:[];
execFileSync(FFMPEG,["-hide_banner","-loglevel","error","-y","-framerate","30","-i",`${dir}/f%05d.jpg`,...a,"-map","0:v",...(a.length?["-map","1:a","-c:a","aac","-b:a","192k"]:[]),"-c:v","libx264","-pix_fmt","yuv420p","-crf","17","-preset","slow","-movflags","+faststart",out]);
console.log("done",out,D+"s");
