import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/dev/seed-admin?email=...&password=...
 * Crea o actualiza un usuario ADMIN con el email y password enviados.
 * (Usa el modelo `usuario` que ya estás usando en server.ts)
 */
router.get('/seed-admin', async (req, res) => {
  try {
    const email = String(req.query.email || 'admin@demo.com').toLowerCase();
    const password = String(req.query.password || 'Admin123!');
    const hash = await bcrypt.hash(password, 10);

    const admin = await prisma.usuario.upsert({
      where: { email },
      update: { passwordHash: hash, role: 'ADMIN' as any },
      create: { email, passwordHash: hash, role: 'ADMIN' as any },
    });

    res.json({
      ok: true,
      admin: { id: admin.id, email: admin.email, role: admin.role },
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message || 'seed failed' });
  }
});

export default router;
