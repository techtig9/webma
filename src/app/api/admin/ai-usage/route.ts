import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Aggregates the last 30 days of ai_usage_log into totals by task/provider
// and a per-user leaderboard — the read side of Phase 7's "per-request
// token/cost logging" requirement and the data source docs/UNIT_ECONOMICS.md
// documents how to query at scale. Bounded to 30 days and 5,000 rows so this
// stays a cheap admin-page read rather than an unbounded table scan as usage
// grows; a real cost-reporting need beyond that should move to a scheduled
// rollup table, not a wider version of this query.
export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const supabase = createServiceRoleClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from("ai_usage_log")
    .select("user_id, task, provider, input_tokens, output_tokens, estimated_cost_usd, cache_hit, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    return NextResponse.json({ message: "Couldn't load AI usage." }, { status: 500 });
  }

  let totalCostUsd = 0;
  let totalCalls = 0;
  let cacheHits = 0;
  const byProvider: Record<string, { calls: number; costUsd: number }> = {};
  const byTask: Record<string, { calls: number; costUsd: number }> = {};
  const byUser: Record<string, { calls: number; costUsd: number }> = {};

  for (const row of rows ?? []) {
    totalCalls += 1;
    if (row.cache_hit) cacheHits += 1;
    const cost = row.estimated_cost_usd ?? 0;
    totalCostUsd += cost;

    byProvider[row.provider] ??= { calls: 0, costUsd: 0 };
    byProvider[row.provider].calls += 1;
    byProvider[row.provider].costUsd += cost;

    byTask[row.task] ??= { calls: 0, costUsd: 0 };
    byTask[row.task].calls += 1;
    byTask[row.task].costUsd += cost;

    if (row.user_id) {
      byUser[row.user_id] ??= { calls: 0, costUsd: 0 };
      byUser[row.user_id].calls += 1;
      byUser[row.user_id].costUsd += cost;
    }
  }

  const topUsers = Object.entries(byUser)
    .sort((a, b) => b[1].costUsd - a[1].costUsd)
    .slice(0, 20)
    .map(([userId, v]) => ({ userId, ...v }));

  return NextResponse.json({
    windowDays: 30,
    totalCalls,
    cacheHitRate: totalCalls ? cacheHits / totalCalls : 0,
    totalCostUsd,
    byProvider,
    byTask,
    topUsers,
  });
}
