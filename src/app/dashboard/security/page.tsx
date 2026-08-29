import { MfaSection } from "@/components/dashboard/MfaSection";
import { DeployConnectionsSection } from "@/components/dashboard/DeployConnectionsSection";
import { Reveal } from "@/components/ui/Reveal";

export default function SecurityPage() {
  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Security</h1>
        <p className="mt-1 text-sm text-ink/50">Two-factor authentication and connected deploy accounts.</p>
      </div>

      <MfaSection />
      <Reveal delay={120}>
        <DeployConnectionsSection />
      </Reveal>
    </div>
  );
}
