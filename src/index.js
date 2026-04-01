import { createServer } from "http";

  const PORT = process.env.PORT || 3000;

  const server = createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  server.listen(PORT, "0.0.0.0", async () => {
    console.log(`✅ Health server ready on port ${PORT}`);

    try {
      const { bot } = await import("./bot.js");
      const { controlBot } = await import("./control.js");
      bot.start({ onStart: () => console.log("✅ Main bot started") }).catch(console.error);
      controlBot.start({ onStart: () => console.log("✅ Control bot started") }).catch(console.error);
    } catch (err) {
      console.error("❌ Bot startup error:", err);
      process.exit(1);
    }
  });