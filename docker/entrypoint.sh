#!/bin/sh

# 1. 启动 Nginx (以后台模式运行)
echo "Starting Nginx..."
nginx

# 2. 启动 Node.js 服务
echo "Starting Node.js Server..."
# 注意：这里路径取决于 Dockerfile 中的 WORKDIR 设置
cd /app
# 确保传入了 VAULT_PASS 环境变量用于解密配置
node server/index.js
