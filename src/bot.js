import { Bot, InputFile } from "grammy";
  import OpenAI from "openai";
  import { addToHistory, getHistory, resetChat, updateChatMeta, systemPrompt, conversationHistory } from "./shared-state.js";

  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not set");
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY not set");

  export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

  const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const imageClient = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

  const IMAGE_KEYWORDS = [
    /\b(generate|create|draw|make|produce|show|render|paint|design|sketch)\b.{0,30}\b(image|photo|picture|illustration|artwork|art|drawing|painting|portrait|scene|visual)\b/i,
    /^\/(imagine|draw|image)\s+/i,
  ];

  function isImageRequest(text) {
    return IMAGE_KEYWORDS.some(p => p.test(text));
  }

  function extractImagePrompt(text) {
    return text.replace(/^\/(imagine|draw|image)\s+/i, "").trim();
  }

  bot.command("start", async (ctx) => {
    const name = ctx.from?.first_name ?? "there";
    resetChat(ctx.chat.id);
    updateChatMeta(ctx.chat.id, { title: ctx.from?.first_name ?? String(ctx.chat.id), username: ctx.from?.username, lastSeen: new Date() });
    await ctx.reply(`Hey ${name}! 👋 I'm here to chat and help out. Ask me anything!`);
  });

  bot.command("reset", async (ctx) => {
    resetChat(ctx.chat.id);
    await ctx.reply("Fresh start! What's on your mind?");
  });

  bot.command("imagine", async (ctx) => {
    if (!ctx.match?.trim()) { await ctx.reply("Tell me what to draw! /imagine a snowy mountain"); return; }
    await handleImage(ctx, ctx.match.trim());
  });

  bot.command("draw", async (ctx) => {
    if (!ctx.match?.trim()) { await ctx.reply("Tell me what to draw! /draw a futuristic city"); return; }
    await handleImage(ctx, ctx.match.trim());
  });

  export async function handleImage(ctx, prompt) {
    if (!imageClient) {
      await ctx.reply("Image generation requires an OpenAI API key. Contact the bot admin to enable it.");
      return;
    }
    const msg = await ctx.reply("Generating your image... 🎨");
    try {
      const response = await imageClient.images.generate({ model: "dall-e-3", prompt, n: 1, size: "1024x1024", response_format: "b64_json" });
      const b64 = response.data[0].b64_json;
      const buffer = Buffer.from(b64, "base64");
      await ctx.replyWithPhoto(new InputFile(buffer, "image.png"), { caption: "Here you go! 🖼️" });
    } catch (err) {
      console.error("Image error:", err);
      await ctx.reply("Couldn't generate that image. Try a different description?");
    } finally {
      try { await ctx.api.deleteMessage(ctx.chat.id, msg.message_id); } catch {}
    }
  }

  bot.on("message:text", async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text;
    updateChatMeta(chatId, { title: ctx.from?.first_name ?? String(chatId), username: ctx.from?.username, lastSeen: new Date() });

    if (isImageRequest(text)) {
      addToHistory(chatId, "user", text);
      addToHistory(chatId, "assistant", "Sure! Let me create that image.");
      await handleImage(ctx, extractImagePrompt(text));
      return;
    }

    await ctx.replyWithChatAction("typing");
    addToHistory(chatId, "user", text);

    try {
      const resp = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }, ...getHistory(chatId)],
        max_tokens: 1024,
      });
      const reply = resp.choices[0]?.message?.content ?? "I'm not sure what to say!";
      addToHistory(chatId, "assistant", reply);
      await ctx.reply(reply);
    } catch (err) {
      console.error("Chat error:", err);
      await ctx.reply("Sorry, had a brain blip. Try again?");
    }
  });

  bot.catch((err) => console.error("Bot error:", err.error));