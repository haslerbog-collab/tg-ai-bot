export type Role = "system" | "user" | "assistant";

  export interface Message {
    role: Role;
    content: string;
  }

  export interface ChatMeta {
    title: string;
    username?: string;
    lastSeen: Date;
  }

  export const conversationHistory = new Map();
  export const chatMeta = new Map();

  export let systemPrompt = `You are a friendly, clever, and witty AI companion on Telegram. 
  You talk like a real person — naturally, warmly, and with personality. 
  Keep responses concise and conversational (1-4 sentences usually). 
  Use casual language, contractions, and the occasional light humor when appropriate. 
  Be genuinely helpful and engaging. Never be robotic or overly formal.
  If the user wants to see something visual, let them know you can generate images — they just need to ask.`;

  export function setSystemPrompt(newPrompt) { systemPrompt = newPrompt; }

  export function addToHistory(chatId, role, content) {
    if (!conversationHistory.has(chatId)) conversationHistory.set(chatId, []);
    const history = conversationHistory.get(chatId);
    history.push({ role, content });
    if (history.length > 40) history.splice(0, history.length - 40);
  }

  export function getHistory(chatId) { return conversationHistory.get(chatId) ?? []; }
  export function resetChat(chatId) { conversationHistory.delete(chatId); }
  export function resetAll() { conversationHistory.clear(); }

  export function updateChatMeta(chatId, meta) {
    const existing = chatMeta.get(chatId) ?? { title: String(chatId), lastSeen: new Date() };
    chatMeta.set(chatId, { ...existing, ...meta });
  }