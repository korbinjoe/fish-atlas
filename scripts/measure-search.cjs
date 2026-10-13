async (page) => {
 await page.goto('http://127.0.0.1:4174/#/atlas');
 await page.locator('.fish-card').first().waitFor({state:'visible'});
 const times=await page.evaluate(async()=>{
  const input=document.querySelector('input[aria-label="搜索鱼种"]');
  const samples=[];
  for(const [query,count] of [['斗鱼',1],['Neon tetra',2],['zz_no_species',0]]){
   const start=performance.now();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,query);input.dispatchEvent(new Event('input',{bubbles:true}));
   await new Promise((resolve,reject)=>{let n=0;function check(){if(document.querySelectorAll('.fish-card').length===count){requestAnimationFrame(resolve);return;}if(n++>120){reject(new Error('Search did not update'));return;}requestAnimationFrame(check);}requestAnimationFrame(check)});
   samples.push({query,count,paintMs:Math.round(performance.now()-start)});
  }return samples;
 });
 await page.goto('http://127.0.0.1:4174/#/planner');
 await page.getByRole('spinbutton',{name:'缸长 cm',exact:true}).fill('100');
 await page.getByRole('spinbutton',{name:'缸宽 cm',exact:true}).fill('40');
 await page.getByRole('spinbutton',{name:'缸高 cm',exact:true}).fill('50');
 await page.getByRole('spinbutton',{name:'水温 °C',exact:true}).fill('25');
 await page.getByRole('textbox',{name:'查找规划鱼种'}).fill('红绿灯');
 await page.getByRole('button',{name:'加入规划',exact:true}).click();
 await page.getByRole('spinbutton',{name:'红绿灯数量'}).fill('10');
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:'docs/desktop-planner.png',fullPage:true});
 return times;
}
