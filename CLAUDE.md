# 陕西智光新程能源科技有限公司业务管理系统

## 项目概述

- 公司：陕西智光新程能源科技有限公司（分布式光伏安装，屋顶太阳能板）
- 团队：约20人，3部门（综合管理部 / 业务开发部 / 技术方案部）
- 现状：Excel + 微信群管理，数据互通混乱
- 目标：业务管理系统（直接上系统，不用 Excel 双轨并行）

---

## 部署信息

- **生产服务器**：http://120.27.221.35:3003/
- **数据库**：Supabase Cloud（远程）
- **部署方式**：自建服务器（非 Vercel）

### 部署流程

```bash
# 1. 本地构建
npm run build

# 2. 打包部署文件
tar -czvf gfgs-deploy.tar.gz .next node_modules package.json package-lock.json

# 3. 上传到服务器（通过 scp 或其他方式）
scp gfgs-deploy.tar.gz user@120.27.221.35:/path/to/gfgs/

# 4. 在服务器上解压并重启
ssh user@120.27.221.35
cd /path/to/gfgs
tar -xzvf gfgs-deploy.tar.gz
pm2 restart gfgs  # 或其他进程管理方式
```

---

## 技术栈

- 前端：Next.js 15 + React 19 + TypeScript + Tailwind CSS
- 后端：Next.js App Router（Server Actions）
- 数据库：Supabase（PostgreSQL + RLS）
- 部署：自建服务器（http://120.27.221.35:3003/）

---

## 客户生命周期（8阶段）

```
现勘 → 设计出图 → 建档通过 → 备案 → 并网资料+网上国网 → 发货 → 并网 → 闭环
```

- **并网截止**：天合 43 天 / 其他品牌 28 天（从发货日起计算）
- **逾期预警**：截止日前 7 天触发提醒
- **提成分期**：施工队进场发 50%，闭环完成发 50%，钉钉提交审核
- 结算条件：闭环 + 满意视频（含初装补贴画面）+ 钉钉提交 + 1% 增值税专票

---

## 权限设计（RBAC）

| 角色 | 数据范围 |
|------|---------|
| 业务部员工 | 自己负责的客户（salesperson_id = self）|
| 技术部员工 | 分配给自己的项目 |
| 综合部员工 | 本部门数据 + 全部公共字段 |
| 总经理/副总 | 全部数据（读写）|

---

## 核心业务规则

- **登录**：手机号 + 密码（默认 `123456`，首次登录强制修改）
- **成长基金**：全员可见汇总，个人明细隔离

---

## 项目目录结构

```
gfgs/
├── CLAUDE.md          # AI 项目上下文
├── PRD.md             # 需求文档
├── SPEC.md            # 技术规格
├── data/              # 现有数据（Excel + 制度文档）
└── src/
    ├── app/           # Next.js App Router
    ├── components/    # React 组件
    ├── lib/           # 工具函数
    └── types/         # TypeScript 类型
```

---

## 运行命令

```bash
npm install            # 安装依赖
npm run dev            # 本地开发（http://localhost:3000）
npm run build          # 生产构建
npm run lint           # 代码检查
```

---

## 编码原则（Karpathy AI）

1. **Think Before Coding**：写代码前先想清楚，不要上来就写。先理清数据结构、边界情况、依赖关系
2. **Simplicity First**：用最少的代码解决实际问题。不做假设性抽象，不超前设计
3. **Surgical Changes**：每次改动的范围要精准。改一个问题，不带出三个新问题
4. **Goal-Driven Execution**：每次操作都有明确目标。不为了写代码而写代码

### 额外原则

- **不可变**：不直接修改传入对象，创建新对象返回
- **文件大小**：单个文件不超过 800 行，大于 400 行考虑拆分
- **错误处理**：在系统边界处理错误，提供用户友好的错误信息
- **输入校验**：在系统边界校验所有用户输入，不信任外部数据

---

## 第一阶段范围

数据库 Schema + 数据 + 界面（不拆分阶段）

1. Supabase 项目 + Schema + RLS 配置
2. 员工账号初始化
3. Excel 数据导入（55 行客户）
4. 登录页 + 强制改密
5. 客户 CRUD + 8 阶段推进
6. 全局仪表盘 + 各部门视图
7. 提成管理 + 成长基金台账
