import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  cancelTicket,
  completeTicket,
  confirmTicket,
  type Ticket,
  type TicketStatus,
} from "../../../api/tickets";
import { ApiError } from "../../../api/client";
import { useToast } from "../../../components/ui/Toast";
import { numeroTicket } from "../../../lib/ticket";

export type Acao = "confirmar" | "concluir" | "cancelar";

const EXECUTA: Record<Acao, (id: string) => Promise<{ ticket: Ticket }>> = {
  confirmar: confirmTicket,
  concluir: completeTicket,
  cancelar: cancelTicket,
};

const PROXIMO_STATUS: Record<Acao, TicketStatus> = {
  confirmar: "CONFIRMADO",
  concluir: "CONCLUIDO",
  cancelar: "CANCELADO",
};

const SUCESSO: Record<Acao, string> = {
  confirmar: "Pedido confirmado.",
  concluir: "Pedido concluído e estoque baixado.",
  cancelar: "Pedido cancelado.",
};

const CHAVE = ["tickets", "todos"] as const;

/**
 * Atualização otimista com rollback. A fila é de trabalho contínuo: esperar o
 * servidor a cada clique trava o ritmo de quem atende.
 */
export function useAcoesDoPedido() {
  const clienteDeConsulta = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, acao }: { id: string; acao: Acao }) => EXECUTA[acao](id),

    onMutate: async ({ id, acao }) => {
      await clienteDeConsulta.cancelQueries({ queryKey: CHAVE });
      const anterior = clienteDeConsulta.getQueryData<Ticket[]>(CHAVE);

      clienteDeConsulta.setQueryData<Ticket[]>(CHAVE, (atual) =>
        (atual ?? []).map((t) => (t.id === id ? { ...t, status: PROXIMO_STATUS[acao] } : t))
      );

      return { anterior };
    },

    onError: (erro, _variaveis, contexto) => {
      if (contexto?.anterior) {
        clienteDeConsulta.setQueryData(CHAVE, contexto.anterior);
      }
      toast.erro(
        "A ação não foi aplicada",
        erro instanceof ApiError ? erro.message : "Tente novamente em instantes."
      );
    },

    onSuccess: ({ ticket }, { acao }) => {
      toast.sucesso(SUCESSO[acao], `Pedido ${numeroTicket(ticket.id)}.`);
    },

    onSettled: () => {
      void clienteDeConsulta.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}
