import express from 'express';
import dotenv from 'dotenv';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Salud
app.get('/api/ping', (_req, res) => {
  res.json({ ok: true, msg: 'api funcionando' });
});

// Test DB (ajusta al nombre real de tu modelo de usuarios)
// Si tu modelo en prisma/schema.prisma es `User { ... }`, usá prisma.user
// Si tu modelo es `Usuario { ... }`, usá prisma.usuario
app.get('/api/test-db', async (_req, res) => {
  try {
    const users = await prisma.user.findMany(); // <-- CAMBIAR a prisma.usuario si tu modelo se llama Usuario
    res.json({ ok: true, count: users.length });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * SEED ADMIN (EN LINEA, SIN ROUTER APARTE)
 * GET /api/dev/seed-admin?email=...&password=...
 *
 * IMPORTANTE:
 * - Si tu modelo en schema.prisma es `User`, los campos suelen ser: id, email, passwordHash, role, createdAt...
 * - Si tu modelo es `Usuario`, ajustá los nombres como los tengas (por ej: usuario_id, hash_password, rol).
 */
app.get('/api/dev/seed-admin', async (req, res) => {
  try {
    const email = String(req.query.email || 'admin@demo.com').toLowerCase();
    const password = String(req.query.password || 'Admin123!');

    const passwordHash = await bcrypt.hash(password, 10);

    // Si tu modelo es `User`, dejá esto como prisma.user y Role.ADMIN.
    // Si tu modelo es `Usuario`, cambiá a prisma.usuario y el enum/strings que uses (p.ej. 'ADMIN').
    const admin = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, role: Role.ADMIN },
      create: { email, passwordHash, role: Role.ADMIN },
    });

    res.json({ ok: true, adminId: (admin as any).id, email: (admin as any).email });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message || 'seed failed' });
  }
});

// raíz
app.get('/', (_req, res) => {
  res.send('API OK');
});

const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
