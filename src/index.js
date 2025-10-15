export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const requiredEnv = [
      "STORJ_ACCESS_KEY",
      "STORJ_SECRET_KEY",
      "STORJ_ENDPOINT",
      "STORJ_BUCKET",
    ];

    const missing = requiredEnv.filter((key) => !env?.[key]);
    if (missing.length > 0) {
      return Response.json(
        {
          error: "Configuration invalide",
          message: `Variables d'environnement manquantes: ${missing.join(", ")}`,
        },
        { status: 500 }
      );
    }

    const headers = {
      Authorization:
        "Basic " + btoa(`${env.STORJ_ACCESS_KEY}:${env.STORJ_SECRET_KEY}`),
      "x-amz-bucket-region": env.STORJ_REGION ?? "eu1",
    };

    if (pathname === "/") {
      return Response.json({
        message:
          "Obsidian MCP Worker opérationnel. Utilisez /listNotes, /readNote (POST) ou /writeNote (POST).",
      });
    }

    if (pathname === "/listNotes") {
      try {
        const resp = await fetch(
          `${env.STORJ_ENDPOINT}/${env.STORJ_BUCKET}?list-type=2&prefix=${env.STORJ_PREFIX ?? ""}`,
          { headers }
        );
        if (!resp.ok) {
          const body = await resp.text();
          return Response.json(
            {
              error: "Echec de la récupération des notes",
              status: resp.status,
              details: body,
            },
            { status: 502 }
          );
        }
        const xml = await resp.text();
        const files = Array.from(xml.matchAll(/<Key>([^<]+\.md)<\/Key>/g)).map(
          (m) => m[1]
        );
        return Response.json({ files });
      } catch (error) {
        return Response.json(
          {
            error: "Exception lors du listage des notes",
            message: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        );
      }
    }

    if (pathname === "/readNote" && request.method === "POST") {
      const { filename } = await request.json();
      const key = `${filename}`;
      const resp = await fetch(`${env.STORJ_ENDPOINT}/${env.STORJ_BUCKET}/${key}`, { headers });
      const content = await resp.text();
      return Response.json({ content });
    }

    if (pathname === "/writeNote" && request.method === "POST") {
      const { filename, content } = await request.json();
      const key = `${filename}`;
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
