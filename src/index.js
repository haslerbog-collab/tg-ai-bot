import { createServer } from "http";
  import { bot } from "./bot.js";
  import { controlBot } from "./control.js";

  const PORT = process.env.PORT || 3000;
  createServer((req, res) => { res.writeHead(200); res.end("Bot is running!"); }).listen(PORT, () => console.log(`Health server on port ${PORT}`));

  bot.start({ onStart: () => console.log("✅ Main bot started") }).catch(console.error);
  controlBot.start({ onStart: () => console.log("✅ Control bot started") }).catch(console.error);