import { useNavigate } from "react-router-dom";
import { MessageCircle, PackageSearch, ShieldCheck } from "lucide-react";
import { SeletorVeiculo, type VeiculoEscolhido } from "../features/busca/SeletorVeiculo";
import { SiteHeader } from "../components/site/SiteHeader";
import { SiteFooter } from "../components/site/SiteFooter";
import { AjudaInline } from "../components/ui/Tooltip";
import {
  EXPLICACAO_ENCAIXE,
  META_POSICAO,
  ORDEM_POSICAO,
  ROTULO_GRUPO,
  ROTULO_POSICAO,
} from "../lib/posicoes";
import { useCarrinho } from "../features/reserva/CarrinhoContext";
import { cn } from "../lib/cn";

const PASSOS = [
  {
    titulo: "Informe o carro",
    texto:
      "Digite a placa ou escolha marca, modelo e ano. Se a consulta por placa falhar, o caminho manual assume na hora.",
  },
  {
    titulo: "Veja posição por posição",
    texto:
      "Farol baixo, alto, neblina, lanterna — cada posição com o encaixe dela e os modelos que servem, com estoque à vista.",
  },
  {
    titulo: "Gere a reserva",
    texto:
      "O representante recebe o pedido, confirma o que tem e fala com você no WhatsApp. Reserva não é compra.",
  },
];

const DUVIDAS = [
  {
    pergunta: "Vocês guardam a minha placa?",
    resposta:
      "Não. A placa é usada apenas na consulta que descobre marca, modelo e ano do veículo, e é descartada em seguida. Ela não é salva no banco de dados, não vai para a barra de endereço e não aparece em nenhum registro do sistema.",
  },
  {
    pergunta: "Gerar uma reserva já é comprar?",
    resposta:
      "Não. A reserva é um pedido de atendimento: ela avisa o representante do que você precisa e separa a intenção. Nenhum valor é cobrado, e o preço e a forma de pagamento são tratados diretamente com ele.",
  },
  {
    pergunta: "Por que uma posição aparece sem nenhum LED?",
    resposta:
      "Porque o encaixe daquela posição existe no seu carro, mas ainda não há um LED no catálogo para ele. Preferimos mostrar a lacuna a esconder: assim você sabe que o encaixe existe, e o representante sabe onde o catálogo precisa crescer.",
  },
  {
    pergunta: "Preciso de conta para pesquisar?",
    resposta:
      "Não. A busca de compatibilidade é aberta. A conta só é necessária para salvar veículos na garagem e para gerar uma reserva, porque o representante precisa saber com quem falar.",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { definirVeiculo } = useCarrinho();

  function buscar(veiculo: VeiculoEscolhido) {
    definirVeiculo(veiculo);
    const busca = new URLSearchParams({
      make: veiculo.make,
      model: veiculo.model,
      year: String(veiculo.year),
    });
    // Só marca/modelo/ano na URL. A placa nunca (RN02).
    navigate(`/resultado?${busca.toString()}`);
  }

  return (
    <>
      <SiteHeader />

      <main>
        {/* Primeira dobra: manchete, uma linha de apoio e o buscador funcionando. */}
        <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-brand-50 to-canvas">
          <div className="container-app grid gap-10 py-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14 lg:py-20">
            <div className="assenta">
              <h1 className="text-[clamp(2.1rem,5.4vw,3.4rem)] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink">
                Descubra qual LED serve no seu carro
              </h1>
              <p className="mt-4 max-w-[42ch] text-[clamp(1rem,2.2vw,1.15rem)] leading-relaxed text-muted">
                O mesmo carro usa encaixes diferentes no farol baixo, no alto e na neblina.
                A gente devolve a matriz inteira — inclusive onde ainda não existe produto.
              </p>

              <dl className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <div className="flex gap-3">
                  <PackageSearch aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-600" />
                  <div>
                    <dt className="text-[14px] font-semibold text-ink">Resposta por posição</dt>
                    <dd className="mt-0.5 text-[13.5px] leading-snug text-muted">
                      Não é "serve no seu carro". É qual serve em cada farol.
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
                  <div>
                    <dt className="text-[14px] font-semibold text-ink">Placa descartada</dt>
                    <dd className="mt-0.5 text-[13.5px] leading-snug text-muted">
                      Consultamos e jogamos fora. Nunca é salva.
                    </dd>
                  </div>
                </div>
              </dl>
            </div>

            <div className="assenta lg:pl-4">
              <SeletorVeiculo onBuscar={buscar} />
            </div>
          </div>
        </section>

        {/* Sequência real, então os números carregam informação. */}
        <section id="como-funciona" className="container-app scroll-mt-20 py-16 lg:py-20">
          <h2 className="max-w-[30ch] text-[clamp(1.5rem,3.4vw,2.1rem)] font-bold tracking-[-0.025em] text-ink">
            Três passos, do carro ao representante
          </h2>

          <ol className="mt-10 grid gap-x-8 gap-y-10 md:grid-cols-3">
            {PASSOS.map((passo, i) => (
              <li key={passo.titulo} className="relative">
                <div className="flex items-center gap-3">
                  <span
                    data-numeros
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full",
                      "bg-brand-600 text-[15px] font-bold text-on-brand dark:text-[#07111c]"
                    )}
                  >
                    {i + 1}
                  </span>
                  {/* A linha liga os passos: é a sequência, não enfeite. */}
                  {i < PASSOS.length - 1 && (
                    <span
                      aria-hidden
                      className="hidden h-px flex-1 bg-line-strong md:block"
                    />
                  )}
                </div>
                <h3 className="mt-4 text-[17px] font-bold tracking-[-0.01em] text-ink">
                  {passo.titulo}
                </h3>
                <p className="mt-2 max-w-[38ch] text-[14.5px] leading-relaxed text-muted">
                  {passo.texto}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* As 13 posições: dado real do domínio, não preenchimento. */}
        <section
          id="posicoes"
          className="scroll-mt-20 border-y border-line bg-surface py-16 lg:py-20"
        >
          <div className="container-app">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-[clamp(1.5rem,3.4vw,2.1rem)] font-bold tracking-[-0.025em] text-ink">
                  As posições que a matriz cobre
                </h2>
                <p className="mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">
                  Cada posição tem o próprio encaixe. É por isso que a resposta vem
                  separada, e não como um produto único para o carro.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[13.5px] text-muted">
                O que é encaixe?
                <AjudaInline texto={EXPLICACAO_ENCAIXE} rotulo="O que significa encaixe" />
              </span>
            </div>

            <ul className="mt-9 grid grid-cols-2 overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface sm:grid-cols-3 lg:grid-cols-4">
              {ORDEM_POSICAO.map((posicao) => {
                const { icone: Icone, grupo, explicacao } = META_POSICAO[posicao];
                return (
                  <li
                    key={posicao}
                    className="p-4 shadow-[0_0_0_1px_var(--border)]"
                  >
                    <Icone aria-hidden className="size-5 text-brand-600" />
                    <h3 className="mt-3 text-[14.5px] font-semibold text-ink">
                      {ROTULO_POSICAO[posicao]}
                    </h3>
                    <p className="mt-1 text-[12px] font-semibold uppercase tracking-wider text-subtle">
                      {ROTULO_GRUPO[grupo]}
                    </p>
                    <p className="mt-2 text-[13px] leading-snug text-muted">{explicacao}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="container-app py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
            <div>
              <h2
                id="duvidas"
                className="scroll-mt-20 text-[clamp(1.5rem,3.4vw,2.1rem)] font-bold tracking-[-0.025em] text-ink"
              >
                Dúvidas frequentes
              </h2>
              <p className="mt-3 max-w-[38ch] text-[14.5px] leading-relaxed text-muted">
                As quatro perguntas que aparecem sempre — respondidas sem rodeio.
              </p>
              <p className="mt-6 inline-flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-line bg-surface px-3.5 py-3 text-[13.5px] leading-snug text-muted">
                <MessageCircle aria-hidden className="mt-px size-4 shrink-0 text-brand-600" />
                O contato é por WhatsApp, feito pelo representante depois que você
                gera a reserva.
              </p>
            </div>

            <div className="divide-y divide-line rounded-[var(--radius-md)] border border-line bg-surface">
              {DUVIDAS.map(({ pergunta, resposta }) => (
                <details key={pergunta} className="group px-5">
                  <summary
                    className={cn(
                      "flex cursor-pointer list-none items-center justify-between gap-4 py-4",
                      "text-[15px] font-semibold text-ink marker:hidden"
                    )}
                  >
                    {pergunta}
                    <span
                      aria-hidden
                      className="grid size-6 shrink-0 place-items-center rounded-full border border-line-strong text-muted transition-transform duration-[var(--dur)] ease-(--ease-out-expo) group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="max-w-[58ch] pb-4 text-[14px] leading-relaxed text-muted">
                    {resposta}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
