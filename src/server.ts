import express from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// 1) Ping (ya lo tenés, pero lo dejamos)
app.get('/api/ping', (_req, res) => {
  res.json({ ok: true, msg: 'api funcionando' });
});

// 2) Test DB: intenta leer usuarios
app.get('/api/test-db', async (_req, res) => {
  try {
    const users = await prisma.usuario.findMany().catch(() => null);
    const clients = await prisma.cliente.findMany().catch(() => null);
    res.json({
      ok: true,
      hasUsuarioTable: Array.isArray(users),
      hasClienteTable: Array.isArray(clients),
      usersCount: Array.isArray(users) ? users.length : 'no-table',
      clientsCount: Array.isArray(clients) ? clients.length : 'no-table'
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// 3) Seed admin (UNA SOLA VEZ): crea un admin si no existe
//    USO: GET /api/dev/seed-admin?email=admin@demo.com&password=Admin123!
app.get('/api/dev/seed-admin', async (req, res) => {
  try {
    const email = String(req.query.email || '').trim();
    const password = String(req.query.password || '').trim();
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Falta email o password en la query' });
    }

    // ¿ya existe?
    const existing = await prisma.usuario.findUnique({ where: { email } });
    if (existing) {
      return res.json({ ok: true, msg: 'Admin ya existía', email });
    }

    const hash_password = await bcrypt.hash(password, 10);
    const user = await prisma.usuario.create({
      data: {
        rol: 'ADMIN',
        email,
        hash_password,
        activo: true
      }
    });

    res.json({ ok: true, msg: 'Admin creado', userId: user.usuario_id, email });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Servidor escuchando en puerto', PORT);
});
