const {collectCinema}=require("./multiplex-parser");
const {writeSchedule}=require("./google-sheets");
const {normalizeConfig}=require("./config");
const jobs=new Map();
const queue=[];
let running=false, config=normalizeConfig();
function setConfig(next){config=normalizeConfig(next);return config;}
function getConfig(){return config;}
function snapshot(){return {running,queued:queue.length,jobs:[...jobs.values()].slice(-30).reverse()};}
function enqueue(cinemaKeys,trigger="manual") {
  const ids=[];
  for(const key of cinemaKeys) {
    const cinema=config.cinemas[key];
    if(!cinema||!cinema.enabled||!cinema.spreadsheetId) continue;
    const existing=[...jobs.values()].find(j=>j.cinema===key&&["queued","running"].includes(j.status));
    if(existing){ids.push(existing.id);continue;}
    const job={id:`job_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,cinema:key,trigger,status:"queued",progress:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    jobs.set(job.id,job);queue.push(job);ids.push(job.id);
  }
  void processQueue();
  return ids;
}
async function processQueue(){
  if(running)return; running=true;
  try{
    while(queue.length){
      const job=queue.shift();job.status="running";job.startedAt=new Date().toISOString();job.updatedAt=job.startedAt;
      try{
        const result=await collectCinema(job.cinema,config.cinemas[job.cinema],config.parser,p=>{
          job.progress=Math.floor(p.completed/p.total*90);job.progressInfo=p;job.updatedAt=new Date().toISOString();
        });
        const saved=await writeSchedule(config.cinemas[job.cinema].spreadsheetId,result.sessions,{cinema:job.cinema,failed:result.failed});
        job.status="completed";job.progress=100;job.result={...result,persisted:saved};job.finishedAt=new Date().toISOString();
      }catch(error){job.status="failed";job.error=error.message;job.details=error.details||null;job.finishedAt=new Date().toISOString();}
      job.updatedAt=new Date().toISOString();
    }
  }finally{running=false;}
}
module.exports={setConfig,getConfig,enqueue,snapshot};
