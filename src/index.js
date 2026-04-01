import { createServer } from "http";

  const PORT = process.env.PORT || 3000;

  const server = createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log("Health server listening on port " + PORT);
    startBots();
  });

  async function startBots() {
    try {
      const { bot } = await import("./bot.js");
      const { controlBot } = await import("./control.js");
      bot.start({ onStart: () => console.log("Main bot started") }).catch(e => console.error("Main bot error:", e));
      controlBot.start({ onStart: () => console.log("Control bot started") }).catch(e => console.error("Control bot error:", e));
    } catch (err) {
      console.error("Failed to start bots:", err.message);
    }
  }