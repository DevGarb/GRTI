export type OficinaRole = "mecanico" | "compras" | "admin" | "motoloc";

export const OFICINA_ROLES: { id: OficinaRole; label: string; short: string; home: string }[] = [
  { id: "mecanico", label: "Mecânico", short: "Mecânico", home: "/op/oficina/minhas" },
  { id: "compras", label: "Compras", short: "Compras", home: "/op/oficina/compras" },
  { id: "motoloc", label: "Motoloc", short: "Motoloc", home: "/op/oficina/agendar" },
  { id: "admin", label: "Administrador", short: "Admin", home: "/op/oficina" },
];

export const oficinaRoleInfo = (r: string) =>
  OFICINA_ROLES.find((x) => x.id === r) || OFICINA_ROLES[0];

export const oficinaRoleHome = (r: string) => oficinaRoleInfo(r).home;

export const OFICINA_ROLE_BADGE: Record<string, string> = {
  mecanico: "bg-amber-500 text-white",
  compras: "bg-emerald-600 text-white",
  motoloc: "bg-orange-600 text-white",
  admin: "bg-slate-800 text-white",
};
