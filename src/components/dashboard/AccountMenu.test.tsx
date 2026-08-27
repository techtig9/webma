import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AccountMenu } from "@/components/dashboard/AccountMenu";

const signOut = vi.fn().mockResolvedValue({ error: null });
const push = vi.fn();
const refresh = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut } }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("AccountMenu", () => {
  beforeEach(() => {
    signOut.mockClear();
    push.mockClear();
    refresh.mockClear();
  });

  it("is closed by default — the menu content isn't in the DOM until opened", () => {
    render(<AccountMenu name="Jordan" email="jordan@example.com" />);
    expect(screen.queryByText("jordan@example.com")).not.toBeInTheDocument();
  });

  it("opens on click and shows the real account options", () => {
    render(<AccountMenu name="Jordan" email="jordan@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));

    expect(screen.getByText("jordan@example.com")).toBeInTheDocument();
    expect(screen.getByText("Account details")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Log out")).toBeInTheDocument();
  });

  it("closes when clicking outside the menu", () => {
    render(
      <div>
        <AccountMenu name="Jordan" email="jordan@example.com" />
        <div data-testid="outside">Outside</div>
      </div>
    );
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByText("jordan@example.com")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByText("jordan@example.com")).not.toBeInTheDocument();
  });

  it("calls the real Supabase signOut and redirects to /login on Log out", async () => {
    render(<AccountMenu name="Jordan" email="jordan@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));
    fireEvent.click(screen.getByText("Log out"));

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith("/login");
    expect(refresh).toHaveBeenCalled();
  });

  it("links to the real account and settings routes", () => {
    render(<AccountMenu name="Jordan" email="jordan@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: /account menu/i }));

    expect(screen.getByText("Account details").closest("a")).toHaveAttribute("href", "/dashboard/profile");
    expect(screen.getByText("Settings").closest("a")).toHaveAttribute("href", "/dashboard/settings");
  });
});
