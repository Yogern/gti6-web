export interface Save {version:1;x:number;z:number;yaw:number;cash:number;time:number;date:string;driving:boolean}
export function validate(v:unknown):v is Save {if(!v||typeof v!=='object')return false;const s=v as Save;return s.version===1&&[s.x,s.z,s.yaw,s.cash,s.time].every(Number.isFinite)&&Math.abs(s.x)<500&&Math.abs(s.z)<500&&s.cash>=0&&s.time>=0&&s.time<=24&&typeof s.date==='string'&&typeof s.driving==='boolean'}
export function readSave(slot=0):Save|null{try{const s:unknown=JSON.parse(localStorage.getItem(`vl-save-${slot}`)||'null');return validate(s)?s:null}catch{return null}}
export function writeSave(s:Save,slot=0){localStorage.setItem(`vl-save-${slot}`,JSON.stringify(s))}
