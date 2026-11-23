const fs=require('fs'),assert=require('assert');
const code=fs.readFileSync('.github/workflows/publication-recovery.yml','utf8').split('          script: |\n')[1].split('\n').map(line=>line.slice(12)).join('\n');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
async function scenario(mode){
 let merged=0,dispatch=0,retry=0,failed=0;
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const paths=[`content/daily/${date}.json`,`content/editorial/${date}.json`];
 const pr={number:99,user:{login:mode==='wrong-author'?'stranger':'owner'},head:{sha:'head',repo:{full_name:'owner/repo'}},base:{ref:'main'},draft:false,mergeable:true,mergeable_state:'clean'};
 const pulls={list:()=>{},get:async()=>({data:pr}),listFiles:()=>{},merge:async a=>{assert.equal(a.sha,'head');merged++;return {data:{merged:true,sha:'merge'}}}};
 const github={paginate:async fn=>fn===pulls.list?[pr]:paths.map(filename=>({filename,status:'added'})),rest:{pulls,
 repos:{getContent:async()=>{if(mode==='already-main')return {};throw {status:404}},getCombinedStatusForRef:async()=>({data:{statuses:[]}})},
 checks:{listForRef:async()=>({data:{check_runs:['build','trust','search','deep-read-quality','pwa'].map((name,id)=>({name,id,status:mode==='pending'?'in_progress':'completed',conclusion:(mode==='failed'||mode==='exhausted')?'failure':'success'}))}})},
 actions:{listWorkflowRunsForRepo:async()=>({data:{workflow_runs:mode==='exhausted'?[{id:1,conclusion:'failure',run_attempt:3},{id:2,conclusion:'failure',run_attempt:3}]:[{id:1,conclusion:'failure',run_attempt:2},{id:2,conclusion:'failure',run_attempt:3}]}}),reRunWorkflowFailedJobs:async()=>{retry++},createWorkflowDispatch:async()=>{dispatch++}}}};
 const core={notice:()=>{},setFailed:()=>{failed++},summary:{addHeading(){return this},addRaw(){return this},write:async()=>{}}};
 await new AsyncFunction('github','context','core',code)(github,{repo:{owner:'owner',repo:'repo'}},core);
 if(mode==='green'){assert.equal(merged,1);assert.equal(dispatch,1)}else{assert.equal(merged,0);assert.equal(dispatch,0)}
 if(mode==='failed'){assert.equal(retry,1);assert.equal(failed,0)}
 if(mode==='exhausted'){assert.equal(retry,0);assert.equal(failed,1)}
 console.log('PASS recovery',mode);
}
(async()=>{for(const mode of ['green','pending','failed','exhausted','wrong-author','already-main'])await scenario(mode)})().catch(e=>{console.error(e);process.exit(1)});
