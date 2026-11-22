import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
const run=(cmd,args)=>execFileSync(cmd,args,{stdio:'inherit'});
const version=JSON.parse(readFileSync('package.json','utf8')).version;
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Expected semantic version');
const tag=`v${version}`,dir=`artifacts/${tag}`;
const publish=process.argv.includes('--publish'),drive=process.argv.includes('--drive');
const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
if(publish){if(process.env.ASSETS_CLEARED!=='1')throw Error('Publication blocked: review ASSET_NOTICES.md and clear redistribution rights first.');if(!branch||branch==='main')throw Error('Publish only from the assigned working branch');if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Commit verified changes to the current branch before publishing');}
if(drive&&!process.env.DRIVE_REMOTE)throw Error('Configure DRIVE_REMOTE with an existing authenticated rclone remote; never commit credentials.');
run('npm',['run','typecheck']);run('npm',['run','build']);run('npm',['test']);
mkdirSync(dir,{recursive:true});
// ZIP updates retain deleted hashed bundles: recreate only our generated archives.
for(const name of [`dist-${tag}.zip`,`source-${tag}.zip`])rmSync(`${dir}/${name}`,{force:true});
run('zip',['-qr',`${dir}/dist-${tag}.zip`,'dist']);
// Working tree archive includes the milestone before commit, never secrets or browser binaries.
run('zip',['-qr',`${dir}/source-${tag}.zip`,'src','server','scripts','tests','public','index.html','package.json','package-lock.json','tsconfig.json','vite.config.ts','playwright.config.ts','README.md','PROJECT_MEMORY.md','AGENTS.md','.cursorrules','CHANGELOG.md','RELEASE_NOTES.md','ASSET_NOTICES.md','LICENSE','.gitignore']);
writeFileSync(`${dir}/verification.json`,JSON.stringify({version,branch,verifiedAt:new Date().toISOString(),gates:['typecheck','production-build','browser-smoke'],published:false},null,2));
if(drive)run('rclone',['copy',dir,`${process.env.DRIVE_REMOTE.replace(/\/$/,'')}/projects/game/gta6-clone/${tag}/`]);
if(publish){run('git',['push','origin',branch]);run('git',['tag','-a',tag,'-m',`${tag}: coastal sandbox preview`]);run('git',['push','origin',`refs/tags/${tag}`]);run('gh',['release','create',tag,`${dir}/dist-${tag}.zip`,`${dir}/source-${tag}.zip`,'--prerelease','--target',branch,'--title',`${tag} — Coastal Preview`,'--notes-file','RELEASE_NOTES.md']);}
console.log(`${tag}: verified archives prepared in ${dir}. External publication: ${publish?'requested':'not requested'}. Drive: ${drive?'requested':'not requested'}.`);
