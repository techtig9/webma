import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topnav } from "@/components/dashboard/Topnav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from("users").select("name, role").eq("id", user.id).single(),
    supabase.from("subscriptions").select("plan, credits_remaining").eq("user_id", user.id).single(),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Topnav
          name={profile?.name ?? user.email ?? "User"}
          plan={profile?.role === "admin" ? "admin" : subscription?.plan ?? "free"}
          creditsRemaining={profile?.role === "admin" ? Infinity : subscription?.credits_remaining ?? 0}
        />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
