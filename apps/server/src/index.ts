import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { initRoutes } from '@/routes';
import { getServerPaths, loadSecureEnv } from '@repo/shared/node';
import { setupSocket } from '@/socket';

const { PROJECT_ROOT } = getServerPaths(__dirname);
loadSecureEnv(PROJECT_ROOT);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

initRoutes(app);

const httpServer = createServer(app);
setupSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚀 服务已启动: http://localhost:${PORT}`);
});
