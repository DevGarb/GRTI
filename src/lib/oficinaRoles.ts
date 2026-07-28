export type OficinaRole = "mecanico" | "lider" | "supervisor" | "compras";

export const OFICINA_ROLES: { id: OficinaRole; label: string; short: string; home: string }[] = [
  { id: "mecanico", label: "Mecânico", short: "Mecânico", home: "/op/oficina/minhas" },
  { id: "lider", label: "Mecânico Líder", short: "Líder", home: "/op/oficina" },
  { id: "supervisor", label: "Supervisor", short: "Supervisor", home: "/op/oficina" },
  { id: "compras", label: "Compras", short: "Compras", home: "/op/oficina/compras" },
];

export const oficinaRoleInfo = (r: string) =>
  OFICINA_ROLES.find((x) => x.id === r) || OFICINA_ROLES[0];

export const oficinaRoleHome = (r: string) => oficinaRoleInfo(r).home;

export const OFICINA_ROLE_BADGE: Record<string, string> = {
  mecanico: "bg-amber-500 text-white",
  lider: "bg-blue-600 text-white",
  supervisor: "bg-slate-800 text-white",
  compras: "bg-emerald-600 text-white",
};
