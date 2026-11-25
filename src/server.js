const express = require("express");
const helmet = require("helmet");
const cron = require("node-cron");
const { DEFAULT_CONFIG, normalizeConfig } = require("./config");
const { readConfig, saveConfig } = require("./google-sheets");
const queue = require("./job-queue");

const app = express();
const port = Number(process.env.PORT) || 3000;
const token = process.env.PARSER_ADMIN_TOKEN || "";

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "256kb" }));

function requireAdmin(req,res,next) {
  if (!token) return res.status(503).json({error:"PARSER_ADMIN_TOKEN is not configured."});
  const supplied=(req.headers.authorization||"").replace(/^Bearer\\s+/i,"");
  if(supplied!==token) return res.status(401).json({error:"Unauthorized"});
  next();
}
function activeCinemas() {
  return Object.entries(queue.getConfig().cinemas).filter(([,c])=>c.enabled&&c.spreadsheetId).map(([key])=>key);
}
async function restoreConfig() {
  const current=queue.getConfig();
  for(const [key,cinema] of Object.entries(current.cinemas)) {
    if(!cinema.spreadsheetId) continue;
    try {
      const saved=await readConfig(cinema.spreadsheetId);
      if(saved) { queue.setConfig(saved); console.log("[config] Restored config from Config tab for",key); return; }
    } catch(error) { console.warn("[config] Could not restore from Sheets:",error.message); }
  }
}
app.get("/health",(_req,res)=>res.status(200).json({ok:true,service:"multistaff-multiplex-parser",timestamp:new Date().toISOString(),adminTokenConfigured:Boolean(token)}));
app.get("/",(_req,res)=>res.status(200).json({service:"MultiStaff Multiplex Parser API",health:"/health"}));

app.get("/admin/config",requireAdmin,(_req,res)=>res.json({ok:true,config:queue.getConfig()}));
app.put("/admin/config",requireAdmin,async(req,res)=>{
  try {
    const config=normalizeConfig(req.body||{});
    queue.setConfig(config);
    const persisted=[];
    for(const [key,cinema] of Object.entries(config.cinemas)) {
      if(!cinema.enabled||!cinema.spreadsheetId) continue;
      await saveConfig(cinema.spreadsheetId,config);
      persisted.push(key);
    }
    res.json({ok:true,config,persistedToSheets:persisted});
  } catch(error) {
    console.error("[config] Save failed:",error);
    res.status(500).json({error:error.message||"Could not save parser configuration"});
  }
});
app.post("/admin/jobs",requireAdmin,(req,res)=>{
  const requested=req.body?.cinema;
  const allowed=["atmosfera","karavan","retroville"];
  const keys=requested==="all"?activeCinemas():[requested];
  if(!keys.length||keys.some(key=>!allowed.includes(key))) return res.status(400).json({error:"Unknown cinema or no enabled cinemas."});
  const ids=queue.enqueue(keys,"manual");
  if(!ids.length) return res.status(409).json({error:"No enabled cinemas with spreadsheet IDs were queued."});
  res.status(202).json({ok:true,jobIds:ids,status:queue.snapshot()});
});
app.get("/admin/jobs",requireAdmin,(_req,res)=>res.json({ok:true,...queue.snapshot()}));
app.get("/schedules/:cinema",(req,res)=>{
  const cinema=req.params.cinema;
  if(!["atmosfera","karavan","retroville"].includes(cinema)) return res.status(404).json({error:"Unknown cinema"});
  res.set("Cache-Control","no-store");
  res.json({ok:true,cinema,sessions:queue.getSchedule(cinema)});
});
app.use((err,_req,res,_next)=>{
  console.error("[http] Unhandled request error:",err);
  res.status(500).json({error:"Internal server error"});
});

cron.schedule("0 0 * * 2",()=>{
  const cfg=queue.getConfig();
  if(cfg.parser.enabled) {
    const ids=queue.enqueue(activeCinemas(),"scheduled");
    console.log("[scheduler] Tuesday 00:00 Europe/Kyiv run queued:",ids.length);
  }
},{timezone:"Europe/Kyiv"});

app.listen(port,"0.0.0.0",async()=>{
  console.log(`MultiStaff Multiplex Parser API listening on port ${port}`);
  await restoreConfig();
});
