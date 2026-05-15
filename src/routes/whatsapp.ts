import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../config/prisma';
import { getConnectionStatus, sendMessage } from '../services/whatsapp';
import { askAboutMessages, summarizeChat, clearConversationHistory } from '../services/claude';

const router = Router();

// GET /api/whatsapp/status
// Returns connection state. If pending QR, returns a base64 PNG image.
router.get('/status', async (_req: Request, res: Response) => {
  const { status, qr } = getConnectionStatus();
  let qrImage: string | null = null;
  if (qr) {
    qrImage = await QRCode.toDataURL(qr);
  }
  res.json({ status, qrImage });
});

// GET /api/whatsapp/chats
// Lists all known chats with message count and current mode.
router.get('/chats', async (_req: Request, res: Response) => {
  const chats = await prisma.whatsAppChat.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { messages: true } },
      messages: {
        orderBy: { timestamp: 'desc' },
        take: 1,
        select: { body: true, fromMe: true, timestamp: true },
      },
    },
  });
  res.json(chats);
});

// GET /api/whatsapp/messages/:chatId
// Returns the last 100 messages for a chat.
router.get('/messages/:chatId', async (req: Request, res: Response) => {
  const messages = await prisma.whatsAppMessage.findMany({
    where: { chatId: req.params.chatId },
    orderBy: { timestamp: 'asc' },
    take: 100,
  });
  res.json(messages);
});

// POST /api/whatsapp/send   { jid, message }
// Sends a message manually and stores it.
router.post('/send', async (req: Request, res: Response) => {
  const { jid, message } = req.body as { jid: string; message: string };
  if (!jid || !message) return res.status(400).json({ error: 'jid y message son requeridos' });

  await sendMessage(jid, message);

  const chat = await prisma.whatsAppChat.findUnique({ where: { jid } });
  if (chat) {
    await prisma.whatsAppMessage.create({
      data: { chatId: chat.id, fromMe: true, body: message },
    });
  }
  res.json({ ok: true });
});

// POST /api/whatsapp/pause/:chatId
// Puts a chat in MANUAL mode — Claude stops auto-replying.
router.post('/pause/:chatId', async (req: Request, res: Response) => {
  const chat = await prisma.whatsAppChat.update({
    where: { id: req.params.chatId },
    data: { mode: 'MANUAL' },
  });
  res.json({ ok: true, chatId: chat.id, mode: chat.mode });
});

// POST /api/whatsapp/resume/:chatId
// Puts a chat back in AUTO mode — Claude resumes auto-replying.
router.post('/resume/:chatId', async (req: Request, res: Response) => {
  const chat = await prisma.whatsAppChat.update({
    where: { id: req.params.chatId },
    data: { mode: 'AUTO' },
  });
  clearConversationHistory(chat.jid);
  res.json({ ok: true, chatId: chat.id, mode: chat.mode });
});

// POST /api/whatsapp/ask   { question, chatId? }
// Ask Claude anything about the stored WhatsApp messages.
router.post('/ask', async (req: Request, res: Response) => {
  const { question, chatId } = req.body as { question: string; chatId?: string };
  if (!question) return res.status(400).json({ error: 'question es requerido' });

  const answer = await askAboutMessages(question, chatId);
  res.json({ answer });
});

// GET /api/whatsapp/summary/:chatId
// Returns a Claude-generated summary of the conversation.
router.get('/summary/:chatId', async (req: Request, res: Response) => {
  const summary = await summarizeChat(req.params.chatId);
  res.json({ summary });
});

export default router;
