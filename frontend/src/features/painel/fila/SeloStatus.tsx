import { CheckCircle2, CircleDashed, Clock, XCircle } from "lucide-react";
import type { TicketStatus } from "../../../api/tickets";
import { Badge, type TomBadge } from "../../../components/ui/Badge";
import { ROTULO_STATUS } from "../../../lib/ticket";

const APARENCIA: Record<TicketStatus, { tom: TomBadge; Icone: typeof Clock }> = {
  PENDENTE: { tom: "info", Icone: Clock },
  CONFIRMADO: { tom: "warning", Icone: CircleDashed },
  CONCLUIDO: { tom: "success", Icone: CheckCircle2 },
  CANCELADO: { tom: "neutral", Icone: XCircle },
};

export function SeloStatus({ status }: { status: TicketStatus }) {
  const { tom, Icone } = APARENCIA[status];
  return (
    <Badge tom={tom} Icone={Icone}>
      {ROTULO_STATUS[status]}
    </Badge>
  );
}
