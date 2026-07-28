import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Guarda de multi-tenancy no cliente.
 *
 * A RLS já isola dados no banco. Este teste é uma segunda camada: garante
 * que os hooks que consultam tabelas escopadas por organização incluam
 * `organization_id` na query key do React Query — sem isso, o cache do RQ
 * pode servir dados da org anterior por um instante após um switch.
 *
 * Tabelas listadas abaixo têm coluna `organization_id` e políticas RLS
 * baseadas em `is_member_of_org(organization_id)`.
 */
const ORG_SCOPED_TABLES = [
  "tickets",
  "projects",
  "sprints",
  "categories",
  "patrimonio",
  "notifications",
  "op_deliveries",
  "op_service_orders",
  "op_maintenance_orders",
  "chk_executions",
  "chk_templates",
  "user_todos",
  "preventive_maintenance",
  "evaluations",
  "performance_goals",
];

const HOOKS_DIR = resolve(__dirname, "../../hooks");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("multi-tenancy: query keys incluem organization_id", () => {
  const hookFiles = walk(HOOKS_DIR).filter((f) => !f.includes("__tests__"));

  for (const file of hookFiles) {
    const src = readFileSync(file, "utf8");

    // Só analisa hooks que efetivamente tocam uma tabela escopada por org.
    const touchedTables = ORG_SCOPED_TABLES.filter((t) =>
      new RegExp(`\\.from\\(["\`']${t}["\`']\\)`).test(src)
    );
    if (touchedTables.length === 0) continue;

    // Se o hook usa useQuery/useInfiniteQuery, exige orgId na queryKey.
    if (!/useQuery|useInfiniteQuery/.test(src)) continue;

    it(`${file.split("/hooks/")[1]} usa orgId na queryKey (tabelas: ${touchedTables.join(", ")})`, () => {
      const usesActiveOrg =
        /useActiveOrgId\(/.test(src) ||
        /profile\?\.organization_id/.test(src) ||
        /organization_id\s*:\s*orgId/.test(src);

      const queryKeyRefsOrg =
        /queryKey:\s*\[[^\]]*\borgId\b/.test(src) ||
        /queryKey:\s*\[[^\]]*organization_id/.test(src) ||
        /queryKey:\s*\[[^\]]*activeOrg/i.test(src);

      // A regra: OU o hook não é escopado por org (super_admin cross-org),
      // OU precisa referenciar orgId tanto no filtro quanto na queryKey.
      if (usesActiveOrg) {
        expect(queryKeyRefsOrg, `queryKey precisa conter orgId em ${file}`).toBe(true);
      }
    });
  }
});
