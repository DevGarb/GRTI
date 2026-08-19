/**
 * Validação automática do layout da org T.I (desktop + mobile).
 *
 * Uso: bun scripts/ti-layout-check.mjs [baseUrl]
 * Requer o app rodando (default http://localhost:8080) e uma sessão válida
 * já persistida via variáveis LOVABLE_BROWSER_SUPABASE_* (opcional).
 *
 * Verifica:
 *  - Escopo do tema (html.ti-scope) aplicado.
 *  - Sidebar visível no desktop e oculta no mobile.
 *  - Botão de menu presente no mobile e abre a gaveta.
 *  - Mini-rail colapsa a sidebar para 72px no desktop e persiste no reload.
 *  - Cabeçalho padronizado (TiPageHeader) presente na página.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:8080";
const ROUTE = "/grupo-ramos/chamados";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

async function restoreSession(context, page) {
  const key = process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const session = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  const cookies = process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON;
  if (cookies) {
    await context.addCookies(
      JSON.parse(cookies).map((c) => ({ ...c, url: BASE }))
    );
  }
  await page.goto(BASE);
  if (key && session) {
    await page.evaluate(
      ([k, v]) => window.localStorage.setItem(k, v),
      [key, session]
    );
  }
}

const main = async () => {
  const browser = await chromium.launch({ headless: true });

  // ---------- Desktop ----------
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dp = await desktop.newPage();
  await restoreSession(desktop, dp);
  await dp.goto(`${BASE}${ROUTE}`, { waitUntil: "networkidle" });

  check("tema T.I aplicado (html.ti-scope)", await dp.evaluate(() => document.documentElement.classList.contains("ti-scope")));

  const aside = dp.locator('aside[aria-label="Menu lateral"]');
  check("sidebar visível no desktop", await aside.isVisible());

  const expandedWidth = (await aside.boundingBox())?.width ?? 0;
  check("sidebar expandida ~240px", Math.abs(expandedWidth - 240) < 8, `${expandedWidth}px`);

  await dp.getByRole("button", { name: "Recolher menu lateral" }).click();
  await dp.waitForTimeout(350);
  const railWidth = (await aside.boundingBox())?.width ?? 0;
  check("mini-rail ~72px", Math.abs(railWidth - 72) < 8, `${railWidth}px`);

  await dp.reload({ waitUntil: "networkidle" });
  const persistedWidth = (await dp.locator('aside[aria-label="Menu lateral"]').boundingBox())?.width ?? 0;
  check("estado do rail persiste após reload", Math.abs(persistedWidth - 72) < 8, `${persistedWidth}px`);

  await dp.getByRole("button", { name: "Expandir menu lateral" }).click();
  await dp.waitForTimeout(350);

  check("cabeçalho padronizado presente", (await dp.locator('[data-testid="ti-page-header"]').count()) > 0);

  // ---------- Mobile ----------
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mp = await mobile.newPage();
  await restoreSession(mobile, mp);
  await mp.goto(`${BASE}${ROUTE}`, { waitUntil: "networkidle" });

  const mAside = mp.locator('aside[aria-label="Menu lateral"]');
  const offscreen = ((await mAside.boundingBox())?.x ?? 0) < -10;
  check("sidebar recolhida no mobile", offscreen);

  const trigger = mp.getByRole("button", { name: "Abrir menu lateral" });
  check("botão de menu visível no mobile", await trigger.isVisible());
  await trigger.click();
  await mp.waitForTimeout(350);
  check("gaveta abre no mobile", ((await mAside.boundingBox())?.x ?? -999) >= 0);

  await mp.keyboard.press("Escape");
  await mp.waitForTimeout(350);
  check("gaveta fecha com Escape", ((await mAside.boundingBox())?.x ?? 0) < -10);

  check("sem overflow horizontal no mobile", await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} verificações OK`);
  process.exit(failed.length ? 1 : 0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
