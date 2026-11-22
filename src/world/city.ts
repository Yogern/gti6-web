import * as T from 'three';
import R from '@dimforge/rapier3d-compat';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export function createCity(scene:T.Scene,physics:R.World){
 const solids:T.Object3D[]=[];
 const materials=new Map<string,T.MeshStandardMaterial>();
 const mat=(c:number,roughness=.8)=>{const key=`${c}/${roughness}`;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color:c,roughness}));return materials.get(key)!};
 const concrete=mat(0xe1cbb6),road=mat(0x303f44),sand=mat(0xdac9a1),white=mat(0xf4e5c9),green=mat(0x425e38);
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,collide=false)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);if(collide){physics.createCollider(R.ColliderDesc.cuboid(w/2,h/2,d/2).setTranslation(x,y,z));solids.push(mesh)}return mesh};
 box(-115,-.5,0,420,1,650,sand,true);
 box(-60,-.05,0,175,.2,580,mat(0x7e8a70));
 box(35,.04,0,20,.2,580,road);box(16,.08,0,17,.25,580,concrete);box(50,.08,0,10,.25,580,concrete);
 for(let z=-280;z<280;z+=9)box(35,.16,z,.15,.01,4,white);
 for(let z=-240;z<=240;z+=80){box(-56,.1,z,165,.2,13,road);for(let x=20;x<50;x+=3)box(x,.22,z,1.2,.01,8,white)}
 const ocean=new T.Mesh(new T.PlaneGeometry(650,1100,100,100),new T.MeshStandardMaterial({color:0x438e99,metalness:.55,roughness:.25,transparent:true,opacity:.95}));ocean.rotation.x=-Math.PI/2;ocean.position.set(420,.04,0);scene.add(ocean);
 const waveBase=new Float32Array(ocean.geometry.attributes.position.array);
 const texCanvas=document.createElement('canvas');texCanvas.width=128;texCanvas.height=256;const ctx=texCanvas.getContext('2d')!;ctx.fillStyle='#d8cec2';ctx.fillRect(0,0,128,256);for(let y=5;y<256;y+=24)for(let x=8;x<128;x+=28){ctx.fillStyle=(x+y)%3===0?'#cba582':'#506e76';ctx.fillRect(x,y,15,17);ctx.fillStyle='#e5ddc8';ctx.fillRect(x,y+17,19,3)}const tex=new T.CanvasTexture(texCanvas);tex.colorSpace=T.SRGBColorSpace;
 const colors=[0xe6cdb5,0xc6d4cf,0xf0d9b9,0xe4afa3,0xa9bec2];
 const facades=colors.map(color=>new T.MeshStandardMaterial({color,map:tex,roughness:.8}));
 for(let i=0;i<58;i++){const row=i%3,col=Math.floor(i/3);const x=-10-row*48,z=-265+col*29;if(z>240||(x<-45&&z>-25&&z<65))continue;const h=12+((i*37)%57),w=22+(i%3)*5,d=20;const facade=facades[i%5];box(x,h/2,z,w,h,d,facade,true);box(x,h+.4,z,w+1,1,d+1,white);box(x,h+1.4,z,w*.6,2,d*.5,concrete);for(let f=5;f<h;f+=6)box(x,f,z+d/2+.5,w+1,.3,1,white);if(i%4===0){box(x,3,z+11,w,1.2,2,mat(0xc57c6e));}}
 // Detailed procedural palms: tapered trunk with curved, pinnate fronds.
 const trunkmat=mat(0x88705a),leafmat=new T.MeshStandardMaterial({color:0x47663e,side:T.DoubleSide,roughness:.85});
 for(let i=0;i<54;i++){const x=i%2===0?52:14,z=-270+Math.floor(i/2)*21;const h=9+(i%4);const trunk=new T.Mesh(new T.CylinderGeometry(.16,.35,h,7),trunkmat);trunk.position.set(x,h/2,z);trunk.rotation.z=.07;trunk.castShadow=true;scene.add(trunk);for(let j=0;j<7;j++){const a=j*Math.PI*2/7;const positions:number[]=[];for(let k=0;k<9;k++){const t=k/8,r=t*5,yy=Math.sin(t*Math.PI)*1.6-t*1.7,width=Math.sin(t*Math.PI)*.7;positions.push(Math.cos(a)*r-Math.sin(a)*width,yy,Math.sin(a)*r+Math.cos(a)*width,Math.cos(a)*r+Math.sin(a)*width,yy,Math.sin(a)*r-Math.cos(a)*width)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));const ids=[];for(let k=0;k<8;k++){const n=k*2;ids.push(n,n+1,n+2,n+1,n+3,n+2)}g.setIndex(ids);g.computeVertexNormals();const leaf=new T.Mesh(g,leafmat);leaf.position.set(x-h*.07,h,z);scene.add(leaf)}}
 // Boardwalk, benches, lamps and lifeguard stations.
 for(let i=0;i<30;i++){const z=-270+i*19;box(64,.2,z,8,.3,18,mat(0xb8a284));if(i%3===0){box(61,1,z,2.5,.2,.7,white);box(61,.6,z- .2,.15,1,.15,road);box(62,.6,z+.2,.15,1,.15,road);box(48,4,z,.12,8,.12,road);const bulb=new T.Mesh(new T.SphereGeometry(.28,8,8),new T.MeshBasicMaterial({color:0xffe2ad}));bulb.position.set(48,8,z);scene.add(bulb)}}
 for(let i=0;i<5;i++){const z=i*85-180;box(87,2.8,z,5,3,5,mat(i%2?0xa4ced0:0xdcaaa1),true);box(87,4.5,z,6,.3,6,white);box(87,1,z+3,4,.2,2,white);for(const dx of [-2,2])box(87+dx,1,z,.2,2,.2,white)}
 // Fictional campus shell, with an open ground-floor hall and courtyard.
 box(-90,.35,18,45,.7,32,concrete);for(const x of [-111,-69]){box(x,7,18,3,14,32,white,true)}box(-90,12,18,45,3,32,concrete,true);box(-90,5,3,45,10,1,concrete,true);
 const signCanvas=document.createElement('canvas');signCanvas.width=1024;signCanvas.height=128;const sc=signCanvas.getContext('2d')!;sc.fillStyle='#263e43';sc.fillRect(0,0,1024,128);sc.fillStyle='#e8edca';sc.font='bold 66px sans-serif';sc.textAlign='center';sc.fillText('ШАРАГА / CAMPUS',512,87);const sign=new T.Mesh(new T.PlaneGeometry(34,4.25),new T.MeshBasicMaterial({map:new T.CanvasTexture(signCanvas)}));sign.position.set(-90,10,34.1);scene.add(sign);
 for(let i=0;i<12;i++){const x=-104+(i%4)*9,z=10+Math.floor(i/4)*7;box(x,1.2,z,3,.2,1.5,mat(0x917353),true);for(const dx of [-1.2,1.2])box(x+dx,.65,z,.12,1.2,.12,road);box(x,.7,z+2,1.2,.15,1,road);box(x,1.3,z+2.4,1.2,1,.1,road)}
 // Batch static architecture and foliage by material to reduce draw calls.
 const batches=new Map<T.Material,{geometries:T.BufferGeometry[];meshes:T.Mesh[]}>();
 for(const object of [...scene.children]){if(!(object instanceof T.Mesh)||object===ocean||Array.isArray(object.material))continue;object.updateMatrixWorld();let b=batches.get(object.material);if(!b){b={geometries:[],meshes:[]};batches.set(object.material,b)}b.geometries.push(object.geometry.clone().applyMatrix4(object.matrixWorld));b.meshes.push(object)}
 for(const [material,b] of batches){const geometry=mergeGeometries(b.geometries);if(!geometry)continue;const mesh=new T.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);for(const o of b.meshes)scene.remove(o);for(const g of b.geometries)g.dispose()}
 return {solids,update:(time:number)=>{const p=ocean.geometry.attributes.position as T.BufferAttribute;for(let i=0;i<p.count;i++){p.setZ(i,Math.sin(waveBase[i*3]*.12+time)*.18+Math.cos(waveBase[i*3+1]*.08+time*.7)*.14)}p.needsUpdate=true},green};
}
