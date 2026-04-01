import { Bot } from "grammy";
  import { conversationHistory, chatMeta, resetAll, resetChat, setSystemPrompt, systemPrompt } from "./shared-state.js";
  import { bot as mainBot } from "./bot.js";

  const TOKEN2 = process.env.TELEGRAM_BOT_TOKEN_2;
  if (!TOKEN2) throw new Error("TELEGRAM_BOT_TOKEN_2 not set");

  export const controlBot = new Bot(TOKEN2);

  const pendingPrompt = new Set();
  const pendingBroadcast = new Set();
  const pendingDirectSend = new Map();

  function formatChats() {
    if (chatMeta.size === 0) return "Активных чатов пока нет.";
    return [...chatMeta.entries()].map(([id, m]) => {
      const ago = Math.round((Date.now() - m.lastSeen.getTime()) / 60000);
      const time = ago < 1 ? "только что" : ago < 60 ? ago + " мин. назад" : Math.round(ago/60) + " ч. назад";
      const msgs = conversationHistory.get(id)?.length || 0;
      return "• " + m.title + (m.username ? " (@" + m.username + ")" : "") + " [" + id + "] — " + msgs + " сообщ. — " + time;
    }).join("\n");
  }

  controlBot.command("start", async (ctx) => {
    await ctx.reply(
      "🎛️ Панель управления основным ботом\n\n" +
      "/stats — статистика\n/chats — список пользователей\n/broadcast — рассылка всем\n" +
      "/setprompt — изменить личность ИИ\n/viewprompt — текущий промт\n" +
      "/resetall — очистить всю историю\n/resetchat — сбросить чат\n/send — написать в чат"
    );
  });

  controlBot.command("stats", async (ctx) => {
    const total = chatMeta.size;
    const msgs = [...conversationHistory.values()].reduce((s, m) => s + m.length, 0);
    const today = [...chatMeta.values()].filter(m => Date.now() - m.lastSeen.getTime() < 86400000).length;
    await ctx.reply("📊 Статистика\n\nВсего чатов: " + total + "\nАктивных сегодня: " + today + "\nСообщений в памяти: " + msgs);
  });

  controlBot.command("chats", async (ctx) => {
    await ctx.reply("💬 Активные чаты\n\n" + formatChats());
  });

  controlBot.command("viewprompt", async (ctx) => {
    await ctx.reply("📝 Текущий промт:\n\n" + systemPrompt);
  });

  controlBot.command("setprompt", async (ctx) => {
    if (ctx.match?.trim()) { setSystemPrompt(ctx.match.trim()); await ctx.reply("✅ Промт обновлён!"); return; }
    pendingPrompt.add(ctx.chat.id);
    await ctx.reply("Отправьте новый системный промт:");
  });

  controlBot.command("broadcast", async (ctx) => {
    if (ctx.match?.trim()) { await doBroadcast(ctx, ctx.match.trim()); return; }
    pendingBroadcast.add(ctx.chat.id);
    await ctx.reply("Отправьте сообщение для рассылки:");
  });

  controlBot.command("resetall", async (ctx) => {
    const n = conversationHistory.size;
    resetAll();
    await ctx.reply("🗑️ История очищена для " + n + " чата(ов).");
  });

  controlBot.command("resetchat", async (ctx) => {
    if (!ctx.match?.trim()) { await ctx.reply("Использование: /resetchat <chatId>\n\n" + formatChats()); return; }
    const id = parseInt(ctx.match.trim());
    if (isNaN(id)) { await ctx.reply("Неверный ID."); return; }
    resetChat(id);
    await ctx.reply("✅ Чат " + id + " сброшен.");
  });

  controlBot.command("send", async (ctx) => {
    if (!ctx.match?.trim()) { await ctx.reply("Использование: /send <chatId> <сообщение>\n\n" + formatChats()); return; }
    const sp = ctx.match.indexOf(" ");
    if (sp === -1) { pendingDirectSend.set(ctx.chat.id, parseInt(ctx.match)); await ctx.reply("Напишите сообщение для чата " + ctx.match + ":"); return; }
    await doSend(ctx, parseInt(ctx.match.substring(0, sp)), ctx.match.substring(sp + 1).trim());
  });

  async function doBroadcast(ctx, text) {
    if (!chatMeta.size) { await ctx.reply("Нет чатов для рассылки."); return; }
    let ok = 0, fail = 0;
    for (const id of chatMeta.keys()) {
      try { await mainBot.api.sendMessage(id, text); ok++; } catch { fail++; }
    }
    await ctx.reply("📢 Рассылка: отправлено " + ok + ", ошибок " + fail + ".");
  }

  async function doSend(ctx, chatId, message) {
    if (isNaN(chatId)) { await ctx.reply("Неверный ID."); return; }
    try { await mainBot.api.sendMessage(chatId, message); await ctx.reply("✅ Отправлено в " + chatId + "."); }
    catch { await ctx.reply("❌ Не удалось отправить в " + chatId + "."); }
  }

  controlBot.on("message:text", async (ctx) => {
    const id = ctx.chat.id;
    const text = ctx.message.text;
    if (pendingPrompt.has(id)) { pendingPrompt.delete(id); setSystemPrompt(text); await ctx.reply("✅ Промт обновлён!"); return; }
    if (pendingBroadcast.has(id)) { pendingBroadcast.delete(id); await doBroadcast(ctx, text); return; }
    if (pendingDirectSend.has(id)) { const t = pendingDirectSend.get(id); pendingDirectSend.delete(id); await doSend(ctx, t, text); return; }
    await ctx.reply("Используйте команды: /stats /chats /broadcast /setprompt /viewprompt /resetall /resetchat /send");
  });

  controlBot.catch((err) => console.error("Control bot error:", err.error));