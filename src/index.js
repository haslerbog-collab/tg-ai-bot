import { createServer } from "http";
  import { bot } from "./bot.js";
  import { controlBot } from "./control.js";

  const PORT = process.env.PORT || 3000;

  createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  }).listen(PORT, "0.0.0.0", () => console.log(`Health server on port ${PORT}`));

  bot.start({ onStart: () => console.log("✅ Main bot started") }).catch(console.error);
  controlBot.start({ onStart: () => console.log("✅ Control bot started") }).catch(console.error);