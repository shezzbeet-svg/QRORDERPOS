import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import menuRoutes from './routes/menu';
import sessionRoutes from './routes/sessions';
import authRoutes from './routes/auth';
import { init as initWs } from './ws';
import qrRoutes from './routes/qr';

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

app.use('/api/menu', menuRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/auth', authRoutes);
app.use('/admin', qrRoutes);

const httpServer = createServer(app);
initWs(httpServer);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
