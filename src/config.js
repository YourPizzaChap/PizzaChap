const DEFAULT_CONFIG = {
  parser: { enabled: true, weekday: "tuesday", startTime: "00:00", endDay: "wednesday", endTime: "08:00", timezone: "Europe/Kyiv", requestDelayMs: 1500, retryCount: 2 },
  cinemas: {
    atmosfera: { enabled: true, spreadsheetId: "1tuCtrz3PaKbch02XLG-10W6Ob4AwdJjpW0PjH5hCOpo", cinemaUrl: "https://multiplex.ua/cinema/kyiv/atmosphera" },
    karavan: { enabled: true, spreadsheetId: "1MW0m-soyVUkz7CKKQ-9PQkSFnwpARIS0zSdpwxPImJ0", cinemaUrl: "https://multiplex.ua/cinema/dnipro/karavandnepr" },
    retroville: { enabled: false, spreadsheetId: "", cinemaUrl: "" }
  }
};
function normalizeConfig(input = {}) {
  const parser = { ...DEFAULT_CONFIG.parser, ...(input.parser || {}) };
  const cinemas = {};
  for (const key of Object.keys(DEFAULT_CONFIG.cinemas)) {
    const incoming = input.cinemas?.[key] || {};
    const fallback = DEFAULT_CONFIG.cinemas[key];
    const spreadsheetId = String(incoming.spreadsheetId || fallback.spreadsheetId || "").trim();
    cinemas[key] = {
      enabled: incoming.enabled === true && Boolean(spreadsheetId),
      spreadsheetId,
      cinemaUrl: fallback.cinemaUrl
    };
  }
  return { parser, cinemas };
}
module.exports = { DEFAULT_CONFIG, normalizeConfig };
