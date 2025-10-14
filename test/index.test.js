import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import worker from "../src/index.js";

const baseEnv = {
  STORJ_ENDPOINT: "https://example.com",
  STORJ_BUCKET: "bucket",
  STORJ_PREFIX: "notes",
  STORJ_ACCESS_KEY: "access",
  STORJ_SECRET_KEY: "secret",
};

const buildRequest = (path, init) =>
  new Request(`https://worker.example${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });

beforeEach(() => {
  globalThis.btoa = (value) => Buffer.from(value, "binary").toString("base64");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Cloudflare Worker routes", () => {
  it("lists markdown notes from the Storj bucket", async () => {
    const xmlListing = `<?xml version="1.0"?>\n<ListBucketResult>\n  <Contents><Key>notes/foo.md</Key></Contents>\n  <Contents><Key>notes/bar.txt</Key></Contents>\n  <Contents><Key>notes/baz.md</Key></Contents>\n</ListBucketResult>`;

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(xmlListing));

    const response = await worker.fetch(buildRequest("/listNotes"), baseEnv);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/bucket?list-type=2&prefix=notes",
      expect.objectContaining({ headers: expect.any(Object) })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ files: ["notes/foo.md", "notes/baz.md"] });
  });

  it("reads an individual note from Storj", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("## Note content"));

    const response = await worker.fetch(
      buildRequest("/readNote", {
        method: "POST",
        body: JSON.stringify({ filename: "foo.md" }),
      }),
      baseEnv
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/bucket/notes/foo.md",
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ content: "## Note content" });
  });

  it("writes a note back to Storj", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 200 }));

    const response = await worker.fetch(
      buildRequest("/writeNote", {
        method: "POST",
        body: JSON.stringify({ filename: "foo.md", content: "Hello" }),
      }),
      baseEnv
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/bucket/notes/foo.md",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
          "Content-Type": "text/markdown",
        }),
        body: "Hello",
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, message: "foo.md sauvegardée." });
  });

  it("returns 404 for unknown routes", async () => {
    const response = await worker.fetch(buildRequest("/unknown"), baseEnv);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Route inconnue" });
  });
});
