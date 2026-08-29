import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { organizationId, memberId } = (await request.json().catch(() => ({}))) as {
    organizationId?: string;
    memberId?: string;
  };
  if (!organizationId || !memberId) {
    return NextResponse.json({ message: "organizationId and memberId are required." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: org } = await supabase.from("organizations").select("owner_id").eq("id", organizationId).single();
  // Scoped to organizationId, not just memberId — otherwise an owner of one
  // organization who obtains a member-row UUID belonging to a DIFFERENT
  // organization (e.g. via another endpoint, a log, a referral link) could
  // remove that person from an org they have no relationship to at all.
  const { data: targetMember } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .single();

  if (!targetMember) {
    return NextResponse.json({ message: "Member not found in this organization." }, { status: 404 });
  }

  const isOwner = org?.owner_id === user!.id;
  const isSelf = targetMember.user_id === user!.id;
  if (!isOwner && !isSelf) {
    return NextResponse.json({ message: "Only the owner can remove other members." }, { status: 403 });
  }
  if (isSelf && isOwner) {
    return NextResponse.json({ message: "The owner can't leave — delete the organization instead." }, { status: 400 });
  }

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId)
    .eq("organization_id", organizationId);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
