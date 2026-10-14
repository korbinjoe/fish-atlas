async (page) => {
 const session=await page.context().newCDPSession(page);
 await session.send('Network.enable');await session.send('Network.setCacheDisabled',{cacheDisabled:true});
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('about:blank');
 await page.goto('http://127.0.0.1:4174/#/explore');
 await page.locator('canvas').waitFor({state:'visible'});
 await page.getByText('正在展开水下世界…').waitFor({state:'hidden'});
 const readyMs=await page.evaluate(()=>performance.now());
 await page.waitForFunction(()=>Array.from(document.images).every(img=>img.complete));
 const metrics=await page.evaluate(()=>({
   userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],
   transferBytes:performance.getEntriesByType('resource').reduce((s,r)=>s+r.transferSize,0),
   requests:performance.getEntriesByType('resource').length,
   imageRequests:performance.getEntriesByType('resource').filter(r=>r.name.includes('/media/')).length,
   brokenImages:Array.from(document.images).filter(img=>!img.naturalWidth).length,
   horizontalOverflow:document.documentElement.scrollWidth>innerWidth
 }));
 await page.screenshot({path:'docs/desktop-preview.png'});
 return {globeReadyMs:Math.round(readyMs),...metrics};
}
