import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

/** The bundled Soldier faces local -Z, not Three.js's conventional +Z. */
export function movementHeading(x:number,z:number){return Math.atan2(-x,-z)}
export function turnToward(current:number,target:number,dt:number){
 const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));
 return current+delta*(1-Math.exp(-dt*14));
}
export function createLocomotion(model:T.Object3D,clips:T.AnimationClip[]){
 const mixer=new T.AnimationMixer(model);
 const action=(name:string)=>{const clip=clips.find(c=>c.name===name);if(!clip)throw Error(`Missing character animation: ${name}`);return mixer.clipAction(clip).play().setEffectiveWeight(0)};
 const idle=action('Idle'),walk=action('Walk'),run=action('Run');idle.setEffectiveWeight(1);
 let weight=0,runWeight=0;
 return {update(dt:number,speed:number,sprinting:boolean){
  weight=T.MathUtils.damp(weight,Math.min(1,speed/1.8),10,dt);
  runWeight=T.MathUtils.damp(runWeight,sprinting?1:0,8,dt);
  idle.setEffectiveWeight(1-weight);walk.setEffectiveWeight(weight*(1-runWeight));run.setEffectiveWeight(weight*runWeight);
  walk.setEffectiveTimeScale(T.MathUtils.clamp(speed/2.2,.65,1.5));run.setEffectiveTimeScale(T.MathUtils.clamp(speed/6,.7,1.35));mixer.update(dt);
 }};
}

/** Pose the actual rig in the driver's seat; no hidden character or stand-in mesh. */
export function createDriver(source:T.Object3D,clips:T.AnimationClip[],car:T.Object3D){
 const model=clone(source);model.name='Seated protagonist';model.position.set(-.34,-.28,.30);model.rotation.set(0,0,0);model.scale.setScalar(.8);car.add(model);
 const mixer=new T.AnimationMixer(model);const idle=clips.find(c=>c.name==='Idle');if(!idle)throw Error('Driver requires Idle clip');mixer.clipAction(idle).play();mixer.update(0);
 const from=new T.Vector3(),to=new T.Vector3(),desired=new T.Vector3(),origin=new T.Vector3(),parentRotation=new T.Quaternion(),worldRotation=new T.Quaternion(),delta=new T.Quaternion();
 function align(name:string,childName:string,x:number,y:number,z:number){
  const bone=model.getObjectByName(`mixamorig${name}`)||model.getObjectByName(`mixamorig:${name}`);
  const child=model.getObjectByName(`mixamorig${childName}`)||model.getObjectByName(`mixamorig:${childName}`);
  if(!bone||!child||!bone.parent)throw Error(`Missing seated rig bone ${name}`);
  car.updateMatrixWorld(true);bone.getWorldPosition(from);child.getWorldPosition(to);to.sub(from).normalize();
  origin.set(0,0,0);car.localToWorld(origin);desired.set(x,y,z);car.localToWorld(desired);desired.sub(origin).normalize();
  delta.setFromUnitVectors(to,desired);bone.getWorldQuaternion(worldRotation);bone.parent.getWorldQuaternion(parentRotation);
  bone.quaternion.copy(parentRotation.invert().multiply(delta.multiply(worldRotation)));car.updateMatrixWorld(true);
 }
 for(const side of ['Left','Right']){
  align(`${side}UpLeg`,`${side}Leg`,0,-.12,-1);align(`${side}Leg`,`${side}Foot`,0,-1,-.25);
  align(`${side}Arm`,`${side}ForeArm`,side==='Left'?.15:-.15,-.65,-.65);align(`${side}ForeArm`,`${side}Hand`,0,.12,-1);
 }
 model.visible=false;
 return model;
}
