# 🔄 研发工作流与铁律 (Workflow)

所有针对该项目的 AI 或人类贡献者，必须严格遵守以下协作流：

## 1. 开发前检查 (Context & Schema First)
- 在任何特性的动工前，查阅并维护更新 `conductor` 档案树（尤其是 `tracks.md`）。
- **Prisma Schema 首发机制**：涉及任何数据层面的更改，必须优先查阅并规划修改 `apps/server/prisma/schema.prisma`。
- **审查先行 (Plan Review First)**：针对任何核心业务逻辑更改，AI 必须先输出详细 `Implementation Plan` 计划，用户显式确认后再去执行文件编辑操作。

## 2. 代码隔离与重构铁律 (Anti-Pollution Rules)
- 前端项目 `apps/client` **绝对禁止**引入 Node.js 模块（如 `fs`, `path`, `child_process` 等）。
- 后端项目 `apps/server` **绝对禁止**调用浏览器全局对象（如 `window`, `document`）。
- **路由挂载阴阳法则**：
  - 前端路由新增时：直接在 `client/src/router` 建 `xxx.routes.ts`（依赖 `import.meta.glob` 自动寻址），**严禁**去 `index.ts` 改写。
  - 后端路由新增时：在 `server/src/routes` 建 `xxx.routes.ts` 后，**必须**回到 `index.ts` 里显式引入并手工 `routes.use` 挂载。
- **聚合下沉**：全局常量的声明、共用的 TS Interface 及公用工具函数，必须通过统一下沉至 `@repo/shared` 暴露给双端。
- **DB 聚合优先**：禁止提取万条记录在内存执行 `forEach`/`filter` 等硬计算流，强力推行使用 Prisma 内置聚合功能（如 `groupBy`, `aggregate`）。

## 3. 日常启动与调试流 (Daily Operations)
- **全量安装依赖**: `pnpm install:all` (涵盖共用库基础构建)
- **加密变量流转**: 拉取代码后执行 `pnpm vault:dec` 获取 `.env`
- **一键开发启停**: `pnpm dev`
- **DB 模型同步**: 修改 Prisma 模型后，必须依序运行 `pnpm db:migrate` 与 `pnpm db:gen` 以同步数据库结构与 TS 客户端。
- **部署编译流水线**: `pnpm build` 进行共享包构建至子应用打包的全链路流程。

## 4. 交付阈值 (Quality Gates)
- 全局拒绝遗留任何 `any` 类型定义，严厉消减隐式类型漏洞。
- 本地执行终端构建与验证（如 `vue-tsc --noEmit`）应保持零 Error 报告。
