import { Phone, MessageCircle, MapPin, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { telHref, whatsappHref, mapsHref, copyAddress } from "@/lib/opActions";

interface Props {
  phone?: string | null;
  address?: string | null;
  size?: "sm" | "icon";
  whatsappMessage?: string;
  className?: string;
}

export default function OpQuickActions({ phone, address, size = "icon", whatsappMessage, className }: Props) {
  const tel = telHref(phone);
  const wpp = whatsappHref(phone, whatsappMessage);
  const map = mapsHref(address);

  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  if (!tel && !wpp && !map) return null;

  return (
    <div className={`flex items-center gap-1 ${className || ""}`} onClick={(e) => e.stopPropagation()}>
      {tel && (
        <Button asChild size={size} variant="ghost" title="Ligar">
          <a href={tel}><Phone className="h-4 w-4" /></a>
        </Button>
      )}
      {wpp && (
        <Button asChild size={size} variant="ghost" title="WhatsApp">
          <a href={wpp} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 text-emerald-600" /></a>
        </Button>
      )}
      {map && (
        <>
          <Button asChild size={size} variant="ghost" title="Abrir no Google Maps">
            <a href={map} target="_blank" rel="noreferrer"><MapPin className="h-4 w-4" /></a>
          </Button>
          <Button size={size} variant="ghost" title="Copiar endereço" onClick={stop(() => copyAddress(address))}>
            <Copy className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
