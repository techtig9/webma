import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/Toast";
import { TemplateCard } from "@/components/dashboard/TemplateCard";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function renderCard(overrides: Partial<Parameters<typeof TemplateCard>[0]> = {}) {
  const props = { id: "t1", name: "Nova Agency", tierRequired: "pro", thumbnail: null, locked: false, ...overrides };
  return render(
    <ToastProvider>
      <TemplateCard {...props} />
    </ToastProvider>
  );
}

describe("TemplateCard", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("shows a fallback icon instead of a broken image when there is no thumbnail", () => {
    const { container } = renderCard({ thumbnail: null });
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("renders a real image element when a thumbnail URL is provided", () => {
    const { container } = renderCard({ thumbnail: "https://example.supabase.co/storage/v1/nova.png" });
    expect(container.querySelector("img")).toBeInTheDocument();
  });

  it("does not call the use-template endpoint when the card is locked", () => {
    global.fetch = vi.fn();
    renderCard({ locked: true });
    fireEvent.click(screen.getByRole("button"));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("is disabled when locked", () => {
    renderCard({ locked: true });
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls /api/templates/use with the template id and navigates to the new project on success", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ projectId: "proj-123" }) }) as unknown as typeof fetch;
    renderCard({ id: "t1", locked: false });
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/generator?project=proj-123"));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/templates/use",
      expect.objectContaining({ body: JSON.stringify({ templateId: "t1" }) })
    );
  });

  it("shows an error and does not navigate when the server rejects the request", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Upgrade your plan to use this template." }),
    }) as unknown as typeof fetch;
    renderCard({ locked: false });
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(screen.getByText("Upgrade your plan to use this template.")).toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
  });
});
