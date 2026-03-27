import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { BookOpen, Shield, Wrench, User, Search, X, Code } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const guides = [
  { key: "admin", label: "Administrador", icon: Shield, file: "/docs/GUIA_ADMIN.md" },
  { key: "tecnico", label: "Técnico", icon: Wrench, file: "/docs/GUIA_TECNICO.md" },
  { key: "solicitante", label: "Solicitante", icon: User, file: "/docs/GUIA_SOLICITANTE.md" },
];

function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`(${escaped})`, "gi"), "**$1**");
}

function filterSections(markdown: string, query: string): string {
  if (!query.trim()) return markdown;
  const lowerQuery = query.toLowerCase();
  const sections = markdown.split(/(?=^## )/m);
  const matched = sections.filter((s) => s.toLowerCase().includes(lowerQuery));
  if (matched.length === 0) return "";
  return matched.map((s) => highlightText(s, query)).join("\n");
}

export default function Documentacao() {
  const { roles } = useAuth();
  const [searchParams] = useSearchParams();
  const [contents, setContents] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const tabParam = searchParams.get("tab");
  const defaultTab = tabParam && guides.some((g) => g.key === tabParam)
    ? tabParam
    : roles.includes("admin") || roles.includes("super_admin")
    ? "admin"
    : roles.includes("tecnico")
    ? "tecnico"
    : "solicitante";

  useEffect(() => {
    guides.forEach(({ key, file }) => {
      fetch(file)
        .then((r) => r.text())
        .then((text) => setContents((prev) => ({ ...prev, [key]: text })))
        .catch(() => setContents((prev) => ({ ...prev, [key]: "Erro ao carregar documentação." })));
    });
  }, []);

  const filtered = useMemo(() => {
    const result: Record<string, string> = {};
    for (const { key } of guides) {
      result[key] = contents[key] ? filterSections(contents[key], search) : "";
    }
    return result;
  }, [contents, search]);

  const matchCounts = useMemo(() => {
    if (!search.trim()) return null;
    const counts: Record<string, number> = {};
    for (const { key } of guides) {
      const lowerQuery = search.toLowerCase();
      const text = contents[key]?.toLowerCase() || "";
      let count = 0, idx = 0;
      while ((idx = text.indexOf(lowerQuery, idx)) !== -1) { count++; idx += lowerQuery.length; }
      counts[key] = count;
    }
    return counts;
  }, [contents, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Documentação de Uso</h1>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar na documentação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="w-full justify-start">
          {guides.map(({ key, label, icon: Icon }) => (
            <TabsTrigger key={key} value={key} className="gap-2">
              <Icon className="h-4 w-4" />
              {label}
              {matchCounts && (
                <span className="ml-1 text-xs rounded-full bg-primary/10 text-primary px-1.5">
                  {matchCounts[key]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {guides.map(({ key }) => (
          <TabsContent key={key} value={key}>
            <ScrollArea className="h-[calc(100vh-260px)] rounded-lg border bg-card p-6">
              {filtered[key] ? (
                <article className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{filtered[key]}</ReactMarkdown>
                </article>
              ) : search.trim() ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Search className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm">Nenhum resultado encontrado para "{search}"</p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Carregando...</p>
              )}
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
