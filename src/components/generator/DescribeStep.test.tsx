import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/Toast";
import { DescribeStep } from "@/components/generator/DescribeStep";

function renderStep(overrides: Partial<Parameters<typeof DescribeStep>[0]> = {}) {
  const props = { onSubmit: vi.fn(), onSubmitUrl: vi.fn(), onUseTemplate: vi.fn(), submitting: false, ...overrides };
  render(
    <ToastProvider>
      <DescribeStep {...props} />
    </ToastProvider>
  );
  return props;
}

function goToDescribeStep() {
  fireEvent.click(screen.getByText("Agency"));
  fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
}

function fillDescribeStep(name: string, description: string) {
  fireEvent.change(screen.getByPlaceholderText("e.g. Nova Agency"), { target: { value: name } });
  fireEvent.change(screen.getByPlaceholderText(/Create a modern website/), { target: { value: description } });
}

function goToPagesStep(name: string, description: string) {
  goToDescribeStep();
  fillDescribeStep(name, description);
  fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
}

function goToThemeStep(name: string, description: string) {
  goToPagesStep(name, description);
  fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
}

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ templates: [] }) }) as unknown as typeof fetch;
});

describe("DescribeStep — Category step", () => {
  it("disables Next until a category is chosen", () => {
    renderStep();
    expect(screen.getByRole("button", { name: /^next$/i })).toBeDisabled();
    fireEvent.click(screen.getByText("Restaurant"));
    expect(screen.getByRole("button", { name: /^next$/i })).not.toBeDisabled();
  });
});

describe("DescribeStep — Describe step", () => {
  it("disables Next until both name and description are filled in", () => {
    renderStep();
    goToDescribeStep();
    expect(screen.getByRole("button", { name: /^next$/i })).toBeDisabled();
    fillDescribeStep("Nova", "A digital agency.");
    expect(screen.getByRole("button", { name: /^next$/i })).not.toBeDisabled();
  });

  it("hides the advanced options fields until the toggle is clicked", () => {
    renderStep();
    goToDescribeStep();
    expect(screen.queryByPlaceholderText(/small business owners/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/advanced options/i));
    expect(screen.getByPlaceholderText(/small business owners/i)).toBeInTheDocument();
  });
});

describe("DescribeStep — Pages step", () => {
  it("always includes Home and folds selected/custom pages into the description as an exact list", () => {
    const onSubmit = vi.fn();
    renderStep({ onSubmit });
    goToPagesStep("Nova", "A digital agency.");

    // Defaults: Home + About + Contact
    fireEvent.click(screen.getByRole("button", { name: "Services" })); // add Services
    fireEvent.change(screen.getByPlaceholderText("e.g. Careers"), { target: { value: "Careers" } });
    fireEvent.click(screen.getByRole("button", { name: "Add page" }));
    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
    fireEvent.click(screen.getByRole("button", { name: /generate website/i }));

    const [, description] = onSubmit.mock.calls[0];
    expect(description).toContain("exactly these pages:");
    expect(description).toContain("Home");
    expect(description).toContain("About");
    expect(description).toContain("Contact");
    expect(description).toContain("Services");
    expect(description).toContain("Careers");
  });

  it("removes a custom page when its remove button is clicked", () => {
    const onSubmit = vi.fn();
    renderStep({ onSubmit });
    goToPagesStep("Nova", "A digital agency.");
    fireEvent.change(screen.getByPlaceholderText("e.g. Careers"), { target: { value: "Careers" } });
    fireEvent.click(screen.getByRole("button", { name: "Add page" }));
    expect(screen.getByText("Careers")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove Careers" }));
    expect(screen.queryByText("Careers")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
    fireEvent.click(screen.getByRole("button", { name: /generate website/i }));
    const [, description] = onSubmit.mock.calls[0];
    expect(description).not.toContain("Careers");
  });
});

describe("DescribeStep — Theme step", () => {
  it("submits real FollowUpAnswers fields (websiteType from the chosen category, style, colorPreference)", async () => {
    const onSubmit = vi.fn();
    renderStep({ onSubmit });
    goToThemeStep("Nova", "A digital agency.");

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/^style$/i), { target: { value: "Modern" } });
    fireEvent.change(screen.getByLabelText(/color preference/i), { target: { value: "Blue" } });
    fireEvent.click(screen.getByRole("button", { name: /generate website/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      "Nova",
      expect.stringContaining("A digital agency."),
      { websiteType: "Agency", style: "Modern", colorPreference: "Blue" }
    );
  });

  it("calls onUseTemplate instead of onSubmit when a template card is selected", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({
        templates: [
          { id: "11111111-1111-1111-1111-111111111111", name: "Nova Template", category: "Agency", description: "desc", tags: [], style: "modern", industry: null, tierRequired: "free", thumbnail: null, isFeatured: true, useCount: 0, createdAt: new Date().toISOString(), isFavorited: false },
        ],
      }),
    });
    const onSubmit = vi.fn();
    const onUseTemplate = vi.fn();
    renderStep({ onSubmit, onUseTemplate });
    goToThemeStep("Nova", "A digital agency.");

    await waitFor(() => expect(screen.getByText("Nova Template")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Preview Nova Template" }));
    fireEvent.click(screen.getByRole("button", { name: /use this template/i }));

    expect(onUseTemplate).toHaveBeenCalledWith("11111111-1111-1111-1111-111111111111");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("DescribeStep — Generate from URL mode", () => {
  it("still supports the existing Generate from URL mode, unaffected by the wizard steps", () => {
    const onSubmitUrl = vi.fn();
    renderStep({ onSubmitUrl });

    fireEvent.click(screen.getByText("Generate from URL"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Bloom & Co."), { target: { value: "Bloom" } });
    fireEvent.change(screen.getByPlaceholderText("https://example.com"), { target: { value: "https://bloom.example" } });
    const matches = screen.getAllByRole("button", { name: /generate from url/i });
    fireEvent.click(matches[matches.length - 1]);

    expect(onSubmitUrl).toHaveBeenCalledWith("Bloom", "https://bloom.example");
  });
});
