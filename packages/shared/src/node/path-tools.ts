import path from 'path';
import fs from 'fs';

/**
 * 智能查找项目根目录
 * 兼容两种模式：
 * 1. Production (构建后): 位于 dist/server，根目录应为 dist
 * 2. Development (开发中): 位于 apps/server/src，根目录为 Monorepo 根
 */
export function findProjectRoot(startDir: string): string {
  // --- 策略 1: 生产环境快速匹配 (Dist Mode) ---
  const parentDir = path.resolve(startDir, '..');
  const envInParent = path.join(parentDir, '.env.enc');
  
  if (fs.existsSync(envInParent)) {
    return parentDir;
  }
  
  // --- 策略 2: 开发环境递归查找 (Monorepo Mode) ---
  let currentDir = startDir;
  const systemRoot = path.parse(currentDir).root;
  
  while (currentDir !== systemRoot) {
    if (fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  
  throw new Error('Could not find Server Root (server folder missing)');
}

/**
 * 查找 Client 构建产物路径
 */
export const resolveClientPath = (rootPath: string): string | null => {
  const possibleDist = ['dist/client', 'client']
  for (const dist of possibleDist) {
    const prodClient = path.join(rootPath, dist);
    if (fs.existsSync(prodClient) && fs.existsSync(path.join(prodClient, 'index.html'))) {
      return prodClient;
    }
  }
  return null;
};

/**
 * 获取服务端相关的绝对路径
 * @param serverDirname - 请传入当前执行环境的 __dirname
 */
export const getServerPaths = (serverDirname: string) => {
  const projectRoot = findProjectRoot(serverDirname);
  return {
    PROJECT_ROOT: projectRoot,
    CLIENT_DIST_PATH: resolveClientPath(projectRoot)
  };
};
