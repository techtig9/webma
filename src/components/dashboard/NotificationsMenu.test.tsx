import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationsMenu } from "@/components/dashboard/NotificationsMenu";

describe("NotificationsMenu", () => {
  it("is closed by default", () => {
    render(<NotificationsMenu />);
    expect(screen.queryByText("No notifications yet.")).not.toBeInTheDocument();
  });

  it("opens on click and shows an honest empty state rather than fake content", () => {
    render(<NotificationsMenu />);
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.getByText("No notifications yet.")).toBeInTheDocument();
  });

  it("never renders a permanent unread indicator, since nothing generates a real notification event yet", () => {
    // Guards against the exact bug this replaces: the old bell rendered a
    // permanent "unread" dot regardless of whether anything had happened.
    const { container } = render(<NotificationsMenu />);
    expect(container.querySelector(".bg-violet")).not.toBeInTheDocument();
  });

  it("closes when clicking outside", () => {
    render(
      <div>
        <NotificationsMenu />
        <div data-testid="outside">Outside</div>
      </div>
    );
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.getByText("No notifications yet.")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByText("No notifications yet.")).not.toBeInTheDocument();
  });

  it("toggles closed when the bell is clicked again", () => {
    render(<NotificationsMenu />);
    const button = screen.getByRole("button", { name: /notifications/i });
    fireEvent.click(button);
    expect(screen.getByText("No notifications yet.")).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.queryByText("No notifications yet.")).not.toBeInTheDocument();
  });
});
