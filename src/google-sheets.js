const { google } = require("googleapis");
let sheetsApi;
function getSheets() {
  if(sheetsApi) return sheetsApi;
  const raw=process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if(!raw) throw new Error("Не задано GOOGLE_SERVICE_ACCOUNT_JSON у Northflank.");
  let credentials;
  try { credentials=JSON.parse(raw); } catch { throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON має бути коректним JSON сервісного акаунта."); }
  const auth=new google.auth.GoogleAuth({credentials,scopes:["https://www.googleapis.com/auth/spreadsheets"]});
  sheetsApi=google.sheets({version:"v4",auth});
  return sheetsApi;
}
function weekTabName(sessions) {
  const dates=[...new Set(sessions.map(x=>x.date))].sort();
  const fmt=iso=>{const [y,m,d]=iso.split("-");return `${d}.${m}.${y}`;};
  return dates.length===1?fmt(dates[0]):`${fmt(dates[0])}-${fmt(dates[dates.length-1])}`;
}
async function ensureTab(sheets,spreadsheetId,title,index=0) {
  const meta=await sheets.spreadsheets.get({spreadsheetId});
  const found=(meta.data.sheets||[]).find(s=>s.properties.title===title);
  if(found) return found.properties.sheetId;
  const result=await sheets.spreadsheets.batchUpdate({spreadsheetId,requestBody:{requests:[{addSheet:{properties:{title,index}}}]}});
  return result.data.replies[0].addSheet.properties.sheetId;
}
async function saveConfig(spreadsheetId,config) {
  const sheets=getSheets();
  await ensureTab(sheets,spreadsheetId,"Config",0);
  await sheets.spreadsheets.values.update({spreadsheetId,range:"Config!A1:B2",valueInputOption:"RAW",requestBody:{values:[["key","value"],["multiplexParserConfig",JSON.stringify(config)]]}});
}
async function writeSchedule(spreadsheetId,sessions,meta={}) {
  if(!sessions.length) throw new Error("Порожній розклад не можна записувати.");
  const sheets=getSheets();
  await ensureTab(sheets,spreadsheetId,"Config",0);
  const title=weekTabName(sessions);
  await ensureTab(sheets,spreadsheetId,title,1);
  const values=[["Дата","Фільм","Зал","Початок","Завершення"],...sessions.map(s=>[s.date,s.movie,s.hall,s.startTime,s.endTime])];
  await sheets.spreadsheets.values.clear({spreadsheetId,range:`'${title}'!A:Z`});
  await sheets.spreadsheets.values.update({spreadsheetId,range:`'${title}'!A1`,valueInputOption:"RAW",requestBody:{values}});
  await sheets.spreadsheets.values.update({spreadsheetId,range:"Config!A4:B8",valueInputOption:"RAW",requestBody:{values:[["lastSuccessfulRun",new Date().toISOString()],["lastSessionsCount",String(sessions.length)],["lastCinema",meta.cinema||""],["lastTab",title],["lastFailedPages",String(meta.failed||0)]]}});
  return {tab:title,count:sessions.length};
}
module.exports={saveConfig,writeSchedule};
