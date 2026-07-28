import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ORG_QUERY_PARAM,
  persistActiveOrgSlug,
  readOrgSlugFromUrl,
  readStoredOrgSlug,
  resolveActiveOrgSlug,
  writeOrgSlugToUrl,
  writeStoredOrgSlug,
} from "@/lib/activeOrg";

function setUrl(url: string) {
  window.history.replaceState({}, "", url);
}

describe("activeOrg helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setUrl("/");
  });

  it("lê slug do parâmetro ?org", () => {
    setUrl(`/dashboard?${ORG_QUERY_PARAM}=grupo-ramos`);
    expect(readOrgSlugFromUrl()).toBe("grupo-ramos");
  });

  it("retorna null quando ?org está ausente ou vazio", () => {
    setUrl(`/dashboard`);
    expect(readOrgSlugFromUrl()).toBeNull();
    setUrl(`/dashboard?${ORG_QUERY_PARAM}=`);
    expect(readOrgSlugFromUrl()).toBeNull();
  });

  it("persiste e lê slug no localStorage", () => {
    writeStoredOrgSlug("op");
    expect(readStoredOrgSlug()).toBe("op");
    writeStoredOrgSlug(null);
    expect(readStoredOrgSlug()).toBeNull();
  });

  it("URL tem precedência sobre localStorage em resolveActiveOrgSlug", () => {
    writeStoredOrgSlug("grupo-ramos");
    setUrl(`/foo?${ORG_QUERY_PARAM}=operacional`);
    expect(resolveActiveOrgSlug()).toBe("operacional");
  });

  it("usa localStorage quando não há ?org na URL", () => {
    writeStoredOrgSlug("grupo-ramos");
    setUrl(`/foo`);
    expect(resolveActiveOrgSlug()).toBe("grupo-ramos");
  });

  it("writeOrgSlugToUrl adiciona e remove o parâmetro sem recarregar", () => {
    setUrl(`/x?keep=1`);
    writeOrgSlugToUrl("op");
    expect(window.location.search).toContain(`${ORG_QUERY_PARAM}=op`);
    expect(window.location.search).toContain("keep=1");
    writeOrgSlugToUrl(null);
    expect(window.location.search).not.toContain(ORG_QUERY_PARAM);
  });

  it("persistActiveOrgSlug grava nos dois canais", () => {
    persistActiveOrgSlug("resolve");
    expect(readStoredOrgSlug()).toBe("resolve");
    expect(readOrgSlugFromUrl()).toBe("resolve");
  });

  it("não quebra quando localStorage lança (modo privado)", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });
    expect(() => writeStoredOrgSlug("x")).not.toThrow();
    spy.mockRestore();
  });
});
