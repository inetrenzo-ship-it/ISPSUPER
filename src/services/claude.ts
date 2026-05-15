import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../config/prisma';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BUSINESS_SYSTEM_PROMPT = `Sos el asistente virtual de ISPSUPER, un sistema de gestión para proveedores de internet y comercios asociados.

Ayudás a los clientes y comercios con:
- Consultas sobre planes de internet, precios y coberturas
- Estado de cuenta, saldo y pagos
- Información sobre beneficios y beneficio por comercio
- Consultas técnicas básicas (resetear router, señal, velocidad)
- Consultas sobre el estado de su servicio

Respondé siempre en español, de manera cordial, breve y profesional.
Si no podés resolver algo o la consulta es compleja, avisá que un agente humano se va a comunicar.
Nunca inventes información de precios o datos específicos que no tengas. En ese caso decí que se comuniquen con el equipo.`;

// In-memory conversation history per JID for Claude context
const conversationHistory = new Map<string, Anthropic.MessageParam[]>();

export async function generateAutoReply(jid: string, userMessage: string): Promise<string> {
  const history = conversationHistory.get(jid) ?? [];

  history.push({ role: 'user', content: userMessage });

  const stream = anthropic.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 512,
    system: BUSINESS_SYSTEM_PROMPT,
    messages: history,
  });

  const response = await stream.finalMessage();
  const reply = response.content.find(b => b.type === 'text')?.text ?? 'Lo siento, no pude procesar tu mensaje. Un agente te contactará pronto.';

  history.push({ role: 'assistant', content: reply });

  // Keep last 20 turns to avoid unbounded growth
  if (history.length > 20) history.splice(0, history.length - 20);
  conversationHistory.set(jid, history);

  return reply;
}

export async function askAboutMessages(question: string, chatId?: string): Promise<string> {
  const messages = await prisma.whatsAppMessage.findMany({
    where: chatId ? { chatId } : {},
    orderBy: { timestamp: 'desc' },
    take: 100,
    include: { chat: true },
  });

  if (!messages.length) return 'No hay mensajes para analizar.';

  const context = messages
    .reverse()
    .map(m => `[${m.chat.name ?? m.chat.jid}] ${m.fromMe ? 'Bot' : 'Cliente'}: ${m.body}`)
    .join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    system: 'Sos un asistente que analiza conversaciones de WhatsApp de un negocio de internet (ISP). Respondé en español.',
    messages: [
      {
        role: 'user',
        content: `Conversaciones recientes:\n\n${context}\n\nPregunta: ${question}`,
      },
    ],
  });

  return response.content.find(b => b.type === 'text')?.text ?? '';
}

export async function summarizeChat(chatId: string): Promise<string> {
  const messages = await prisma.whatsAppMessage.findMany({
    where: { chatId },
    orderBy: { timestamp: 'asc' },
    include: { chat: true },
  });

  if (!messages.length) return 'No hay mensajes en este chat.';

  const context = messages
    .map(m => `${m.fromMe ? 'Bot' : 'Cliente'}: ${m.body}`)
    .join('\n');

  const chatName = messages[0].chat.name ?? messages[0].chat.jid;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    system: 'Sos un asistente que resume conversaciones de WhatsApp de negocios. Respondé en español.',
    messages: [
      {
        role: 'user',
        content: `Resume la siguiente conversación con ${chatName} en puntos clave (tema, estado, pendientes):\n\n${context}`,
      },
    ],
  });

  return response.content.find(b => b.type === 'text')?.text ?? '';
}

export function clearConversationHistory(jid: string) {
  conversationHistory.delete(jid);
}
