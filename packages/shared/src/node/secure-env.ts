import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

/**
 * 加载安全环境变量
 * 1. 优先加载 .env (开发模式)
 * 2. 否则解密 .env.enc (生产/构建模式)
 */
export function loadSecureEnv(projectRoot: string) {
  const envPath = path.resolve(projectRoot, '.env');
  if (fs.existsSync(envPath)) {
    console.log('[Config] 加载本地配置: .env');
    dotenv.config({ path: envPath });
    return;
  }
  
  const encPath = path.resolve(projectRoot, '.env.enc');
  if (!fs.existsSync(encPath)) {
    console.warn('[Config] ⚠️ 未找到 .env 或 .env.enc');
    return;
  }
  
  const password = process.env.VAULT_PASS;
  if (!password) {
    // 在构建或运行时，如果没有密码且只有加密文件，必须报错或警告
    console.error('[Config] ❌ 发现 .env.enc 但未设置 VAULT_PASS');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return;
  }
  
  try {
    const fileContent = fs.readFileSync(encPath, 'utf8');
    const [saltHex, ivHex, authTagHex, encryptedContent] = fileContent.split(':');
    
    if (!encryptedContent) throw new Error('文件格式错误');
    
    const key = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    
    let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    const envConfig = dotenv.parse(decrypted);
    for (const k in envConfig) {
      if (!process.env[k]) {
        process.env[k] = envConfig[k];
      }
    }
    console.log('[Config] ✅ 安全配置已加载 (内存解密)');
  } catch (e) {
    console.error('[Config] ❌ 解密失败: 密码错误或文件损坏');
    process.exit(1);
  }
}
