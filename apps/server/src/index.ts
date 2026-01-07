import express from 'express';
import cors from 'cors';
import path from 'path';
import { initRoutes } from '@/routes';
import { getServerPaths, loadSecureEnv } from '@repo/shared/node';

const { PROJECT_ROOT, CLIENT_DIST_PATH } = getServerPaths(__dirname);
loadSecureEnv(PROJECT_ROOT);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

initRoutes(app)

app.listen(PORT, () => {
  console.log(`🚀 服务已启动: http://localhost:${PORT}`);
});
