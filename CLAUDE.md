# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

陕西智光新程能源科技有限公司内部客户进度跟踪系统（MVP）。
当前状态：Greenfield 项目，Next.js 尚未初始化，仅有数据文件和实现计划。

## 核心架构

- **前端框架:** Next.js (App Router) + TypeScript + Tailwind CSS
- **数据库:** Supabase (PostgreSQL)
- **部署:** Vercel
- **渲染策略:** CSR (Client-Side Rendering)，客户端组件直接连接 Supabase

**重要:** MVP 使用 Supabase anon key 直连客户端（Phase 1 无 Auth，所有人可读写）。

## 开发命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 生产构建
```

Next.js 尚未初始化。初始化命令见下方。

## 关键文件

| 文件 | 用途 |
|------|------|
| `PLAN.md` | 完整实现计划，包含架构决策、数据库 Schema、期限计算逻辑 |
| `data/客户进度表(4月2日).xlsx` | 55条客户原始数据 |
| `data/已发货未闭环客户进度(4月2日).xlsx` | 特殊记录，需单独处理 |
| `scripts/migrate-data.js` | Excel → JSON 迁移脚本（尚未创建，PLAN.md 有完整代码） |
| `src/lib/deadlines.ts` | 期限计算逻辑（尚未创建） |
| `src/lib/supabase.ts` | Supabase 客户端（尚未创建） |
| `src/components/StageUpdateModal.tsx` | 阶段更新弹窗（尚未创建） |

## 数据库 Schema

完整 Schema 定义在 `PLAN.md` 的 1.2 节。核心表：

- `customers` — 客户表，10个日期字段 + current_stage
- `stage_history` — 阶段变更历史
- `stage_definitions` — 阶段配置表（时限可配置）
- `employees` — 员工表（Phase 2 用）

## 期限计算逻辑（关键）

见 `PLAN.md` 的"超期判定逻辑"章节和"期限计算逻辑图"。

- **发货前阶段:** 各有独立时限（现勘7天、设计3天、建档7天、备案14天、并网资料7天），从上一阶段完成日期算起
- **并网阶段:** 品牌决定总天数，天合43天，其他28天，从 shipping_date 算起
- **超期阈值:** >7天=绿色，3-7天=黄色，<3天=橙色，<0=红色
- **stage_definitions 表** — 应用启动时缓存，非硬编码

## 待完成项（从 PLAN.md 实施步骤）

1. [ ] Day 0: Supabase 项目创建，Next.js 初始化，`npm run dev` 可运行
2. [ ] Day 1: 55条客户数据导入 Supabase
3. [ ] Day 4: 客户列表页面展示，deadline 计算正确
4. [ ] Day 7: 阶段更新弹窗，客户详情时间轴
5. [ ] Day 14: Vercel 部署完成

## Next.js 初始化命令

```bash
cd D:/code/gfgs
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git --yes
npm install @supabase/supabase-js
```

## 环境变量

`.env.local`（需要手动创建）:
```
NEXT_PUBLIC_SUPABASE_URL=你的Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon key
```

## 测试计划

已生成：`C:\Users\EF\.gstack\projects\gfgs\EF-unknown-eng-review-test-plan-20260417-184500.md`

关键测试路径：
- 客户列表加载 + deadline 计算（边界条件：shipping_date 为空、无上一阶段日期）
- 阶段更新弹窗（正常提交、网络错误、防重复提交）
- 数据迁移脚本（Excel 解析、serial date 转换、空值处理）
- 移动端响应式布局

## Skill 路由

### gstack Skills (内置)
- Bugs, errors → invoke `gstack-investigate`
- Ship, deploy → invoke `gstack-ship`
- QA, test → invoke `gstack-qa`
- Code review → invoke `gstack-review`
- Architecture review → invoke `gstack-plan-eng-review`

### 前端设计
- UI 设计检查、可访问性审查、设计规范审计 → invoke `web-design-guidelines`
  - 触发词："检查这个组件的设计"、"看看可访问性"、"审查UX"
