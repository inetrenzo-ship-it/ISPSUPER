// src/routes/dev.ts
import { Router } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

// GET /api/dev/seed-admin?email=...&password=...
router.get('/seed-admin', async (req, res) => {
  const email = (req.query.email as string) || '';
  const password = (req.query.password as string) || '';

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Falta email o password' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, role: Role.ADMIN },
      create: { email, passwordHash, role: Role.ADMIN },
    });

    return res.json({ ok: true, adminId: admin.id, email: admin.email });
  } catch (err: any) {
    console.error('seed-admin error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Error interno' });
  }
});

export default router;
