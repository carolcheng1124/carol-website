-- ============================================================
-- Carol's Website — Supabase schema
-- 把这整段贴到 Supabase 控制台 → SQL Editor → 执行
-- 重复执行是安全的(用了 if not exists)
-- ============================================================

-- ---- 读者表(用于"你是第 N 位读者") ----
-- serial_id 用 `generated always as identity` —— 永远单调递增,DB 层面保证无并发竞态。
-- 永远不要用 count(*) 算序号,会在并发下重号。
create table if not exists public.readers (
  id          uuid primary key default gen_random_uuid(),
  serial_id   bigint generated always as identity,
  created_at  timestamptz not null default now(),
  lang        text,
  user_agent  text
);

-- 索引:按 serial_id 查更快(虽然 identity 本来就有,显式加一个无害)
create index if not exists readers_serial_id_idx on public.readers (serial_id);

-- ---- RLS:不允许任何匿名访问 ----
-- 写入和读取都走 service_role(server 端),前端永远不直连这张表。
alter table public.readers enable row level security;

-- (没有 policy = 默认拒绝所有 anon / authenticated 操作。service_role 自动 bypass RLS。)

-- ---- 健康检查:看一下当前读者数 ----
-- select count(*), max(serial_id) from public.readers;
