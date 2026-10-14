import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
for(const mobile of [false,true]){
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
 const page=await ctx.newPage();const cdp=await ctx.newCDPSession(page);
 await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
 if(mobile){await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:1.25e6,uploadThroughput:625000});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
 await page.goto('http://127.0.0.1:4174/?benchmark=1#/explore');
 await page.waitForFunction(()=>Number(document.querySelector('canvas')?.dataset.renderFrames)>=1);
 const ready=await page.evaluate(()=>Math.round(performance.now()));
 await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete));
 const network=await page.evaluate(()=>({subresourceBytes:performance.getEntriesByType('resource').reduce((s,r)=>s+r.transferSize,0),resourceCount:performance.getEntriesByType('resource').length,imageRequests:performance.getEntriesByType('resource').filter(r=>r.name.includes('/media/')).length,overflow:document.documentElement.scrollWidth>innerWidth,userAgent:navigator.userAgent}));
 await page.getByRole('button',{name:'开启自转'}).click();
 const animation=await page.evaluate(()=>new Promise(resolve=>{const c=document.querySelector('canvas'),frames=Number(c.dataset.renderFrames);const start=performance.now();let last=start;const intervals=[];function sample(now){intervals.push(now-last);last=now;if(now-start<4000)requestAnimationFrame(sample);else{const sorted=intervals.slice(2).sort((a,b)=>a-b);resolve({durationMs:Math.round(now-start),renderFrames:Number(c.dataset.renderFrames)-frames,renderFps:Math.round((Number(c.dataset.renderFrames)-frames)/((now-start)/1000)),rafP95Ms:Math.round(sorted[Math.floor(sorted.length*.95)])});}}requestAnimationFrame(sample);}));
 await page.getByRole('button',{name:'暂停自转'}).click();
 // An actual touch sequence on Chrome's emulated touch surface; not a physical handset.
 let touchVerified=null;
 if(mobile){const box=await page.locator('canvas').boundingBox();const start=Number(await page.locator('canvas').getAttribute('data-render-frames'));const x=box.x+box.width*.45,y=box.y+box.height*.4;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+i*8,y:y+i*2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(n=>Number(document.querySelector('canvas').dataset.renderFrames)>n,start);touchVerified=(await page.getByRole('dialog').count())===0;}
 await page.screenshot({path:mobile?'docs/mobile-preview.png':'docs/desktop-preview.png',fullPage:true});
 results.push({profile:mobile?'Chrome touch emulation, 4x CPU, 10Mbps down, 5Mbps up, 80ms latency':'Desktop Chrome, no throttling',viewport:page.viewportSize(),canvasRenderedMs:ready,...network,...animation,touchDidNotOpenDetail:touchVerified});await ctx.close();
}
await browser.close();await writeFile('docs/performance-v2.json',JSON.stringify({date:'2026-10-09',sampleCountPerProfile:1,physicalMobile:false,note:'Frames counted from Three.js renderer during 4s auto rotation. CPU/network emulation is not physical-device validation. Readiness is not LCP.',results},null,2));console.log(JSON.stringify(results,null,2));
