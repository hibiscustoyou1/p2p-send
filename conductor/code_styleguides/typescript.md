# 🎯 TypeScript 编码规范

## 1. 零 Any 妥协 (Zero Any Enforcement)
- 项目已开启环境维度的严格模式。严禁代码中出现显式配置的 `any`。
- 如果真的碰到上游无法推断结构的对象，优先使用泛型约束，或退一步使用 `unknown` 配合防御性类型守卫 (Type Guard) 进行属性验证，杜绝一切隐式调用链断裂。

## 2. 安全处理可空与未定义参数 (Null / Undefined Safety)
- 严防对象读取带来的 `Cannot read properties of undefined` 页面白屏报错。
- 处理后端传递的可空返回值乃至 Prisma 的 `Decimal` 包装结果时，**强制**搭配使用类型安全访问符：即可选链操作符 `?.` 以及空值合并操作符 `??` （如 `data?.title ?? '未知'`）。

## 3. 共用类型的统一萃取 (Shared Type Extraction)
- 在任何需要让 UI 层表单或卡片，以及后端持久层共享约束的时候，将 API 响应 `Payload`、请求 `DTO` 以及 `Enums` 提取放置在 `packages/shared` 下对应的入口。
- 两端只允许以 `import { SomeEnum } from '@repo/shared'` 进行消费，一旦出现跨端复制 Types 的行为，立即驳回重构。
