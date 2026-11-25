const express = require("express");
const helmet = require("helmet");

const app = express();
const port = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "256kb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "multistaff-multiplex-parser",
    timestamp: new Date().toISOString()
  });
});

app.get("/", (_req, res) => {
  res.status(200).json({
    service: "MultiStaff Multiplex Parser API",
    health: "/health"
  });
});

app.use((err, _req, res, _next) => {
  console.error("[http] Unhandled request error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`MultiStaff Multiplex Parser API listening on port ${port}`);
});
