const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const ALGORITHM = 'aes-256-gcm';
const PASSWORD = process.env.VAULT_PASS;

const envPath = path.resolve(process.cwd(), '.env');
const encPath = path.resolve(process.cwd(), '.env.enc');

function checkPasswordOrExit() {
  if (!PASSWORD) {
    console.error('\n❌ 安全错误: 未设置环境变量 VAULT_PASS');
    console.error('👉 请运行: VAULT_PASS=your_password node scripts/vault.js encrypt \n');
    process.exit(1);
  }
  return PASSWORD;
}

function deriveKey(password, salt) {
  return crypto.scryptSync(password, salt, 32);
}

function encrypt() {
  const password = checkPasswordOrExit();

  if (!fs.existsSync(envPath)) {
    console.error(`❌ 错误：未找到源文件 ${envPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf8');

  const salt = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const key = deriveKey(password, salt);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(content, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  const payload = [
    salt.toString('hex'),
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted
  ].join(':');

  fs.writeFileSync(encPath, payload);
  console.log(`🔒 加密成功: .env -> .env.enc`);
}

function decrypt() {
  const password = checkPasswordOrExit();

  if (!fs.existsSync(encPath)) {
    console.error(`❌ 错误：未找到加密文件 ${encPath} (当前目录: ${process.cwd()})`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(encPath, 'utf8');
  const parts = fileContent.split(':');

  if (parts.length !== 4) {
    console.error('❌ 解密失败：文件格式错误。');
    process.exit(1);
  }

  const [saltHex, ivHex, authTagHex, encryptedContent] = parts;

  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(authTag);

  try {
    let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    fs.writeFileSync(envPath, decrypted);
    console.log(`🔓 解密成功: .env.enc -> .env`);
  } catch (error) {
    console.error('❌ 解密失败：密码错误或文件损坏！');
    process.exit(1);
  }
}

const action = process.argv[2];

switch (action) {
  case 'encrypt':
    encrypt();
    break;
  case 'decrypt':
    decrypt();
    break;
  default:
    console.log('用法: node vault.js [encrypt|decrypt]');
    process.exit(1);
}
