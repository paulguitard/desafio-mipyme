/**
 * Login as admin and POST agregarPregunta server action against the live Next server.
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const FORM_ID = process.argv[2] ?? "cmtx7u0lv000lorrc8kssbxv5";
const ACTION_ID = "40f4e7a7b973c0337e1d74d58a0e6c203c3aab96f2"; // agregarPregunta from compiled chunk

function cookieJar(res: Response, jar: Map<string, string>) {
  const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const c of raw) {
    const [pair] = c.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  // fallback single set-cookie
  const single = res.headers.get("set-cookie");
  if (single && raw.length === 0) {
    const [pair] = single.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
}

function cookieHeader(jar: Map<string, string>) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function main() {
  const jar = new Map<string, string>();

  // 1) CSRF / session bootstrap
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  cookieJar(csrfRes, jar);
  const csrfJson = (await csrfRes.json()) as { csrfToken: string };
  console.log("csrf ok", Boolean(csrfJson.csrfToken));

  // 2) Credentials callback
  const loginBody = new URLSearchParams({
    csrfToken: csrfJson.csrfToken,
    email: "admin@test.com",
    password: "bitacora",
    expectedRole: "ADMIN",
    callbackUrl: `${BASE}/admin`,
    json: "true",
  });

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(jar),
    },
    body: loginBody,
    redirect: "manual",
  });
  cookieJar(loginRes, jar);
  const loginText = await loginRes.text();
  console.log("login status", loginRes.status);
  console.log("login body (trunc)", loginText.slice(0, 300));
  console.log("cookies", [...jar.keys()]);

  // 3) Load formulario page to confirm session + maybe refresh action id
  const pageRes = await fetch(`${BASE}/admin/formularios/${FORM_ID}`, {
    headers: { Cookie: cookieHeader(jar) },
    redirect: "manual",
  });
  cookieJar(pageRes, jar);
  const pageHtml = await pageRes.text();
  console.log("form page status", pageRes.status, "len", pageHtml.length);
  if (pageRes.status >= 300 && pageRes.status < 400) {
    console.log("redirect to", pageRes.headers.get("location"));
  }

  const actionMatch = pageHtml.match(/40f4e7a7b973c0337e1d74d58a0e6c203c3aab96f2/);
  const anyAction = pageHtml.match(/\$ACTION_ID_([a-f0-9]+)/g);
  console.log("action id present in HTML?", Boolean(actionMatch));
  console.log("sample ACTION_IDs", (anyAction ?? []).slice(0, 5));

  // 4) POST server action as FormData (Next.js accepts multipart for server actions)
  const fd = new FormData();
  fd.set("1_$ACTION_ID_" + ACTION_ID, "");
  // Actually Next 15+ uses a different encoding. Try classic Next-Action header + form fields.
  const fd2 = new FormData();
  fd2.set("formularioId", FORM_ID);
  fd2.set("enunciado", "HTTP repro pregunta " + Date.now());
  fd2.set("ayuda", "texto de ayuda");
  fd2.set("tipo", "texto_corto");
  fd2.set("opciones", "");
  fd2.set("obligatoria", "on");
  fd2.set("permiteArchivo", "on");
  fd2.set("permiteImagen", "on");
  // escala defaults: no conNotas

  const actionRes = await fetch(`${BASE}/admin/formularios/${FORM_ID}`, {
    method: "POST",
    headers: {
      Cookie: cookieHeader(jar),
      "Next-Action": ACTION_ID,
      Accept: "text/x-component",
      "Next-Router-State-Tree": encodeURIComponent(
        JSON.stringify([
          "",
          {
            children: [
              "admin",
              {
                children: [
                  "formularios",
                  { children: [["id", FORM_ID, "d"], { children: ["__PAGE__", {}] }] },
                ],
              },
            ],
          },
        ]),
      ),
    },
    body: fd2,
  });

  const actionText = await actionRes.text();
  console.log("\n=== ACTION RESPONSE ===");
  console.log("status", actionRes.status);
  console.log("content-type", actionRes.headers.get("content-type"));
  console.log("x-action-redirect", actionRes.headers.get("x-action-redirect"));
  console.log("body FULL:\n", actionText);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
