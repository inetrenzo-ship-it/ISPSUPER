import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { signToken } from '../config/jwt';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });
  const token = signToken({ uid: user.id, role: user.role, commerceId: user.commerceId });
  res.json({ token });
});

export default router;
