import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const FORM_ID = process.argv[2] ?? "cmtx7u0lv000lorrc8kssbxv5";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") logs.push(`console.error: ${msg.text()}`);
  });
  page.on("pageerror", (err) => logs.push(`pageerror: ${err.stack ?? err.message}`));
  page.on("response", async (res) => {
    if (res.request().method() !== "POST") return;
    if (!res.url().includes("/admin/formularios/")) return;
    let body = "";
    try {
      body = await res.text();
    } catch {
      body = "(unreadable body)";
    }
    logs.push(`POST ${res.status()} ${res.url()}\n${body.slice(0, 6000)}`);
  });

  await page.goto(`${BASE}/ingresar/admin`, { waitUntil: "domcontentloaded" });
  await page.locator("#email, input[name='email']").fill("admin@test.com");
  await page.locator("#password, input[name='password']").fill("bitacora");
  await Promise.all([
    page.waitForURL(/\/admin/, { timeout: 20000 }),
    page.locator('button[type="submit"]').click(),
  ]);
  console.log("logged in ->", page.url());

  await page.goto(`${BASE}/admin/formularios/${FORM_ID}`, { waitUntil: "networkidle" });
  console.log("form page ->", page.url());
  if (page.url().includes("/ingresar")) {
    throw new Error("Still on login — auth failed");
  }

  await page.getByRole("button", { name: "Agregar pregunta" }).click();
  await page.locator("#enunciado").fill(`Playwright live ${Date.now()}`);
  await page.locator("#ayuda").fill("texto de ayuda");
  // default tipo is texto_corto — leave it

  const postWait = page.waitForResponse(
    (r) => r.url().includes(`/admin/formularios/${FORM_ID}`) && r.request().method() === "POST",
    { timeout: 20000 },
  );

  await page.getByRole("button", { name: "Agregar esta pregunta" }).click();
  const post = await postWait.catch(() => null);
  console.log("post status:", post?.status() ?? "no POST seen");

  await page.waitForTimeout(2500);

  // Next.js error overlay often in shadow DOM
  const overlayText = await page.evaluate(() => {
    const portal = document.querySelector("nextjs-portal");
    if (!portal?.shadowRoot) return null;
    return portal.shadowRoot.textContent?.slice(0, 5000) ?? null;
  });

  const uiError = await page.locator(".text-danger, [role='alert']").allTextContents().catch(() => []);
  const bodySnippet = (await page.locator("body").innerText()).slice(0, 2000);

  console.log("\n=== OVERLAY ===\n", overlayText);
  console.log("\n=== UI ERRORS ===\n", uiError);
  console.log("\n=== BODY SNIPPET ===\n", bodySnippet);
  console.log("\n=== NETWORK/CONSOLE LOGS ===");
  for (const l of logs) {
    console.log(l);
    console.log("---");
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
