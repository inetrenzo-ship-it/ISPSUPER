import { Router } from 'express';
import { prisma } from '../config/prisma';

const router = Router();

// List commerces
router.get('/commerces', async (_req, res) => {
  const data = await prisma.commerce.findMany();
  res.json(data);
});

// Create commerce
router.post('/commerces', async (req, res) => {
  const { name, cuit, locality, benefitPercent } = req.body;
  const created = await prisma.commerce.create({
    data: { name, cuit, locality, benefitPercent: Number(benefitPercent || 0.1) }
  });
  res.json(created);
});

// List clients (basic filters)
router.get('/clients', async (req, res) => {
  const { dni, name } = req.query as { dni?: string; name?: string };
  const data = await prisma.client.findMany({
    where: {
      AND: [
        dni ? { dni } : {},
        name ? { OR: [{ firstName: { contains: name, mode: 'insensitive' } }, { lastName: { contains: name, mode: 'insensitive' } }] } : {}
      ]
    }
  });
  res.json(data);
});

// Bulk import clients
router.post('/clients/import', async (req, res) => {
  const arr = Array.isArray(req.body) ? req.body : [];
  await prisma.client.createMany({ data: arr, skipDuplicates: true });
  res.json({ ok: true, inserted: arr.length });
});

export default router;
