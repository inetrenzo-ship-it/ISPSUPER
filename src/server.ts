import express from 'express';
import { initWhatsApp } from './services/whatsapp';
import whatsappRouter from './routes/whatsapp';

const app = express();
app.use(express.json());

app.get('/', (_req, res) => res.send('ISPSUPER API OK'));
app.get('/api/ping', (_req, res) => res.json({ ok: true }));

app.use('/api/whatsapp', whatsappRouter);

const PORT = Number(process.env.PORT ?? 8080);

app.listen(PORT, async () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log('Iniciando WhatsApp...');
  try {
    await initWhatsApp();
  } catch (err) {
    console.error('Error iniciando WhatsApp:', err);
  }
});
