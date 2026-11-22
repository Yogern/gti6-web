import {mkdir,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
// Download through GitHub's API so all runtime assets are local. Upstream licenses retained.
const assets=[['Soldier.glb','examples/models/gltf/Soldier.glb'],['ferrari.glb','examples/models/gltf/ferrari.glb']];
await mkdir('public/assets',{recursive:true});
for(const [name,path] of assets){
 execFileSync('curl',['--fail','--location','--retry','2','-H','Accept: application/vnd.github.raw+json',`https://api.github.com/repos/mrdoob/three.js/contents/${path}?ref=dev`,'-o',`public/assets/${name}`],{stdio:'inherit'});
 const bytes=await readFile(`public/assets/${name}`);
 if(bytes.toString('utf8',0,4)!=='glTF')throw Error(`${name}: invalid GLB`);
 console.log(name,bytes.length);
}
