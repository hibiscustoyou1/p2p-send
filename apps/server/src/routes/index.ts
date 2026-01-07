import { Router, Express } from 'express';

import { helloRouter } from './hello.routes';

const routes = Router();

routes.use('/api', helloRouter);

export const initRoutes = (app: Express) => {
  app.use(routes);
  app.all(/^\/api\/.*$/, (req, res) => {
    console.warn(`⚠️ API 404: ${req.path}`);
    res.status(404).json({ success: false, error: '未找到API端点' });
  });
};
