import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import adminRouter from './routes/admin';
import authRouter from './routes/auth';
import cajaRouter from './routes/caja';

dotenv.config();

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('tiny'));

app.get('/', (_req, res) => {
  res.send('API funcionando 🚀');
});

// rutas API
app.use('/api/admin', adminRouter);
app.use('/api', authRouter);
app.use('/api/caja', cajaRouter);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server on http://localhost:${PORT}`);
});