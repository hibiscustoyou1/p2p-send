# 🛠️ 详细技术栈规范与架构设计 (Tech Stack & Architecture)

该项目基于 PNPM Monorepo 构建，涵盖以下核心工作区，并深度整合了专为 P2P 文件传输设计的网络穿透技术。

## 1. 🏗️ 基础设施层与宏观架构 (Infrastructure)
整个传输架构为典型的 Web P2P 模型，完全无需媒体转发器，纯靠客户端物理网卡互传。
- **核心协议引擎**: 
  - **WebRTC (`RTCDataChannel`)**: 负责建立真正点对点、双向高吞吐量的 Buffer 传输隧道。
  - **WebSocket / Socket.io**: 担当**极其轻量的中心交换机**，只负责 A 和 B 互相识别“暗号”交换 SDP（Offer / Answer）。
  - **跨网段 P2P 穿透 (STUN)**: 针对“手机（5G 蜂窝网络）与电脑（有线网/Wi-Fi）”跨越不同运营商网络互联的刚需，在前端代码中配置全球可用的公益 STUN 节点（如 Google 或 Cloudflare 的长效节点），零成本解析双方极端的公网出口 IP 促成 UDP 高速打洞。
  - **【零成本】舍弃 TURN 兜底**: 坚决舍弃会耗费服务器昂贵带宽的 TURN 中转服务。保障极客/个人使用场景下的服务器 0 宽带消耗（仅遇到极少数极端对称型 NAT 网络彻底无法直连时提示连接失败，属于设计预期内取舍）。
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
- **生产环境约束 (阿里云低配机)**：本架构能够完美运行于配置极低（如 1核 1G/2G）的 Ubuntu 云主机单节点。由于**无强制配置域名**，我们仅依赖该主机唯一的静态公网 IP 暴露 Node 服务。
- **降本增效防坑 (HTTPS/TLS 限制)**：
  - 现代浏览器要求只在安全上下文（`https` / `localhost`）才能调用麦克风摄像头等，所幸 **`RTCPeerConnection` (纯 P2P 通道) 绝大部分底层 API 及 File API在现代浏览器中允许在非 HTTPs 环境下发起建联协商**，但可能受到特定浏览器安全沙箱限制（如部分移动端浏览器严格策略拦截剪贴板或下载）。
  - **建议的生产形态**：为了一劳永逸绕过浏览器安全警告，即使没有域名，也强烈建议通过自签名证书（Self-Signed Certificate）部署一个基础的 Nginx Reverse Proxy (HTTPS 443 端口) 转发给信令服务 (HTTP 3000 端口)。
- **运行框架**: Express (v5.1+) + `Socket.io` 承接无状态的并发万级长连接。
- **全局并发匹配结构**: 依靠 Socket.io 的 `Rooms` 功能，将六位邀请码设定为通道名，通过精准的广播机制完成双方组队。
- **高可用演进 (暂缓)**: 鉴于单机低配目标，初期剥离 Redis Pub/Sub 同步通道，仅使用单进程本地内存维护所有房间会话，极致榨干单机性能。

## 4. 🔗 前后端断点续传契约共享 (@repo/shared)
- 必须枚举信令握手阶段的所有通信指令强类型事件（`JOIN_ROOM`, `SIGNAL`, `PEER_LEFT`）。
- **统一断点续传指纹算法 (File Fingerprint)**:
  利用 `SHA-256(名字 + 修改时间 + 尺寸)` 作为全网唯一的 `fileID`。接收方将完好的分片数组（`[1...4, 6...89]`）作为重连的 ACK Req 发射给对端精确定向要包，所有核心协议声明强类型约束收敛于 Shared 包内。
