// Prints a reel's caption phrases as JSON, for vo.py.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const [file]=process.argv.slice(2);
const b=await chromium.launch(); const p=await b.newPage();
p.on("pageerror",e=>console.error("ERR",e.message));
await p.goto("file://"+process.cwd()+"/"+file+"?notiming"); await p.waitForTimeout(300);
console.log(JSON.stringify(await p.evaluate(()=>window.SPOKEN))); await b.close();
