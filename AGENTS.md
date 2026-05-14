# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 常用命令

```bash
# 安装依赖（包括 Playwright 浏览器）
make install

# 开发模式运行（自动构建前端并启动服务器）
make dev
# 或指定端口
make dev PORT=3000

# 单元/集成测试
bun run test
# 或运行单个测试文件
bun run vitest run tests/unit/config-reader.test.ts

# E2E 测试（Playwright）
bun run e2e
# 或运行单个测试
bunx playwright test tests/e2e/app-shell.spec.ts

# TypeScript 类型检查
bun run typecheck

# 构建生产版本
make build

# 完整验证流程（test + e2e + smoke-build）
make verify
```

## 架构概述

这是一个 opencode 配置文件的 Web UI 管理工具。

### 目录结构

- `src/server/` — Hono 后端服务器，提供 REST API，支持 Bun 和 Node.js 运行时
- `src/web/` — React 前端 SPA（TailwindCSS + MUI + shadcn/ui）
- `src/shared/` — 前后端共享的类型定义和配置处理逻辑
- `src/components/ui/` — shadcn/ui 组件库
- `config/profiles/` — profiles 数据存储目录
- `config/config.jsonc` — 全局配置文件

### 配置数据模型

每个 profile 由两个 JSONC 文件组成：

1. **opencode.jsonc** — baseline 配置（只读基础配置）
2. **oh-my-openagent.jsonc** — editable 配置（用户可编辑的覆盖配置）

配置结构：
```
{
  agents: Record<string, AgentConfig>,    // AI agent 配置
  categories: Record<string, CategoryConfig>, // 分类配置
  misc: { tmux?, git_master? }            // 杂项配置
}
```

### 数据流

1. `src/shared/profiles/scanner.ts` 扫描 profiles 目录
2. `src/shared/config/reader.ts` 读取并合并 baseline + editable 配置
3. `src/shared/config/normalizer.ts` 规范化配置数据，分离 editable 字段和 readonly tail
4. `src/server/routes/profiles.ts` 提供 `/api/profiles` REST API
5. `src/web/hooks/useProfile.ts` 前端通过 API 获取/保存配置

### 关键类型定义

核心类型在 `src/shared/types.ts` 和 `src/shared/config/types.ts`：
- `AgentConfig` / `CategoryConfig` — 配置结构
- `EditableConfig` — 用户可编辑的字段集合
- `ProfileConfigResult` — API 返回的完整配置对象
- `GlobalConfig` — 全局配置（providers、config_path、ui_preferences）

### 服务器 CLI 选项

```bash
bun run src/server/index.ts [options]

Options:
  -c, --config <path>    指定全局配置文件路径（默认: config/config.jsonc）
  -p, --port <number>    指定端口号（默认: 自动分配）
  -r, --profiles <path>  指定 profiles 根目录
  -h, --help            显示帮助信息
```

### 全局配置

`config/config.jsonc` 包含：
- `providers` — 模型提供商配置（用于模型下拉选择）
- `config_path` — profiles 根目录路径数组
- `log_path` — 日志文件路径
- `ui_preferences.sync_replace_enabled` — 是否启用同步替换功能
- `default_profile` — 默认选中的 profile

### Sync Replace 功能

当用户修改某个 agent 或 category 的 model 时，系统会检测其他使用相同 model 的项，并提供一键同步替换的选项。相关代码在 `src/web/sync-replace/` 目录下。

### 测试约定

- 单元测试：`tests/unit/*.test.{ts,tsx}` — 使用 vitest + jsdom + @testing-library/react
- 集成测试：`tests/integration/*.test.ts` — 测试 API 和配置读写流程
- E2E 测试：`tests/e2e/*.spec.ts` — Playwright 测试完整 UI 流程
- 测试 fixtures：`tests/fixtures/` — 模拟配置文件和 profiles 目录

vitest 配置使用 `isolate: false` 和 `maxWorkers: 1`，测试间共享模块状态。

## 其他约定

- 路径别名：`@/*` 映射到 `./src/*`
- 样式：TailwindCSS + MUI + CSS 变量（见 `src/web/styles/tokens.css`）
- JSONC 文件使用 `jsonc-parser` 解析（支持注释）
- 配置验证使用 Zod schema（见 `src/shared/schemas.ts`）
- 日志使用 Pino，可通过 `log_path` 配置输出到文件
