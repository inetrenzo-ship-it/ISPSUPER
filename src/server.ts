import express from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// RUTA DE SALUD
app.get('/api/ping', (_req, res) => {
  res.json({ ok: true, msg: 'api funcionando' });
});

// RUTA DB TEST (no rompe si no hay tabla todavía)
app.get('/api/test-db', async (_req, res) => {
  try {
    const users = await prisma.user.findMany().catch(() => []);
    res.json({ ok: true, usersCount: users.length });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

// SEED ADMIN
app.get('/api/dev/seed-admin', async (req, res) => {
  try {
    const email = String(req.query.email || 'admin@demo.com').toLowerCase();
    const password = String(req.query.password || 'Admin123!');
    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, role: 'ADMIN' as any },
      create: { email, passwordHash, role: 'ADMIN' as any }
    });

    res.json({ ok: true, adminId: (admin as any).id, email: (admin as any).email });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message || 'seed failed' });
  }
});

// ROOT
app.get('/', (_req, res) => {
  res.send('API OK');
});

// LISTAR RUTAS EN LOG
function listRoutes() {
  const routes: string[] = [];
  // @ts-ignore
  app._router.stack.forEach((m: any) => {
    if (m.route && m.route.path) {
      const methods = Object.keys(m.route.methods)
        .filter(k => m.route.methods[k])
        .map(k => k.toUpperCase())
        .join(',');
      routes.push(`${methods} ${m.route.path}`);
    }
  });
  console.log('Rutas registradas:');
  routes.forEach(r => console.log('  -', r));
}

const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  listRoutes();
});
