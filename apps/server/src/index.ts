import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { execSync } from 'child_process';
import path from 'path';
import { initRoutes } from '@/routes';
import { getServerPaths, loadSecureEnv } from '@repo/shared/node';
import { setupSocket } from '@/socket';

const { PROJECT_ROOT } = getServerPaths(__dirname);
loadSecureEnv(PROJECT_ROOT);

// 生产环境：loadSecureEnv 已注入 DATABASE_URL，此时同步执行迁移确保表结构就绪
if (process.env.NODE_ENV === 'production') {
  try {
    const schemaPath = path.resolve(__dirname, 'schema.prisma');
    console.log('[DB] 正在执行数据库迁移...');
    execSync(`prisma migrate deploy --schema="${schemaPath}"`, {
      stdio: 'inherit', // 将迁移日志输出到 docker logs
      env: process.env,
    });
    console.log('[DB] ✅ 数据库迁移完成');
  } catch (err) {
    console.error('[DB] ❌ 数据库迁移失败，服务终止:', err);
    process.exit(1);
  }
}

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
