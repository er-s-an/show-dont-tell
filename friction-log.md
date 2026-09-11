# Friction Log — Build, Ship, Shape (Alexa+ Track)

> 比赛规则:friction log 最高 +10% 加分。每条记录:任务、步骤、预期 vs 实际、严重度、workaround、建议。

## #1 registerAppTool 对无 UI 的 tool 直接崩溃(2026-09-11)

- **任务**:在 MCP server 上注册两个 tool,其中一个不带 UI 资源
- **预期**:`_meta` 不传或传 `{}` 都能正常工作(无 UI 的 tool 是合法形态)
- **实际**:不传 `_meta` 时,首个请求即 `TypeError: Cannot read properties of undefined (reading 'ui')`(ext-apps v2.0.0 的 `registerAppTool` 直接读 `config._meta.ui`,无防御)
- **严重度**:Medium(运行时崩溃,但报错信息能定位)
- **Workaround**:给所有 tool 传 `_meta: {}`
- **建议**:helper 里加 `config._meta ?? {}` 防御,或在 TS 类型上把 `_meta` 标为必填

## #2 ext-apps starter template 构建脚本隐式依赖 bun(2026-09-11)

- **任务**:按 README 构建 basic-server-vanillajs 模板
- **预期**:README "Getting Started" 只写了 Node.js 20+,`npm run build` 应可运行
- **实际**:build script 内含 `bun build server.ts ...`,无 bun 环境直接失败;README 未提及 bun 是前置条件
- **严重度**:Low(报错明确,装 bun 即解)
- **Workaround**:`brew install bun` 或用 tsc/esbuild 替代
- **建议**:README 前置条件列出 bun,或构建脚本改用 Node 生态工具

## #3 MCP SDK v2 的"双纪元"陷阱:2026-07-28 不是默认开启的(2026-09-11)

- **任务**:让自托管 MCP server 按 2026-07-28 规范(无状态核心、server/discover)提供服务
- **预期**:官方 SDK v2.0.0 "支持 2026-07-28"意味着默认按最新规范握手
- **实际**:SDK v2.0.0 采用双纪元设计——`McpServer.connect()` + 传统 transport 会把实例**绑定为 2025 纪元**;只有 `createMcpHandler`(HTTP)/ `serveStdio` 入口才标记为现代纪元。用 2026-07-28 头发请求会被拒,`server/discover` 返回 -32601。这一关键事实不在 getting-started 文档里,需要读 SDK 内部注释才能发现
- **严重度**:Medium(不影响合标——比赛最低要求是 2025-11-25;但"用新版"需要重写 server 入口)
- **Workaround**:保守选择按 2025-11-25 提供服务(满足比赛要求);`createMcpHandler` 迁移留作 next step
- **建议**:在 SDK 的 migration guide 首页显著位置说明纪元分裂机制;"supports 2026-07-28" 的公告应注明"仅新入口"

## #4 `node --test` 的 glob 行为跨大版本不一致,`engines >=20` 无法直接达成(2026-09-12)

- **任务**:按 `engines: >=20` 声明,在 Node 20 / 22 / 25 矩阵上跑同一套测试命令
- **预期**:`node --test "dist/test/*.test.js"`(Node 侧展开 glob)或 `node --test dist/test/`(目录形式)在声明范围内表现一致
- **实际**:Node 20(v20.20.2)的 test runner 不展开任何 glob,报 `Could not find '…/dist/test/*.test.js'`;Node 22.0 把目录参数当作单个测试文件解析(`dist/test:1:1` 解析失败)。三种写法在两个大版本上各死一种
- **严重度**:Low(仅测试入口;但对"fresh clone 一条命令验证"的评委路径是直接阻塞)
- **Workaround**:用 shell 展开的不加引号 glob——`node --test dist/test/*.test.js`,20/22/25 全部通过
- **建议**:Node 文档的 --test 章节应给出跨版本矩阵支持表;在没有之前,`engines >=20` 的项目别依赖 runner 侧 glob
