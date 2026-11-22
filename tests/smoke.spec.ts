import {test,expect} from '@playwright/test';
test('local world, movement, save and rendering have no runtime errors',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.addInitScript(()=>localStorage.setItem('vl-quality','0.7'));await page.goto('/');await expect(page.locator('#loading')).toContainText('WORLD READY',{timeout:45000});
 await page.screenshot({path:'artifacts/menu.png'});await page.locator('#play').click();await expect(page.locator('#hud')).toBeVisible();
 await page.keyboard.down('KeyW');await page.waitForTimeout(1300);await page.keyboard.up('KeyW');
 await page.keyboard.press('KeyP');await expect(page.locator('#panel')).toBeVisible();await page.locator('[data-save="1"]').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('vl-save-1')||'null'));expect(saved.version).toBe(1);expect(saved.x).not.toBe(44);
 await page.locator('#close').click();await page.keyboard.press('KeyM');await page.locator('#campus').click();await expect(page.locator('#district')).toContainText('Шарага');
 await page.waitForTimeout(2000);const fps=await page.locator('html').getAttribute('data-fps');expect(Number(fps)).toBeGreaterThan(0);console.log('Headless software-rendered FPS:',fps);
 await page.screenshot({path:'artifacts/desktop.png'});expect(errors).toEqual([]);
});
test.describe('touch device',()=>{test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
test('mobile controls and menu fit viewport',async({page})=>{const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await page.addInitScript(()=>localStorage.setItem('vl-quality','0.7'));await page.goto('/');await expect(page.locator('#loading')).toContainText('WORLD READY',{timeout:45000});await page.locator('#play').click();await expect(page.locator('#stick')).toBeVisible();await expect(page.locator('#interact')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'artifacts/mobile.png'});expect(errors).toEqual([])});
});
