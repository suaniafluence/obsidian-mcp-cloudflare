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

test("connects to Storj with provided credentials", async (t) => {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    t.skip(`Variables d'environnement manquantes: ${missing.join(", ")}`);
    return;
  }

  const endpoint = process.env.STORJ_ENDPOINT.replace(/\/+$/, "");
  const bucket = process.env.STORJ_BUCKET.replace(/^\/+/, "");
  const prefix = (process.env.STORJ_PREFIX ?? "").replace(/^\/+/, "");
  const region = process.env.STORJ_REGION ?? "eu1";

  const query = new URLSearchParams({ "list-type": "2" });
  if (prefix) {
    query.set("prefix", prefix);
  }

  const url = `${endpoint}/${bucket}?${query.toString()}`;
  const response = await fetch(url, {
    headers: {
      Authorization: buildAuthHeader(
        process.env.STORJ_ACCESS_KEY,
        process.env.STORJ_SECRET_KEY
      ),
      "x-amz-bucket-region": region,
    },
  });

  assert.notEqual(response.status, 401, "Autorisation Storj échouée (401)");
  assert.notEqual(response.status, 403, "Accès Storj interdit (403)");
  assert.ok(
    response.ok,
    `Échec de la requête Storj, statut ${response.status}`
  );
});
