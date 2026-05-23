# PROGRESS — Carol's Website

> 这份文件记录 **现在做到哪了**。HANDOFF.md 是设计源文档,CLAUDE.md 是规则,这份是状态。
> 每天开工前看这个,明天往后翻。

最后更新:**2026-05-23**(Day 1 收工)

---

## 当前可工作的本地环境

- Dev server: `npm run dev`(http://localhost:3000)
- env 文件:`.env.local` 已配 **MiniMax Coding Plan** + **Supabase**;Stripe / Turnstile 留空(Day 2)
- Supabase 项目:`afubpxxjyzsmbpzgdrnr` · 已建表 `readers`
- AI 后端:MiniMax Coding Plan 的 Anthropic 兼容端点(`api.minimaxi.com/anthropic`),模型 `MiniMax-M2.7`(推理模型,代码已过滤思维链)

---

## Day 1 完成清单

### 前端
- [x] `app/[lang]/layout.tsx` — Nav / Footer / ScrollProgress / AskPanel / ReaderWelcome 全部接入
- [x] `app/[lang]/page.tsx` — 5 section:Hero · Insights · Perspectives · Plans · About
- [x] `app/[lang]/insights/[slug]/page.tsx` — Insight 详情页
  - zh 渲染正文;非 zh/en 显示 "Article in English" 提示(HANDOFF 规则)
  - 英文版默认是占位 — 等 Carol 手写,**绝不 AI 翻译正文**
- [x] `components/ask-panel.tsx` — 浮动按钮 + 自定义滑入面板(不是 shadcn Dialog,按 hero-mockup.html 1:1 复刻)
- [x] `components/reader-welcome.tsx` — 顶部细条 "你是第 N 位读者",cookie 缓存
- [x] `components/{nav,footer,scroll-progress}.tsx`
- [x] `components/sections/{hero,insights,perspectives,plans,about}.tsx`
- [x] `i18n/request.ts` — deepMerge 回退:6 语言缺的 UI 字段自动用英文兜底

### 后端 / API
- [x] `app/api/chat/route.ts` — Edge runtime,MiniMax 流式,无 key 时返回 stub
  - 用 `@anthropic-ai/sdk` + `baseURL` override(因为 MiniMax Coding Plan 是 Anthropic 兼容)
  - 自动在 base URL 后兜底加 `/anthropic`
  - 过滤 `thinking` 块,只把 `text` 流给前端
- [x] `app/api/welcome/route.ts` — Edge,service_role 写库,返回 `serial_id`
- [x] `app/auth/callback/route.ts` — Magic Link 回调,exchangeCodeForSession
- [x] `lib/supabase/server.ts` — 服务端 client(用 `@supabase/ssr`,读 cookies)

### 数据库
- [x] `supabase/schema.sql` — `readers` 表已建,`serial_id` 用 `generated always as identity`(反 race condition)
- [x] RLS 开启,无 policy = 默认拒绝所有 anon,只有 service_role 能写

### i18n
- [x] `messages/en.json` · `messages/zh.json` 完整
- [x] 6 个其他语言(ja/ko/fr/de/es/pt)走 deepMerge 兜底,只翻 UI 字符串,正文走英文 + 提示

---

## Day 2 待办(明天)

### 上午:部署 Vercel
- [ ] `git init` + push 到 GitHub(私库或公库都行)
- [ ] Vercel 接 GitHub 仓库 → import
- [ ] 在 Vercel 项目 → Settings → Environment Variables 配:
  - `MINIMAX_API_KEY` / `MINIMAX_API_BASE` / `MINIMAX_MODEL`
  - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SITE_URL` = 真正的 Vercel 域名(或自定义域名)
- [ ] Supabase → Authentication → URL Configuration:把 `https://<你的域名>/auth/callback` 加到 Redirect URLs
- [ ] 部署后端到端验证 4 个路径:`/zh`、`/en/insights/<slug>`、`/api/chat`、`/api/welcome`

### 下午:付费链路
- [ ] Stripe Checkout(一次性 product,不要订阅)
- [ ] `/api/checkout` 创建 session
- [ ] `/api/stripe/webhook` 处理支付成功 → 写 credits 到 Supabase
- [ ] AskPanel 配额超出时,显示去支付的入口

### 晚上:防刷 + 真实配额
- [ ] Cloudflare Turnstile 接进 AskPanel(发送前验证)
- [ ] Supabase 加 `chat_usage` 表,记录每个 reader_id 每月的对话次数
- [ ] `/api/chat` 改造:
  1. 检查月度免费配额(5 次)
  2. 不够看 credits
  3. 都不够返 402 + checkout URL

### 收尾
- [ ] Magic Link 登录 UI(只在用户想绑邮箱续费时弹)
- [ ] 把测试数据(readers #1 #2 是我用 curl 测出来的)清掉,让真实第一位读者看到 #1

---

## 已知遗留 / 决策

- **Next 16 `middleware` 弃用警告**:不影响功能,等 next-intl 适配 Next 16 `proxy.ts` 命名后再改 一行重命名 + 调试
- **MiniMax-M2.7 是推理模型**:每个问题先想几秒再吐字。流式过程用户看不到思维链,但首字延迟比传统对话模型长 3-5 秒
- **HANDOFF.md §8 待 Carol 决定的事**:今天没碰,Day 2 部署完后再敲定(域名、Stripe 价格、6 语言 Hero 翻译...)
- **测试数据**:`readers` 表里 serial_id 1 和 2 是我 curl 测出的"假读者",上线前删一下

---

## 文件路径速查

```
app/
├── [lang]/
│   ├── layout.tsx              # 全局壳
│   ├── page.tsx                # 首页 = 5 sections
│   └── insights/[slug]/page.tsx
├── api/
│   ├── chat/route.ts           # MiniMax 流式
│   └── welcome/route.ts        # 读者 serial
├── auth/callback/route.ts      # Magic Link
└── globals.css                 # 所有视觉 token + 1300 行样式

components/
├── ask-panel.tsx               # 数字分身浮动面板
├── reader-welcome.tsx          # 顶部欢迎细条
├── nav.tsx · footer.tsx · scroll-progress.tsx
└── sections/{hero,insights,perspectives,plans,about}.tsx

lib/
├── content.ts                  # markdown 读取
└── supabase/server.ts          # 服务端 client

i18n/
├── routing.ts                  # 8 locales 定义
└── request.ts                  # deepMerge 兜底

messages/
└── en.json · zh.json · ja.json · ko.json · fr.json · de.json · es.json · pt.json

supabase/
└── schema.sql                  # readers 表

content/
├── zh/{insights,perspectives,plans.md,about.md}
└── en/{...}                    # 占位,Carol 手写
```

---

## 启动命令

```bash
cd /Users/carol/Documents/Projects/carol-website
npm run dev      # http://localhost:3000
```

挂掉后重启 dev server(让它读最新 .env.local):
```bash
pkill -f "next dev" && npm run dev
```
