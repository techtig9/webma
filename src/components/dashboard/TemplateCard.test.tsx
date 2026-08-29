import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TemplateCard } from "@/components/dashboard/TemplateCard";

function renderCard(overrides: Partial<Parameters<typeof TemplateCard>[0]> = {}) {
  const onOpenPreview = vi.fn();
  const onToggleFavorite = vi.fn();
  const props = {
    id: "t1",
    name: "Nova Agency",
    tierRequired: "pro",
    thumbnail: null,
    locked: false,
    onOpenPreview,
    onToggleFavorite,
    ...overrides,
  };
  const utils = render(<TemplateCard {...props} />);
  return { ...utils, onOpenPreview, onToggleFavorite };
}

describe("TemplateCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a fallback icon instead of a broken image when there is no thumbnail", () => {
    const { container } = renderCard({ thumbnail: null });
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("renders a real image element when a thumbnail URL is provided", () => {
    const { container } = renderCard({ thumbnail: "https://example.supabase.co/storage/v1/nova.png" });
    expect(container.querySelector("img")).toBeInTheDocument();
  });

  it("clicking the card opens the preview, whether locked or not — locking only blocks USING a template, not previewing it", () => {
    const { onOpenPreview } = renderCard({ locked: true });
    fireEvent.click(screen.getByRole("button", { name: /preview/i }));
    expect(onOpenPreview).toHaveBeenCalledWith("t1");
  });

  it("clicking the card when unlocked also opens the preview (using it is now a modal action, not an immediate card click)", () => {
    const { onOpenPreview } = renderCard({ id: "t1", locked: false });
    fireEvent.click(screen.getByRole("button", { name: /preview/i }));
    expect(onOpenPreview).toHaveBeenCalledWith("t1");
  });

  it("shows a lock indicator when locked", () => {
    renderCard({ locked: true });
    expect(screen.getByLabelText(/preview/i).textContent).toBeDefined();
  });

  it("clicking the favorite button toggles favorite without opening the preview", () => {
    const { onOpenPreview, onToggleFavorite } = renderCard({ id: "t1", isFavorited: false });
    fireEvent.click(screen.getByRole("button", { name: /add to favorites/i }));
    expect(onToggleFavorite).toHaveBeenCalledWith("t1");
    expect(onOpenPreview).not.toHaveBeenCalled();
  });

  it("shows a filled heart and 'remove from favorites' label when already favorited", () => {
    renderCard({ isFavorited: true });
    expect(screen.getByRole("button", { name: /remove from favorites/i })).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    renderCard({ description: "A bold, modern agency starter." });
    expect(screen.getByText("A bold, modern agency starter.")).toBeInTheDocument();
  });
});
