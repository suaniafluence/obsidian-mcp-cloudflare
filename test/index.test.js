import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const baseEnv = {
  STORJ_ENDPOINT: "https://example.com",
  STORJ_BUCKET: "bucket",
  STORJ_PREFIX: "notes",
  STORJ_ACCESS_KEY: "access",
  STORJ_SECRET_KEY: "secret",
  STORJ_REGION: "eu1",
};

const buildRequest = (path, init) =>
  new Request(`https://worker.example${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });

const createFetchMock = (...responses) => {
  const originalFetch = globalThis.fetch;
  const queue = [...responses];
  const calls = [];

  globalThis.fetch = async (...args) => {
    calls.push(args);
    if (queue.length === 0) {
      throw new Error("No mocked response provided for fetch call");
    }
    return queue.shift();
  };

  return {
    calls,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
};

globalThis.btoa = (value) => Buffer.from(value, "binary").toString("base64");

test("lists markdown notes from the Storj bucket", async () => {
  const xmlListing = `<?xml version="1.0"?>\n<ListBucketResult>\n  <Contents><Key>notes/foo.md</Key></Contents>\n  <Contents><Key>notes/bar.txt</Key></Contents>\n  <Contents><Key>notes/baz.md</Key></Contents>\n</ListBucketResult>`;

  const fetchMock = createFetchMock(new Response(xmlListing));

  try {
    const response = await worker.fetch(buildRequest("/listNotes"), baseEnv);

    assert.equal(fetchMock.calls.length, 1);
    const [url, init] = fetchMock.calls[0];
    assert.equal(url, "https://example.com/bucket?list-type=2&prefix=notes");
    assert.ok(init.headers, "Expected headers to be passed to fetch");
    assert.equal(init.headers["x-amz-bucket-region"], "eu1");

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.deepEqual(payload, { files: ["notes/foo.md", "notes/baz.md"] });
  } finally {
    fetchMock.restore();
  }
});

test("reads an individual note from Storj", async () => {
  const fetchMock = createFetchMock(new Response("## Note content"));

  try {
    const response = await worker.fetch(
      buildRequest("/readNote", {
        method: "POST",
        body: JSON.stringify({ filename: "foo.md" }),
      }),
      baseEnv
    );

    assert.equal(fetchMock.calls.length, 1);
    const [url, init] = fetchMock.calls[0];
    assert.equal(url, "https://example.com/bucket/notes/foo.md");
    assert.ok(init.headers, "Expected headers to be passed to fetch");

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.deepEqual(payload, { content: "## Note content" });
  } finally {
    fetchMock.restore();
  }
});

test("writes a note back to Storj", async () => {
  const fetchMock = createFetchMock(new Response(null, { status: 200 }));

  try {
    const response = await worker.fetch(
      buildRequest("/writeNote", {
        method: "POST",
        body: JSON.stringify({ filename: "foo.md", content: "Hello" }),
      }),
      baseEnv
    );

    assert.equal(fetchMock.calls.length, 1);
    const [url, init] = fetchMock.calls[0];
    assert.equal(url, "https://example.com/bucket/notes/foo.md");
    assert.equal(init.method, "PUT");
    assert.ok(init.headers, "Expected headers to be passed to fetch");
    assert.match(init.headers.Authorization, /^Basic /);
    assert.equal(init.headers["Content-Type"], "text/markdown");
    assert.equal(init.body, "Hello");

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.deepEqual(payload, { success: true, message: "foo.md sauvegardée." });
  } finally {
    fetchMock.restore();
  }
});

test("returns a helpful message on the root route", async () => {
  const response = await worker.fetch(buildRequest("/"), baseEnv);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload, {
    message:
      "Obsidian MCP Worker opérationnel. Utilisez /listNotes, /readNote (POST) ou /writeNote (POST).",
  });
});

test("returns 404 for unknown routes", async () => {
  const response = await worker.fetch(buildRequest("/unknown"), baseEnv);
  assert.equal(response.status, 404);
  const payload = await response.json();
  assert.deepEqual(payload, { error: "Route inconnue" });
});
