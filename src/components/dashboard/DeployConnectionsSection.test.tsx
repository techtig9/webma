import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/Toast";
import { DeployConnectionsSection } from "@/components/dashboard/DeployConnectionsSection";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

function renderSection() {
  return render(
    <ToastProvider>
      <DeployConnectionsSection />
    </ToastProvider>
  );
}

describe("DeployConnectionsSection — disconnect (regression: only caught thrown exceptions, not a non-2xx response)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("does not claim success when the disconnect request returns a non-2xx response", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ connections: [{ provider: "vercel", provider_account_email: "me@example.com", created_at: "2026-01-01" }] }) }) // status on mount
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: "Session expired." }) }); // disconnect fails, doesn't throw
    global.fetch = global.fetch as unknown as typeof fetch;

    renderSection();
    await waitFor(() => expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));

    await waitFor(() => expect(screen.getByText("Session expired.")).toBeInTheDocument());
    expect(screen.queryByText("Vercel disconnected.")).not.toBeInTheDocument();
    // Still shows as connected — the UI never falsely cleared the connection.
    expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
  });

  it("does claim success when the disconnect request genuinely succeeds", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ connections: [{ provider: "vercel", provider_account_email: "me@example.com", created_at: "2026-01-01" }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    global.fetch = global.fetch as unknown as typeof fetch;

    renderSection();
    await waitFor(() => expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));

    await waitFor(() => expect(screen.getByText("Vercel disconnected.")).toBeInTheDocument());
  });
});
