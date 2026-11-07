import { BarChart3, Boxes, Inbox, type LucideIcon } from "lucide-react";
import type { UserRole } from "../../auth/AuthContext";

export interface ItemDeMenu {
  para: string;
  rotulo: string;
  Icone: LucideIcon;
  /** Papéis que veem o item. RN06 mantém estoque e catálogo só no admin. */
  papeis: UserRole[];
  /** O item mostra um contador de pedidos novos. */
  contaPendentes?: boolean;
}

export const MENU_PAINEL: ItemDeMenu[] = [
  { para: "/painel/tickets", rotulo: "Fila de pedidos", Icone: Inbox, papeis: ["rep", "admin"], contaPendentes: true },
  { para: "/painel/demanda", rotulo: "Demanda", Icone: BarChart3, papeis: ["rep", "admin"] },
  { para: "/painel/estoque", rotulo: "Catálogo e estoque", Icone: Boxes, papeis: ["admin"] },
];

export const ROTULO_PAPEL: Record<UserRole, string> = {
  admin: "Administrador",
  rep: "Representante",
  user: "Cliente",
};

const TITULOS: Record<string, string> = {
  "/painel/tickets": "Fila de pedidos",
  "/painel/demanda": "Demanda",
  "/painel/estoque": "Catálogo e estoque",
};

export function tituloDaRota(caminho: string): string {
  const achado = Object.keys(TITULOS).find((rota) => caminho.startsWith(rota));
  return achado ? TITULOS[achado] : "Painel";
}

export function menuDoPapel(papel: UserRole): ItemDeMenu[] {
  return MENU_PAINEL.filter((item) => item.papeis.includes(papel));
}
