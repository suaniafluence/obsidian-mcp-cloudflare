import { test } from "node:test";
import assert from "node:assert/strict";

const REQUIRED_ENV = [
  "STORJ_ENDPOINT",
  "STORJ_BUCKET",
  "STORJ_ACCESS_KEY",
  "STORJ_SECRET_KEY",
];

const buildAuthHeader = (accessKey, secretKey) =>
  `Basic ${Buffer.from(`${accessKey}:${secretKey}`, "utf8").toString("base64")}`;

const listBucketObjects = async ({
  STORJ_ENDPOINT,
  STORJ_BUCKET,
  STORJ_PREFIX = "",
  STORJ_ACCESS_KEY,
  STORJ_SECRET_KEY,
  STORJ_REGION = "eu1",
}) => {
  const endpoint = STORJ_ENDPOINT.replace(/\/+$/, "");
  const bucket = STORJ_BUCKET.replace(/^\/+/, "");
  const prefix = STORJ_PREFIX.replace(/^\/+/, "");

  const query = new URLSearchParams({ "list-type": "2" });
  if (prefix) {
    query.set("prefix", prefix);
  }

  const url = `${endpoint}/${bucket}?${query.toString()}`;
  const response = await fetch(url, {
    headers: {
      Authorization: buildAuthHeader(STORJ_ACCESS_KEY, STORJ_SECRET_KEY),
      "x-amz-bucket-region": STORJ_REGION,
    },
  });

  return { url, response };
};

test("connects to Storj with provided credentials", async (t) => {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    t.diagnostic(
      `Variables d'environnement manquantes: ${missing.join(", ")}. ` +
        "Utilisation d'une simulation pour vérifier la requête envoyée."
    );

    const mockEnv = {
      STORJ_ENDPOINT: "https://example.com",
      STORJ_BUCKET: "bucket",
      STORJ_PREFIX: "notes",
      STORJ_ACCESS_KEY: "access",
      STORJ_SECRET_KEY: "secret",
      STORJ_REGION: "eu1",
    };

    const mockResponse = new Response("<ListBucketResult></ListBucketResult>", {
      status: 200,
    });

    const fetchMock = t.mock.method(globalThis, "fetch", async (url, init) => {
      assert.equal(url, "https://example.com/bucket?list-type=2&prefix=notes");
      assert.ok(init.headers, "Les en-têtes doivent être fournis à fetch");
      assert.match(
        init.headers.Authorization,
        /^Basic /,
        "L'en-tête Authorization doit utiliser Basic Auth"
      );
      assert.equal(
        init.headers["x-amz-bucket-region"],
        "eu1",
        "La région Storj doit être transmise"
      );
      return mockResponse;
    });

    try {
      const { url, response } = await listBucketObjects(mockEnv);
      assert.equal(url, "https://example.com/bucket?list-type=2&prefix=notes");
      assert.equal(fetchMock.mock.callCount(), 1);
      assert.strictEqual(response, mockResponse);
    } finally {
      fetchMock.mock.restore();
    }

    return;
  }

  const { response } = await listBucketObjects({
    STORJ_ENDPOINT: process.env.STORJ_ENDPOINT,
    STORJ_BUCKET: process.env.STORJ_BUCKET,
    STORJ_PREFIX: process.env.STORJ_PREFIX,
    STORJ_ACCESS_KEY: process.env.STORJ_ACCESS_KEY,
    STORJ_SECRET_KEY: process.env.STORJ_SECRET_KEY,
    STORJ_REGION: process.env.STORJ_REGION ?? "eu1",
  });

  assert.notEqual(response.status, 401, "Autorisation Storj échouée (401)");
  assert.notEqual(response.status, 403, "Accès Storj interdit (403)");
  assert.ok(
    response.ok,
    `Échec de la requête Storj, statut ${response.status}`
  );
});
