# 实现计划：光伏公司客户进度跟踪系统 MVP

生成时间: 2026-04-17
状态: DRAFT
基于: design doc (EF-unknown-design-20260417-181215.md)

---

## 背景

陕西智光新程能源科技有限公司，11人，30个客户（实际数据55条），3个部门。
核心痛点：不知道每个客户卡在哪一步。
MVP目标：2周内上线，客户进度跟踪系统，经理1分钟内看到超期客户。

**架构选择：API Routes 中间层 + Supabase RPC 事务 + 移动端卡片 + CSR**
- MVP 使用 Next.js App Router 的 API Routes 作为 Supabase 和前端之间的中间层
- Anon key 只存在于服务端环境变量，不暴露给客户端
- 未来可在此层加缓存、日志、限流、审计等
- 阶段更新原子性：通过 Supabase RPC 事务函数保证（UPDATE stage_history + UPDATE current_stage 在同一数据库事务内）
- 移动端：卡片优先布局，每张卡片展示关键信息，点击展开详情
- 渲染策略：CSR（Client-Side Rendering），Next.js 客户端组件

---

## 第一阶段：环境准备（Day 0）

### 1.1 Supabase 账号注册和项目创建

需要手动完成，无法自动化。

1. 访问 https://supabase.com 注册账号
2. 创建新项目 (Project name: `gfgs-pv`, Region: 亚太 - 新加坡)
3. 记录以下信息：
   - `Project URL` (格式: `https://xxxx.supabase.co`)
   - `anon/public` key (Settings → API)
   - `service_role` key (仅服务端使用)
4. 在 Supabase Dashboard → SQL Editor 中运行下面的数据库 schema

### 1.2 数据库 Schema 设计

```
-- 员工表 (Phase 2 考勤薪资用，Phase 1 先建好)
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  department TEXT NOT NULL CHECK (department IN ('综合部', '业务部', '技术部')),
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 客户表
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number INTEGER,                    -- 序号
  region TEXT,                              -- 区域
  name TEXT NOT NULL,                      -- 客户名称
  salesperson_id UUID REFERENCES employees(id), -- 业务员
  panel_count INTEGER,                      -- 板数
  brand TEXT CHECK (brand IN ('天合', '光伏星', '其他')), -- 品牌
  house_type TEXT,                          -- 户型
  project_company TEXT,                     -- 项目公司
  contract_date DATE,                       -- 签合同日期
  survey_date DATE,                         -- 现勘日期
  design_date DATE,                         -- 设计出图日期
  record_approved_date DATE,                -- 建档通过日期
  filing_date DATE,                         -- 备案日期
  grid_docs_date DATE,                      -- 并网资料+网上国网日期
  shipping_date DATE,                       -- 发货日期
  grid_date DATE,                           -- 并网日期
  closed_date DATE,                         -- 闭环日期
  acceptance_date DATE,                     -- 用户验收日期
  business_fee_status TEXT,                 -- 业务费状态
  current_stage TEXT NOT NULL DEFAULT '签合同',  -- 当前阶段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 阶段定义表 (可配置每阶段的时限)
CREATE TABLE stage_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_key TEXT NOT NULL UNIQUE,          -- 'sign_contract', 'survey', 'design'...
  stage_name TEXT NOT NULL,                 -- 显示名称
  sequence INTEGER NOT NULL,                 -- 顺序
  default_days INTEGER,                      -- 默认天数限制（可为NULL表示不限）
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 阶段历史记录表 (每次阶段变更都记录)
CREATE TABLE stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  exited_at TIMESTAMPTZ,                    -- NULL表示仍在该阶段
  employee_id UUID REFERENCES employees(id),
  notes TEXT
);

-- 初始化阶段定义
INSERT INTO stage_definitions (stage_key, stage_name, sequence, default_days) VALUES
  ('sign_contract', '签合同', 1, NULL),
  ('survey', '现勘', 2, 7),
  ('design', '设计出图', 3, 3),
  ('record_approved', '建档通过', 4, 7),
  ('filing', '备案', 5, 14),
  ('grid_docs', '并网资料', 6, 7),
  ('shipping', '发货', 7, NULL),
  ('grid_connection', '并网', 8, NULL),    -- 特殊：品牌不同，时限不同
  ('closed', '闭环', 9, NULL),
  ('acceptance', '用户验收', 10, NULL);

-- 行级安全策略 (RLS)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_definitions ENABLE ROW LEVEL SECURITY;

-- 所有表公开读取（内部工具阶段不做严格隔离）
CREATE POLICY "Allow all reads" ON customers FOR SELECT USING (true);
CREATE POLICY "Allow all inserts" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all updates" ON customers FOR UPDATE USING (true);
CREATE POLICY "Allow all reads" ON stage_history FOR SELECT USING (true);
CREATE POLICY "Allow all inserts" ON stage_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all reads" ON employees FOR SELECT USING (true);
CREATE POLICY "Allow all reads" ON stage_definitions FOR SELECT USING (true);
```

### 1.3 Next.js 项目初始化

```bash
cd D:/code/gfgs
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git --yes
```

安装 Supabase 客户端：

```bash
npm install @supabase/supabase-js
```

创建 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=你的Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon key
```

---

## 第二阶段：数据迁移（Day 1-2）

### 2.1 Excel → JSON 转换脚本

将 Excel 数据转为 JSON，便于导入 Supabase。

```javascript
// scripts/migrate-data.js
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Excel serial → Date
function serialToDate(serial) {
  if (!serial || serial === '/') return null;
  const d = new Date((serial - 25569) * 86400 * 1000);
  return d.toISOString().split('T')[0];
}

// Load customer data
const wb = XLSX.readFile(path.join(__dirname, '../data/客户进度表(4月2日).xlsx'));
const ws = wb.Sheets['Sheet1'];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

// Row 1 has headers
const headers = raw[1];
const colMap = {};
headers.forEach((h, i) => { if (h !== '') colMap[String(h).replace('\n', '').trim()] = i; });

// Parse data rows (rows 2 onwards, stop at empty rows)
const customers = [];
for (let i = 2; i < raw.length; i++) {
  const r = raw[i];
  if (!r[colMap['序号']]) break; // Stop at first empty row

  const name = r[colMap['客户\n名称']];
  if (!name || name === '/') continue;

  customers.push({
    serial_number: parseInt(r[colMap['序号']]),
    region: r[colMap['区域']],
    name: name,
    salesperson_id: null, // 需要手动关联
    panel_count: parseInt(r[colMap['板数']]) || null,
    brand: r[colMap['品牌']],
    house_type: r[colMap['户型']],
    project_company: r[colMap['项目\n公司']],
    contract_date: null, // Excel里没有，设为null
    survey_date: serialToDate(r[colMap['现勘']]),
    design_date: serialToDate(r[colMap['设计\n出图']]),
    record_approved_date: serialToDate(r[colMap['建档通过']]),
    filing_date: serialToDate(r[colMap['备案']]),
    grid_docs_date: serialToDate(r[colMap['并网资料\n+网上国网']]),
    shipping_date: serialToDate(r[colMap['发货日期']]),
    grid_date: serialToDate(r[colMap['并网日期']]),
    closed_date: serialToDate(r[colMap['闭环日期']]),
    acceptance_date: serialToDate(r[colMap['用户验收']]),
    business_fee_status: r[colMap['业务费']],
    current_stage: calculateCurrentStage(r)
  });
}

// Determine current stage based on latest completed date
function calculateCurrentStage(row) {
  const stages = [
    { key: 'survey', col: '现勘' },
    { key: 'design', col: '设计\n出图' },
    { key: 'record_approved', col: '建档通过' },
    { key: 'filing', col: '备案' },
    { key: 'grid_docs', col: '并网资料\n+网上国网' },
    { key: 'shipping', col: '发货日期' },
    { key: 'grid_connection', col: '并网日期' },
    { key: 'closed', col: '闭环日期' },
    { key: 'acceptance', col: '用户验收' },
  ];

  // Find the latest completed stage (last non-empty date)
  for (let i = stages.length - 1; i >= 0; i--) {
    const val = row[colMap[stages[i].col]];
    if (val && val !== '/') return stages[i].key;
  }
  return 'sign_contract';
}

// Export
console.log(JSON.stringify(customers, null, 2));
```

### 2.2 数据导入 Supabase

通过 Supabase Dashboard → Table Editor 手动导入，或写一个简单的 import 脚本。

**注意：** 55条记录中有部分业务员姓名需要关联到 employees 表的 id。建议先导入 employees（11条），再更新 customers 表的 salesperson_id。

---

## 第三阶段：前端开发（Day 2-10）

### 3.1 项目结构

```
src/
├── app/
│   ├── layout.tsx              # 根布局，Supabase Provider
│   ├── page.tsx                # 首页 → 客户列表
│   ├── customers/
│   │   ├── page.tsx            # 客户列表
│   │   ├── [id]/
│   │   │   └── page.tsx        # 客户详情 + 时间轴
│   │   └── new/
│   │       └── page.tsx        # 新建客户
│   └── api/
│       └── customers/
│           └── [id]/
│               └── route.ts    # REST API (可选，Supabase直连也够用)
├── components/
│   ├── CustomerTable.tsx       # 客户列表表格
│   ├── StageTag.tsx            # 阶段标签
│   ├── DeadlineBadge.tsx       # 剩余天数徽章（红/黄/绿）
│   ├── StageTimeline.tsx       # 单客户时间轴
│   └── StageUpdateModal.tsx    # 更新阶段弹窗
├── lib/
│   ├── supabase.ts             # Supabase 客户端
│   ├── stages.ts               # 阶段配置和工具函数
│   └── deadlines.ts            # 期限计算逻辑
└── types/
    └── index.ts                # TypeScript 类型定义
```

### 3.2 核心组件：客户列表页面

**`src/app/customers/page.tsx`**

```tsx
// 核心功能：
// 1. 从 Supabase 获取所有客户数据（JOIN employees）
// 2. 计算每个客户的当前阶段、剩余天数、是否超期
// 3. 按区域或阶段筛选
// 4. 点击行进入详情页
// 5. 点击"更新阶段"按钮打开弹窗

// deadline 计算逻辑：
// - 阶段: survey → design(7天) → record_approved(3天) → filing(7天) → grid_docs(14天) → grid_connection
// - grid_connection 的期限根据品牌：
//   - 天合: shipping_date + 43天
//   - 其他: shipping_date + 28天
// - 发货前阶段：每个阶段有独立时限，从上一阶段完成日期算起
// - remaining_days = deadline - today
// - 状态: >7天 → 绿色, 3-7天 → 黄色, <3天 → 橙色, <0 → 红色(超期)

// 数据库查询：
// SELECT c.*, e.name as salesperson_name
// FROM customers c
// LEFT JOIN employees e ON c.salesperson_id = e.id
// ORDER BY c.region, c.serial_number
```

### 3.3 核心组件：阶段更新弹窗

**`src/components/StageUpdateModal.tsx`**

```
流程：
1. 用户点击某行的"更新"按钮
2. 弹窗显示：当前阶段 → 选择新阶段（下拉菜单，按顺序排列）
3. 填写：完成日期（默认当天）、负责人（下拉选员工）、备注
4. 提交 → RPC 函数（事务原子性保证，防并发覆盖）：
   - UPDATE customers SET current_stage = ?, updated_at = NOW()
   - INSERT INTO stage_history (entered_at = NOW(), employee_id, notes)
   - UPDATE stage_history SET exited_at = NOW() WHERE exited_at IS NULL
   - 错误处理：try/catch + toast 通知（'提交失败，请重试'），loading 状态防重复提交
   - RPC 事务在数据库层保证原子性，前端防重复提交防止 UX 多次点击，RPC 防并发提交防止数据覆盖
```

### 3.4 核心组件：客户详情时间轴

**`src/components/StageTimeline.tsx`**

```
- 展示该客户所有阶段的日期（从Excel迁移过来的历史日期）
- 每阶段显示：阶段名、日期、负责人、备注
- 当前阶段高亮
- 超期阶段标红
```

### 3.5 认证（可选，Phase 1 跳过）

Phase 1 作为内部工具，先不做 Auth。所有人可读写。等考勤薪资上线时再加 Auth。

### 3.6 实时同步（Phase 1 跳过）

MVP 阶段不启用 Supabase Realtime 订阅。11人小团队，手动刷新页面可接受。Week 2 根据团队反馈再评估是否需要实时同步。

---

## 第四阶段：部署（Day 11-14）

```bash
# 1. Vercel 部署
npm i -g vercel
vercel --prod

# 2. 配置环境变量
# Vercel Dashboard → Settings → Environment Variables
# 添加 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. 域名（可选）
# Vercel Dashboard → Domains → 添加自定义域名
```

---

## 数据库架构图

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  customers      │     │  stage_history   │     │  employees         │
│─────────────────│     │──────────────────│     │────────────────────│
│ id (PK)         │◄───┐│ id (PK)          │     │ id (PK)            │
│ serial_number   │    ││ customer_id (FK) │────►│ name               │
│ name            │    ││ stage_key        │     │ position           │
│ region          │    ││ stage_name       │     │ department         │
│ salesperson_id  │────┼│ entered_at       │     │ phone              │
│ panel_count     │    ││ exited_at (NULL) │     └────────────────────┘
│ brand           │    ││ employee_id (FK)│──┐
│ current_stage   │    ││ notes           │  │    ┌────────────────────┐
│ *_date (10个)   │    └┴──────────────────┘  └──►│ stage_definitions  │
│ created_at      │                                │────────────────────│
└─────────────────┘                                │ id (PK)            │
                                                   │ stage_key (UNIQUE) │
                                                   │ stage_name         │
                                                   │ sequence           │
                                                   │ default_days       │
                                                   └────────────────────┘
```

---

## 期限计算逻辑图

```
┌─────────────┐    ┌─────────────┐    ┌────────────────┐    ┌────────────────┐
│  签合同     │───▶│  现勘(7天)  │───▶│ 设计出图(3天)   │───▶│ 建档通过(7天)  │
└─────────────┘    └─────────────┘    └────────────────┘    └────────────────┘
                                                                   │
                                                                   ▼
┌─────────────┐    ┌─────────────┐    ┌────────────────┐    ┌────────────────┐
│  闭环 ★     │◄───│ 并网(品牌   │◄───│ 备案(14天)     │◄───│ 并网资料(7天)  │
│  验收      │    │  决定)       │    └────────────────┘    └────────────────┘
└─────────────┘    └─────────────┘
                         │
                    天合: 43天
                   其他: 28天
                  (从发货日期算)
```

---

## NOT in scope

以下功能明确不在 MVP 范围内：
1. **考勤打卡** — Phase 2，依赖钉钉或独立打卡系统
2. **薪资计算** — Phase 2，依赖考勤数据
3. **物资库房管理** — Phase 3
4. **多租户 SaaS** — Phase 4，架构上已预留 (tenant_id)
5. **Excel 导出** — MVP后实现，用 `@supabase/excel` 或 xlsx-js
6. **移动端 PWA 离线** — MVP用响应式网页，移动端体验优先
7. **微信/钉钉集成** — 后续考虑
8. **Auth 认证** — Phase 1 跳过，内部工具不做权限隔离

---

## 实施步骤（按周排）

| 阶段 | 任务 | 产出 |
|------|------|------|
| **Week 0 (Day 0)** | 注册Supabase，创建项目，初始化Next.js骨架，配置环境变量 | 可运行的空项目 |
| **Week 0 (Day 1)** | 编写数据库Schema，创建迁移脚本，导入55条客户数据 | 55条客户在数据库中 |
| **Week 1 (Day 2-4)** | 实现客户列表页面（表格+筛选+排序），实现期限计算逻辑，阶段标签组件 | 可看到所有客户的当前状态 |
| **Week 1 (Day 5-7)** | 实现阶段更新弹窗（更新当前阶段+记录历史），实现客户详情页（时间轴展示） | 可更新状态，可查看历史 |
| **Week 2 (Day 8-12)** | 完善UI细节（手机响应式、加载状态、错误处理），添加搜索功能 | 移动端可用，UI完成 |
| **Week 2 (Day 13-14)** | Vercel部署，测试完整流程，最终验收 | **MVP上线** |

---

## 里程碑检查点

- [ ] Day 0: Supabase项目创建，Next.js可运行 `npm run dev`
- [ ] Day 1: 55条客户数据全部在Supabase中，可查询
- [ ] Day 4: 客户列表页面展示，deadline计算正确
- [ ] Day 7: 阶段更新功能可用，时间轴展示历史
- [ ] Day 14: Vercel部署完成，团队可访问

---

## 已发货未闭环客户（特殊处理）

数据文件 `已发货未闭环客户进度(4月2日).xlsx` 包含2条特殊记录：已发货但未并网/闭环的客户。这是超期监控的核心数据。

这些客户的处理方式：
- 作为普通客户记录存在于 customers 表
- current_stage = 'grid_connection'（等待并网）
- shipping_date 存在，grid_date 为空 → 超期计算：天合43天/其他28天
- Dashboard 筛选 "已发货未闭环" 视图单独展示

---

## 超期判定逻辑（关键）

```typescript
// src/lib/deadlines.ts
// 阶段时限从 stage_definitions 表读取（运行时），不是硬编码
// 只有并网阶段(brand决定天数)和没有上一阶段日期时才用默认值

import { supabase } from './supabase';

type Stage = 'sign_contract' | 'survey' | 'design' | 'record_approved'
  | 'filing' | 'grid_docs' | 'shipping' | 'grid_connection' | 'closed' | 'acceptance';

// 从 stage_definitions 表缓存读取时限配置（应用启动时缓存，避免每次查询）
let stageDeadlines: Map<string, number | null> | null = null;

async function getStageDeadlines(): Promise<Map<string, number | null>> {
  if (stageDeadlines) return stageDeadlines;
  const { data } = await supabase.from('stage_definitions').select('stage_key, default_days');
  stageDeadlines = new Map((data || []).map((d: any) => [d.stage_key, d.default_days]));
  return stageDeadlines;
}

function getPreviousStageDate(customer: Customer): Date | null {
  // ... 根据 current_stage 找到上一阶段的日期字段
}

async function getDeadline(customer: Customer): Promise<Date | null> {
  const today = new Date();
  const deadlines = await getStageDeadlines();

  // 发货前的阶段：从上一阶段完成日期算起
  if (customer.current_stage !== 'shipping' &&
      customer.current_stage !== 'grid_connection' &&
      customer.current_stage !== 'closed' &&
      customer.current_stage !== 'acceptance') {
    const prevDate = getPreviousStageDate(customer);
    if (prevDate) {
      const days = deadlines.get(customer.current_stage) ?? 0;
      return addDays(prevDate, days);
    }
  }

  // 并网阶段：根据品牌计算（品牌决定天数，不走 stage_definitions 表）
  if (customer.current_stage === 'grid_connection') {
    if (!customer.shipping_date) return null;
    const days = customer.brand === '天合' ? 43 : 28;
    return addDays(parseDate(customer.shipping_date), days);
  }

  return null;
}

async function getStatus(customer: Customer): Promise<'green' | 'yellow' | 'orange' | 'red'> {
  const deadline = await getDeadline(customer);
  if (!deadline) return 'green';

  const today = new Date();
  const remaining = daysBetween(today, deadline);
  if (remaining < 0) return 'red';     // 超期
  if (remaining < 3) return 'orange';  // 不足3天
  if (remaining < 7) return 'yellow'; // 不足7天
  return 'green';
}
```

---

## 成功标准

1. 55条客户数据全部在系统中
2. 经理打开首页，1分钟内看到：哪些客户超期（红）、哪些快超期（黄/橙）
3. 业务员手机打开页面，点击"更新"按钮，更新客户当前阶段
4. 每个客户的历史时间线清晰展示
5. Vercel 部署，全球可访问（内部使用可通过IP限制或密码保护）

---

## 下一步行动

**立即执行：**
1. 注册 Supabase 账号 → https://supabase.com
2. 创建 Supabase 项目
3. 运行上面的 SQL schema
4. `npx create-next-app@latest . --typescript --tailwind` 在 D:/code/gfgs 目录

---

## 工程评审报告

**评审时间:** 2026-04-17
**评审类型:** /plan-eng-review (FULL_REVIEW)
**评审状态:** issues_open (有待处理)

### 评审结果

| 评审维度 | 发现问题 | 已解决 | 状态 |
|---------|---------|--------|------|
| Architecture | 3 | 3 | ✅ |
| Code Quality | 2 | 2 | ✅ |
| Performance | 0 | 0 | ✅ |
| Test | 30 gaps | 0 (greenfield) | ⚠️ |
| Outside Voice | 16 | 3 adopted | ✅ |

**Issues found:** 34 (含30个测试缺口)
**Critical gaps:** 2
- Gap 1: 期限计算边界条件未测试（发货日期为空、无上一阶段日期、并网日期早于发货日期）
- Gap 2: 并发更新处理未测试（Supabase RPC 事务在高并发下的行为）

### 测试覆盖状态

Greenfield 项目，所有代码路径均为测试覆盖缺口。测试计划已写入 `EF-unknown-eng-review-test-plan-20260417-184500.md`。

**核心测试路径（30条）：**
- 客户列表加载 + deadline 计算
- 阶段更新弹窗（正常提交、网络错误、防重复提交）
- 期限计算（各品牌、各阶段、边界条件）
- 数据迁移脚本（Excel解析、特殊字符、空值）
- 移动端响应式布局

### 外部视角采纳

- ✅ 实时同步明确跳过（新增3.6节）
- ✅ deadlines.ts 从 stage_definitions 表读取，非硬编码
- ✅ RPC 事务说明补充并发防护层

### 遗留风险

1. 测试覆盖率 0%，代码上线前需补关键测试用例
2. "验证测试"（Migration script produces valid data）是 MVP 上线前的硬性检查点

### NOT in scope (评审确认)

- 考勤打卡、薪资计算、物资库房管理
- 多租户 SaaS、Excel 导出、离线 PWA
- 微信/钉钉集成、Auth 认证
- Supabase Realtime（Phase 1 跳过）
