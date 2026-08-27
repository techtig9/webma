import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileNav } from "@/components/dashboard/MobileNav";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard"),
}));

describe("MobileNav", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("is closed by default — the drawer's nav items aren't in the DOM until opened", () => {
    render(<MobileNav isAdmin={false} />);
    expect(screen.queryByText("Projects")).not.toBeInTheDocument();
  });

  it("opens the drawer and shows the same navigation items the desktop sidebar has", () => {
    render(<MobileNav isAdmin={false} />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Templates")).toBeInTheDocument();
    expect(screen.getByText("Assets")).toBeInTheDocument();
    expect(screen.getByText("Billing")).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
  });

  it("includes Admin Panel only when isAdmin is true, matching the desktop sidebar's own rule", () => {
    const { rerender } = render(<MobileNav isAdmin={false} />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();

    rerender(<MobileNav isAdmin={true} />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
  });

  it("closes when the backdrop is clicked", () => {
    render(<MobileNav isAdmin={false} />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(screen.getByText("Projects")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /close menu/i })[0]);
    expect(screen.queryByText("Projects")).not.toBeInTheDocument();
  });

  it("closes when a navigation link inside the drawer is clicked", () => {
    render(<MobileNav isAdmin={false} />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(screen.getByText("Projects")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Projects"));
    expect(screen.queryByText("Templates")).not.toBeInTheDocument();
  });

  it("locks body scroll while open and restores it when closed", () => {
    render(<MobileNav isAdmin={false} />);
    expect(document.body.style.overflow).toBe("");

    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(screen.getAllByRole("button", { name: /close menu/i })[0]);
    expect(document.body.style.overflow).toBe("");
  });

  it("only ever renders within a container hidden at md and above, so it never overlaps the real desktop sidebar", () => {
    const { container } = render(<MobileNav isAdmin={false} />);
    expect(container.querySelector(".md\\:hidden")).toBeInTheDocument();
  });
});
