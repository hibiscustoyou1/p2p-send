# 🛠️ 详细技术栈规范与架构设计 (Tech Stack & Architecture)

该项目基于 PNPM Monorepo 构建，涵盖以下核心工作区，并深度整合了专为 P2P 文件传输设计的网络穿透技术。

## 1. 🏗️ 基础设施层与宏观架构 (Infrastructure)
整个传输架构为典型的 Web P2P 模型，无需极高带宽的媒体转发器，依靠客户端原生的算力与网速。
- **核心协议引擎**: 
  - **WebRTC (`RTCDataChannel`)**: 负责在浏览器建立真正点对点、双向高吞吐量的 Buffer 传输隧道。
  - **WebSocket / Socket.io**: 担当**超轻量中心化信令服务器**，帮助处于两端的孤立节点互相认识、交换坐标（Offer / Answer / ICE）。
  - **STUN/TURN 兜底基建**: 防患极其变态的全对称 NAT 墙，需结合自建的 `coturn` 服务器出具临时密码证书防白嫖下发策略，进行极限兜底转发。
- **包管理器**: `pnpm` (v10+，限定 workspaces 制)

## 2. 💻 前端核心引擎 (apps/client)
**定位：整个 P2P 系统的最强大脑与繁重驱动中心。**
- **核心底座**: Vue 3 (v3.5+) + Vite (`rolldown-vite`) + Pinia (复杂状态处理)。
- **样式与展现**: Tailwind CSS 驱动绝美的深阶主题设计与拟物微动效。
- **WebRTC 缓冲控制 (Bufferbloat 防御)**: 前端必须建立智能限流器，监听 `channel.bufferedAmount` 触发的背压响应，禁止狂暴 `while` 循环塞图拉爆浏览器内存。
- **文件切片读取与持久化边界 (File Slicer & FS API)**:
  - **发件方**: 规避 `ArrayBuffer` 一次性读取。必须利用 `File.slice(offset, chunkSize)` 切割 16KB-64KB 发送。
  - **收件方**: 引入现代 Chrome 方案 **`File System Access API`** 以流的形式（Streams）接收后实时写入硬盘，彻底解决 OOM；无法调用的备选方案为写入 IndexedDB 等待最终组合导出。

## 3. ⚙️ 后端调度网关 (apps/server)
**定位：极具弹性拓展能力的撮合“红娘”，高速度与无状态。**
- **运行框架**: Express (v5.1+) + `Socket.io` 承接万名级别的轻连接。
- **全局并发匹配结构 (Room Matching)**: 
  依靠 Socket.io 的 `Rooms` 功能，将邀请码设定为房间名。通过精准的广播与容量收束策略完成两人组队握手。
- **高可用演进 (多 Pod 横向扩展)**: 
  使用 `socket.io-redis-adapter`，将孤立进程的频道同步投递至 Redis Pub/Sub，使得在多负载均衡节点下的设备也能凭“邀请码”跨机器配对成功。 
- **开发与编译**: `nodemon` + `tsx` 提供后端类型的实时映射。

## 4. 🔗 前后端断点续传契约共享 (@repo/shared)
- 必须枚举信令握手阶段的所有通信指令强类型事件（`JOIN_ROOM`, `SIGNAL`, `PEER_LEFT`）。
- **统一断点续传指纹算法 (File Fingerprint)**:
  利用 `SHA-256(名字 + 修改时间 + 尺寸)` 作为全网唯一的 `fileID`。接收方将完好的分片数组（`[1...4, 6...89]`）作为重连的 ACK Req 发射给对端精确定向要包，所有核心协议声明强类型约束收敛于 Shared 包内。
