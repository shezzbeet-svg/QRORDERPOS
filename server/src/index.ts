import { createServer } from 'http';
import { app } from './app.js';
import { init as initWs } from './ws.js';

const PORT = Number(process.env.PORT || 4000);

export const httpServer = createServer(app);
initWs(httpServer);

if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}
