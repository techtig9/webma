import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveAndCheckpoint } from "@/lib/save-checkpoint";

describe("saveAndCheckpoint", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls /api/projects/save with the given project id, files, and pages", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchSpy as unknown as typeof fetch;

    await saveAndCheckpoint("proj-1", { "components/Hero.tsx": "code" }, [
      { slug: "index", path: "/", name: "Home", sections: ["Hero"] },
    ]);

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/projects/save",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          projectId: "proj-1",
          files: { "components/Hero.tsx": "code" },
          pages: [{ slug: "index", path: "/", name: "Home", sections: ["Hero"] }],
        }),
      })
    );
  });

  it("calls /api/projects/checkpoint only after the save succeeds — the exact ordering bug this fix depends on", async () => {
    const callOrder: string[] = [];
    const fetchSpy = vi.fn((url: string) => {
      callOrder.push(url);
      return Promise.resolve({ ok: true });
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    await saveAndCheckpoint("proj-1", {}, []);
    // Give the fire-and-forget checkpoint call's microtask a tick to fire.
    await new Promise((r) => setTimeout(r, 0));

    expect(callOrder).toEqual(["/api/projects/save", "/api/projects/checkpoint"]);
  });

  it("returns saved: true when the save succeeds", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
    const result = await saveAndCheckpoint("proj-1", {}, []);
    expect(result.saved).toBe(true);
  });

  it("returns saved: false and does not attempt a checkpoint at all when the save itself fails", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: false });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await saveAndCheckpoint("proj-1", {}, []);
    await new Promise((r) => setTimeout(r, 0));

    expect(result.saved).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // save only, never checkpoint
  });

  it("does not throw and still reports the save as successful when the checkpoint call itself fails", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({ ok: true }) // save succeeds
      .mockRejectedValueOnce(new Error("checkpoint network error")); // checkpoint fails
    global.fetch = fetchSpy as unknown as typeof fetch;
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(saveAndCheckpoint("proj-1", {}, [])).resolves.toEqual({ saved: true });
    await new Promise((r) => setTimeout(r, 0));

    expect(consoleSpy).toHaveBeenCalled();
  });

  it("passes the projectId and a reason to the checkpoint call", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchSpy as unknown as typeof fetch;

    await saveAndCheckpoint("proj-1", {}, []);
    await new Promise((r) => setTimeout(r, 0));

    const checkpointCall = fetchSpy.mock.calls.find((c) => c[0] === "/api/projects/checkpoint");
    expect(checkpointCall).toBeDefined();
    expect(JSON.parse(checkpointCall![1].body)).toEqual({ projectId: "proj-1", reason: "Manual save" });
  });
});
