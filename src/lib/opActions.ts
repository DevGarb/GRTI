import { toast } from "sonner";

export function cleanPhone(phone?: string | null): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

export function telHref(phone?: string | null): string | null {
  const p = cleanPhone(phone);
  return p ? `tel:${p}` : null;
}

export function whatsappHref(phone?: string | null, message?: string): string | null {
  const p = cleanPhone(phone);
  if (!p) return null;
  // Add country code if missing (assume Brazil)
  const withDdi = p.length <= 11 ? `55${p}` : p;
  const msg = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${withDdi}${msg}`;
}

export function mapsHref(address?: string | null): string | null {
  if (!address?.trim()) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export async function copyAddress(address?: string | null) {
  if (!address?.trim()) return;
  try {
    await navigator.clipboard.writeText(address);
    toast.success("Endereço copiado");
  } catch {
    toast.error("Não foi possível copiar");
  }
}
