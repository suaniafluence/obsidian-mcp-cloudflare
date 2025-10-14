export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const headers = {
      Authorization:
        "Basic " + btoa(`${env.STORJ_ACCESS_KEY}:${env.STORJ_SECRET_KEY}`),
    };

    if (pathname === "/listNotes") {
      const resp = await fetch(
        `${env.STORJ_ENDPOINT}/${env.STORJ_BUCKET}?list-type=2&prefix=${env.STORJ_PREFIX}`,
        { headers }
      );
      const xml = await resp.text();
      const files = Array.from(xml.matchAll(/<Key>([^<]+\.md)<\/Key>/g)).map(
        (m) => m[1]
      );
      return Response.json({ files });
    }

    if (pathname === "/readNote" && request.method === "POST") {
      const { filename } = await request.json();
      const key = `${env.STORJ_PREFIX}/${filename}`;
      const resp = await fetch(`${env.STORJ_ENDPOINT}/${env.STORJ_BUCKET}/${key}`, { headers });
      const content = await resp.text();
      return Response.json({ content });
    }

    if (pathname === "/writeNote" && request.method === "POST") {
      const { filename, content } = await request.json();
      const key = `${env.STORJ_PREFIX}/${filename}`;
      await fetch(`${env.STORJ_ENDPOINT}/${env.STORJ_BUCKET}/${key}`, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "text/markdown",
        },
        body: content,
      });
      return Response.json({ success: true, message: `${filename} sauvegardée.` });
    }

    return Response.json({ error: "Route inconnue" }, { status: 404 });
  },
};
