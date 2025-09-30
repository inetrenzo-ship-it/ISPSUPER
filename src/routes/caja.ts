import { Router } from 'express';
import dayjs from 'dayjs';
import { prisma } from '../config/prisma';

const router = Router();

// Registrar venta
router.post('/ventas', async (req, res) => {
  const { dni, amount, ticketNumber, commerceId, cashierId } = req.body;
  const client = await prisma.client.findUnique({ where: { dni } });
  if (!client || !client.enabled) return res.status(400).json({ error: 'Cliente no habilitado' });

  const commerce = await prisma.commerce.findUnique({ where: { id: commerceId } });
  if (!commerce) return res.status(400).json({ error: 'Comercio inválido' });

  // anti-duplicado por día
  const start = dayjs().startOf('day').toDate();
  const end   = dayjs().endOf('day').toDate();
  const dup = await prisma.sale.findFirst({
    where: { commerceId, ticketNumber, date: { gte: start, lte: end } }
  });
  if (dup) return res.status(409).json({ error: 'Ticket duplicado para hoy' });

  const benefitPercent = commerce.benefitPercent;
  const benefitAmount = Number(amount) * benefitPercent;

  const sale = await prisma.sale.create({
    data: {
      commerceId, cashierId, clientId: client.id,
      amount: Number(amount), ticketNumber,
      benefitPercent, benefitAmount
    }
  });
  res.json({ sale, benefitAmount });
});

// Listar ventas (por rango)
router.get('/ventas', async (req, res) => {
  const { commerceId, startDate, endDate } = req.query as any;
  const start = startDate ? new Date(String(startDate)) : dayjs().startOf('week').toDate();
  const end   = endDate   ? new Date(String(endDate))   : dayjs().endOf('week').toDate();
  const sales = await prisma.sale.findMany({
    where: { commerceId, date: { gte: start, lte: end } }
  });
  const totalAmount = sales.reduce((a, s) => a + s.amount, 0);
  const totalBenefit = sales.reduce((a, s) => a + s.benefitAmount, 0);
  res.json({ sales, totalAmount, totalBenefit });
});

export default router;
