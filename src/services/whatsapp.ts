import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  WASocket,
  proto,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import path from 'path';
import { prisma } from '../config/prisma';
import { generateAutoReply } from './claude';

let sock: WASocket | null = null;
let qrCode: string | null = null;
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
let connectionStatus: ConnectionStatus = 'disconnected';

export function getConnectionStatus() {
  return { status: connectionStatus, qr: qrCode };
}

export async function sendMessage(jid: string, text: string): Promise<void> {
  if (!sock) throw new Error('WhatsApp no está conectado');
  await sock.sendMessage(jid, { text });
}

function extractMessageText(msg: proto.IWebMessageInfo): string {
  return (
    msg.message?.conversation ??
    msg.message?.extendedTextMessage?.text ??
    msg.message?.imageMessage?.caption ??
    msg.message?.videoMessage?.caption ??
    ''
  );
}

async function handleIncomingMessage(msg: proto.IWebMessageInfo): Promise<void> {
  const jid = msg.key.remoteJid;
  if (!jid || jid.endsWith('@broadcast') || jid.endsWith('@g.us')) return;

  const body = extractMessageText(msg).trim();
  if (!body) return;

  // Upsert chat record
  const chat = await prisma.whatsAppChat.upsert({
    where: { jid },
    update: { name: (msg as any).pushName ?? undefined, updatedAt: new Date() },
    create: { jid, name: (msg as any).pushName ?? null },
  });

  // Store incoming message
  await prisma.whatsAppMessage.create({
    data: { chatId: chat.id, fromMe: false, body },
  });

  if (chat.mode === 'AUTO') {
    try {
      const reply = await generateAutoReply(jid, body);
      await sendMessage(jid, reply);
      await prisma.whatsAppMessage.create({
        data: { chatId: chat.id, fromMe: true, body: reply },
      });
    } catch (err) {
      console.error('[WhatsApp] Auto-reply error:', err);
    }
  }
}

export async function initWhatsApp(): Promise<void> {
  const authDir = path.join(process.cwd(), 'auth_info_baileys');
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const logger = pino({ level: 'silent' });

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCode = qr;
      connectionStatus = 'connecting';
      console.log('[WhatsApp] Escanea el código QR con tu celular (también disponible en GET /api/whatsapp/status)');
    }

    if (connection === 'close') {
      connectionStatus = 'disconnected';
      qrCode = null;
      const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        console.log('[WhatsApp] Reconectando...');
        await initWhatsApp();
      } else {
        console.log('[WhatsApp] Sesión cerrada. Volvé a conectar escaneando el QR.');
      }
    } else if (connection === 'open') {
      qrCode = null;
      connectionStatus = 'connected';
      console.log('[WhatsApp] ¡Conectado!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.key.fromMe) {
        await handleIncomingMessage(msg);
      }
    }
  });
}
