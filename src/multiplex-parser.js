const SESSION_URL_RE = /(?:https?:)?\/\/new\.multiplex\.ua\/order\/cinema\/[^"'\\s<>]+\/session\/(?<id>\d+)/gi;
const PROTECTION_MARKERS = ["cloudflare", "captcha", "access denied", "too many requests", "temporarily blocked", "checking your browser", "verify you are human"];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function cleanText(value) {
  return decodeHtml(String(value || "").replace(/<.*?>/gs, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim());
}
function decodeHtml(value) {
  return value.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
}
function protectionPage(html) { const s=String(html||"").toLowerCase(); return !s || PROTECTION_MARKERS.some(x=>s.includes(x)); }
function sessionUrls(html) {
  const seen=new Set(), urls=[];
  for (const m of String(html||"").matchAll(SESSION_URL_RE)) {
    if (!seen.has(m.groups.id)) { seen.add(m.groups.id); urls.push("https://new.multiplex.ua"+m[0].replace(/^https?:/,"").replace(/^\/\//,"/")); }
  }
  return urls;
}
function extractMovie(html) {
  let m=html.match(/<div\s+class=["'][^"']*movie-name\s+mobile-hidden[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if (!m) m=html.match(/<div\s+class=["'][^"']*movie-name\s+destop-hidden[^"']*["'][^>]*>([\s\S]*?)<div\s+class=["']timer/i);
  return m ? cleanText(m[1]) : "";
}
function extractHall(html) {
  const m=html.match(/<span\s+class=["']text-dscr["']>\s*Зал\s*№?\s*(\d+)\s*<\/span>/i);
  return m ? "Зала "+m[1].trim() : "";
}
function extractDate(html) {
  const show=html.match(/<div[^>]+class=["'][^"']*showtime-info[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
  const idx=html.toLowerCase().indexOf("showtime-info__time");
  const block=show?.[1] || (idx>=0 ? html.slice(Math.max(0,idx-2500),idx+2500) : "");
  let m=block.match(/(?<!\d)(\d{2}\.\d{2}\.\d{4})(?!\d)/);
  if (!m) {
    const hall=html.search(/Зал\s*№?\s*\d+/i);
    if(hall>=0) m=html.slice(Math.max(0,hall-2000),hall+2000).match(/(?<!\d)(\d{2}\.\d{2}\.\d{4})(?!\d)/);
  }
  if (!m) m=html.match(/(?<!\d)(\d{2}\.\d{2}\.\d{4})(?!\d)/);
  if (!m) return "";
  const [d,mo,y]=m[1].split(".");
  const date=new Date(Date.UTC(Number(y),Number(mo)-1,Number(d)));
  return date.getUTCFullYear()===Number(y)&&date.getUTCMonth()===Number(mo)-1&&date.getUTCDate()===Number(d) ? `${y}-${mo}-${d}` : "";
}
function extractTimes(html) {
  let m=html.match(/<div\s+class=["']showtime-info__time["'][^>]*>[\s\S]*?<span\s+class=["']text["']>\s*([0-2]\d:[0-5]\d)\s*-\s*([0-2]\d:[0-5]\d)\s*<\/span>/i);
  if (!m) {
    const show=html.match(/<div[^>]+class=["'][^"']*showtime-info[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
    m=(show?.[1]||"").match(/([0-2]\d:[0-5]\d)\s*-\s*([0-2]\d:[0-5]\d)/);
  }
  return m ? [m[1],m[2]] : [];
}
function parseSession(html) {
  const movie=extractMovie(html), hall=extractHall(html), date=extractDate(html), times=extractTimes(html);
  if(!movie||!hall||!date||times.length!==2) return null;
  return { date, movie, hall, startTime:times[0], endTime:times[1] };
}
async function getHtml(url, retries, timeoutMs) {
  let last;
  for(let attempt=0;attempt<=retries;attempt++) {
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try {
      const response=await fetch(url,{signal:controller.signal,headers:{
        "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
        "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language":"uk-UA,uk;q=0.9,ru;q=0.8"
      }});
      const body=await response.text();
      if(response.status===403||response.status===429) throw Object.assign(new Error("Multiplex повернув HTTP "+response.status+"; збір зупинено"),{restricted:true});
      if(!response.ok) throw new Error("HTTP "+response.status+" для "+url);
      if(protectionPage(body)) throw Object.assign(new Error("Виявлено сторінку захисту Multiplex; збір зупинено"),{restricted:true});
      return body;
    } catch(error) {
      last=error;
      if(error.restricted || attempt===retries) throw error;
      await sleep(1500*(attempt+1));
    } finally { clearTimeout(timer); }
  }
  throw last;
}
async function collectCinema(cinemaKey, cinema, parserConfig, onProgress=()=>{}) {
  const start=Date.now(), mainHtml=await getHtml(cinema.cinemaUrl,parserConfig.retryCount,15000);
  const urls=sessionUrls(mainHtml);
  if(!urls.length) throw new Error("На сторінці кінотеатру не знайдено жодного URL сеансу; архів не змінено.");
  const sessions=[], errors=[];
  for(let i=0;i<urls.length;i++) {
    try {
      const html=await getHtml(urls[i],parserConfig.retryCount,15000);
      const session=parseSession(html);
      if(session) sessions.push(session); else errors.push({url:urls[i],reason:"Не вдалося розібрати поля сеансу"});
    } catch(error) {
      if(error.restricted) throw error;
      errors.push({url:urls[i],reason:error.message});
    }
    onProgress({completed:i+1,total:urls.length,parsed:sessions.length,failed:errors.length});
    if(i<urls.length-1) await sleep(parserConfig.requestDelayMs);
  }
  const unique=new Map();
  for(const s of sessions) unique.set([s.date,s.movie.toLowerCase(),s.hall.toLowerCase(),s.startTime,s.endTime].join("|"),s);
  const result=[...unique.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime)||a.hall.localeCompare(b.hall)||a.movie.localeCompare(b.movie));
  const failRatio=errors.length/urls.length;
  if(!result.length || failRatio>0.2) throw Object.assign(new Error(`Неповний результат: знайдено ${result.length} сеансів, помилок ${errors.length}/${urls.length}. Попередні дані збережено.`),{details:{totalUrls:urls.length,parsed:result.length,failed:errors.length}});
  return {cinema:cinemaKey,sessions:result,totalUrls:urls.length,failed:errors.length,durationMs:Date.now()-start};
}
module.exports={collectCinema,sessionUrls,parseSession,protectionPage};
