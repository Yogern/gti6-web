import type {Vector3} from 'three';
type Point=Pick<Vector3,'x'|'z'>;
/** Heading-up neighbourhood radar, independent of the full-world travel map. */
export function drawRadar(c:CanvasRenderingContext2D,w:number,h:number,p:Point,yaw:number,heading:number,car:Point,driving:boolean){
 c.clearRect(0,0,w,h);c.fillStyle='#17272c';c.fillRect(0,0,w,h);
 const scale=driving?1.15:1.65;
 c.save();c.translate(w/2,h*.57);c.rotate(yaw);c.scale(scale,scale);c.translate(-p.x,-p.z);
 c.fillStyle='#3b4243';c.fillRect(-180,-320,275,640);c.fillStyle='#5a6863';c.fillRect(56,-320,39,640);c.fillStyle='#466d78';c.fillRect(95,-600,700,1200);
 c.strokeStyle='#252c2e';c.lineWidth=16;c.beginPath();c.moveTo(35,-320);c.lineTo(35,320);for(let z=-240;z<=240;z+=80){c.moveTo(-170,z);c.lineTo(35,z)}c.stroke();
 c.strokeStyle='#adb4ae';c.lineWidth=10;c.stroke();c.strokeStyle='#7d8782';c.lineWidth=1;c.beginPath();c.moveTo(35,-320);c.lineTo(35,320);c.stroke();
 c.fillStyle='#263235';for(let z=-265;z<=265;z+=29)for(let x=-10;x>=-106;x-=48){if(x<-45&&z>-25&&z<65)continue;c.fillRect(x-10,z-9,20,18)}
 c.fillStyle='#ba8ce8';c.fillRect(-106,6,32,26);c.strokeStyle='#ead5ff';c.lineWidth=1;c.strokeRect(-106,6,32,26);
 if(!driving){c.fillStyle='#f5faf0';c.fillRect(car.x-2,car.z-3,4,6)}
 c.restore();c.save();c.translate(w/2,h*.57);c.rotate(yaw-heading);c.beginPath();c.moveTo(0,-9);c.lineTo(6,6);c.lineTo(0,3);c.lineTo(-6,6);c.closePath();c.shadowBlur=4;c.shadowColor='#000';c.fillStyle='#fff';c.fill();c.restore();
 const northX=w/2-Math.sin(yaw)*Math.min(w,h)*.37,northY=h*.57-Math.cos(yaw)*Math.min(w,h)*.37;c.font='bold 12px Arial';c.textAlign='center';c.fillStyle='#fff';c.fillText('N',Math.max(12,Math.min(w-12,northX)),Math.max(15,Math.min(h-8,northY)));
}
