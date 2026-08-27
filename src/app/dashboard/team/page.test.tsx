import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/Toast";
import TeamPage from "@/app/dashboard/team/page";

function mockMembership(overrides: Record<string, unknown> = {}) {
  return {
    role: "owner",
    accepted_at: new Date().toISOString(),
    organizations: { id: "org-1", name: "Techtig", owner_id: "user-1" },
    ...overrides,
  };
}

function renderTeamPage() {
  return render(
    <ToastProvider>
      <TeamPage />
    </ToastProvider>
  );
}

describe("team page — accept invite (regression: used to show success unconditionally)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("does not claim success when the accept request actually fails", async () => {
    const pendingMembership = mockMembership({ accepted_at: null, organizations: { id: "org-2", name: "Nova", owner_id: "someone-else" } });
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ memberships: [pendingMembership] }) }) // loadMemberships on mount
      .mockResolvedValueOnce({ ok: true, json: async () => ({ members: [] }) }) // members-list effect, fires once activeOrgId is set
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: "That invite has expired." }) }); // accept fails
    global.fetch = global.fetch as unknown as typeof fetch;

    renderTeamPage();
    await waitFor(() => expect(screen.getByText(/invited to/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /accept/i }));

    await waitFor(() => expect(screen.getByText("That invite has expired.")).toBeInTheDocument());
    expect(screen.queryByText("Invite accepted.")).not.toBeInTheDocument();
  });

  it("does claim success when the accept request genuinely succeeds", async () => {
    const pendingMembership = mockMembership({ accepted_at: null, organizations: { id: "org-2", name: "Nova", owner_id: "someone-else" } });
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ memberships: [pendingMembership] }) }) // loadMemberships on mount
      .mockResolvedValueOnce({ ok: true, json: async () => ({ members: [] }) }) // members-list effect
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) }) // accept succeeds
      .mockResolvedValueOnce({ ok: true, json: async () => ({ memberships: [] }) }); // loadMemberships called again after a successful accept
    global.fetch = global.fetch as unknown as typeof fetch;

    renderTeamPage();
    await waitFor(() => expect(screen.getByText(/invited to/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /accept/i }));

    await waitFor(() => expect(screen.getByText("Invite accepted.")).toBeInTheDocument());
  });
});

describe("team page — remove member (regression: used to have no result check at all)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("reverts the optimistic removal and shows a real error when the request fails", async () => {
    const membership = mockMembership();
    const member = { id: "member-1", role: "member" as const, accepted_at: new Date().toISOString(), invited_email: null, users: { name: "Jordan", email: "jordan@example.com" } };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ memberships: [membership] }) }) // loadMemberships
      .mockResolvedValueOnce({ ok: true, json: async () => ({ members: [member] }) }) // members for active org
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: "Only the owner can remove members." }) }); // remove fails
    global.fetch = global.fetch as unknown as typeof fetch;

    renderTeamPage();
    await waitFor(() => expect(screen.getByText("Jordan")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /remove member/i }));

    // Optimistically removed immediately...
    expect(screen.queryByText("Jordan")).not.toBeInTheDocument();
    // ...but reappears once the failure comes back, with a real error shown.
    await waitFor(() => expect(screen.getByText("Jordan")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Only the owner can remove members.")).toBeInTheDocument());
  });
});
