import express from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import devRoutes from './routes/dev';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Salud
app.get('/api/ping', (_req, res) => {
  res.json({ ok: true, msg: 'api funcionando' });
});

app.get('/api/test-db', async (_req, res) => {
  try {
    const users = await prisma.usuario.findMany();
    res.json({ ok: true, count: users.length });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
app.use('/api/dev', devRoutes);

app.get('/', (_req, res) => {
  res.send('API OK');
});

const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
