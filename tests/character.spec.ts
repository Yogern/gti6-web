import {test,expect} from '@playwright/test';
import {movementHeading,turnToward} from '../src/entities/character';
test('negative-Z model faces every movement direction and turns across angle seam',()=>{
 for(const [x,z] of [[0,-1],[0,1],[1,0],[-1,0],[1,1],[-1,1]]){
  const heading=movementHeading(x,z),length=Math.hypot(x,z);
  expect(-Math.sin(heading)).toBeCloseTo(x/length);expect(-Math.cos(heading)).toBeCloseTo(z/length);
 }
 const angle=turnToward(Math.PI-.01,-Math.PI+.01,1/60);
 expect(angle).toBeGreaterThan(Math.PI-.01);expect(angle).toBeLessThan(Math.PI+.01);
});
