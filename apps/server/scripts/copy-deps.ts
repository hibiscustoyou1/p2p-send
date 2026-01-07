import fs from 'fs';
import path from 'path';
import { getServerPaths } from "@repo/shared/node";

const { PROJECT_ROOT } = getServerPaths(__dirname);

// 定义路径
const distDir: string = path.resolve(__dirname, '../dist');
const prismaSchema: string = path.resolve(__dirname, '../prisma/schema.prisma');

/**
 * 确保目录存在
 */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 复制文件
 */
function copyFile(src: string, dest: string): void {
  fs.copyFileSync(src, dest);
  const fileName = path.basename(src);
  console.log(`   -> Copied ${fileName}`);
}

/**
 * 查找 Prisma 客户端目录
 * 支持模糊匹配不同版本的 @prisma/client
 */
function findPrismaClientDir(): string | null {
  const nodeModulesDir = path.join(PROJECT_ROOT, 'node_modules');
  
  if (!fs.existsSync(nodeModulesDir)) {
    console.error('⚠️ node_modules 目录不存在!');
    return null;
  }
  
  // 查找 .pnpm 目录
  const pnpmDir = path.join(nodeModulesDir, '.pnpm');
  if (!fs.existsSync(pnpmDir)) {
    console.error('⚠️ .pnpm 目录不存在!');
    return null;
  }
  
  // 读取 .pnpm 目录内容并查找匹配 @prisma+client 的目录
  const dirs = fs.readdirSync(pnpmDir);
  
  // 匹配 @prisma+client@X.X.X_prisma@X.X.X 格式的目录
  const prismaClientDir = dirs.find(dir => {
    return /^@prisma\+client@.*_prisma@.*$/.test(dir);
  });
  
  if (prismaClientDir) {
    const prismaClientPath = path.join(pnpmDir, prismaClientDir, 'node_modules', '.prisma', 'client');
    if (fs.existsSync(prismaClientPath)) {
      return prismaClientPath;
    }
  }
  
  // 如果没有找到，尝试更广泛的匹配
  for (const dir of dirs) {
    if (dir.startsWith('@prisma+client@')) {
      const potentialPath = path.join(pnpmDir, dir, 'node_modules', '.prisma', 'client');
      if (fs.existsSync(potentialPath)) {
        return potentialPath;
      }
    }
  }
  
  console.error('⚠️ 未找到 .prisma/client 目录!');
  return null;
}

function main() {
  console.log('📦 开始复制依赖...');
  
  ensureDir(distDir);
  
  if (fs.existsSync(prismaSchema)) {
    console.log('📄 复制 schema.prisma...');
    copyFile(prismaSchema, path.join(distDir, 'schema.prisma'));
  } else {
    console.warn('⚠️  schema.prisma 未找到!');
  }
  
  try {
    
    // 使用 glob 模式查找 Prisma 客户端目录
    let prismaClientDir = findPrismaClientDir();
    
    if (!prismaClientDir) {
      throw new Error(`未找到 .prisma/client 目录.`);
    }
    
    console.log(`🔍 Prisma Client 目录路径: ${prismaClientDir}`);
    
    const files = fs.readdirSync(prismaClientDir);

    const engineFiles = files.filter(f =>
      f.startsWith('libquery_engine') && f.endsWith('.node')
    );
    
    if (engineFiles.length === 0) {
      console.warn('⚠️ 目标目录中找不到引擎文件.');
    }
    
    engineFiles.forEach(file => {
      copyFile(
        path.join(prismaClientDir, file),
        path.join(distDir, file)
      );
    });
    
    console.log('✅ 依赖复制成功!');
    
  } catch (error) {
    console.error('❌ Prisma Client 错误定位:', error);
    console.error('💡 Hint: Run "pnpm prisma:gen" first.');
    process.exit(1);
  }
}

main()
