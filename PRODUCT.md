# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Cliente final (role `user`)** — motorista sem conhecimento técnico, decidindo
  qual LED serve no próprio carro. Chega sem saber o vocabulário do domínio
  (encaixe, posição de farol, código de soquete). Salva veículos na Garagem
  Virtual, vê os LEDs compatíveis por posição, gera um pedido consolidado e
  acompanha o status em Meus Pedidos. A busca de compatibilidade é **pública**:
  só reservar exige conta.
- **Representante comercial (role `rep`)** — o parceiro Shocklight. Recebe
  notificação de ticket novo, trabalha a fila de pedidos, troca produto do
  ticket (com notificação automática ao cliente), contata o cliente por
  WhatsApp e monitora demanda. É quem usa o sistema todos os dias.
- **Administrador (role `admin`)** — mantém a matriz de compatibilidade, o
  catálogo e o estoque (quantidade e nível mínimo de alerta).

Fato em aberto, levantado e deliberadamente adiado pelo usuário: na operação
real o representante e o administrador são **a mesma pessoa**. A decisão de
unificar os dois papéis foi explicitamente postergada; os três papéis seguem
separados no sistema e nenhum trabalho deve presumir a unificação.

## Product Purpose

Responder qual LED automotivo serve em qual veículo, e transformar essa resposta
em um pedido rastreável.

Hoje o representante responde isso à mão, no WhatsApp, consultando tabelas em PDF
que desatualizam e não escalam. O BuscaLED cruza os dados do veículo — obtidos
por placa ou escolhidos manualmente — com a matriz de compatibilidade de LEDs da
Shocklight e devolve todos os modelos compatíveis **por posição de farol** (baixo,
alto, neblina, lanterna), cada posição podendo ter vários modelos.

Sucesso é o cliente final sair com um pedido correto sem precisar entender o
vocabulário técnico, e o representante parar de responder a mesma pergunta à mão.

## Positioning

O cruzamento por **posição de farol**, não por veículo. Um concorrente que diga
"este LED serve no seu carro" está dando meia resposta: o mesmo carro usa
encaixes diferentes no farol baixo, no alto e na neblina. O BuscaLED devolve a
matriz inteira, inclusive os encaixes para os quais **não há produto no catálogo**
— a lacuna é informação, não erro.

Segundo diferencial, que é restrição de arquitetura e não promessa de marketing:
a consulta por placa funciona sem que a placa **jamais** seja persistida ou
registrada em log, em nenhuma camada (RN02). O dado identificável do veículo não
existe no banco.

## Operating Context

- **WhatsApp é o canal real de contato**, por deep link (`wa.me`) a partir do
  painel — nunca API. O envio automático está fora de escopo na v1 por decisão
  de projeto.
- **A consulta de placa é paga e externa** (PuxaPlaca, R$ 0,04 por consulta),
  com cache e cota por usuário. Sem token configurado, o sistema ainda responde
  do cache e ainda aplica cota.
- **A matriz de compatibilidade vem de uma planilha proprietária da Shocklight**,
  não committada no repositório.
- **O repositório é público.** Nada proprietário ou pessoal pode ser committado.
- Notificação por e-mail transacional (Resend) para confirmação de conta,
  redefinição de senha e troca de produto no ticket.

## Capabilities and Constraints

Confirmado e implementado:

- Cadastro e login por e-mail/senha com JWT em cookie `httpOnly`; confirmação de
  e-mail e redefinição de senha.
- Garagem Virtual, vitrine de compatibilidade, pedido consolidado, Meus Pedidos.
- Painel: fila de pedidos com filtro por status, troca de produto no ticket,
  dashboard de demanda (produtos mais pedidos, estoque crítico, veículos mais
  buscados, série temporal), estoque com reposição.
- Histórico de buscas **anônimo**: sem placa e sem `userId`.

Restrições duras:

- **RN02** — a placa nunca é persistida nem logada, em nenhuma camada.
- **RN06** — estoque e catálogo são exclusivos do `admin`; o backend responde 403
  ao representante.
- **RN11** — a troca de produto no ticket só vale dentro do mesmo encaixe.
- Uma única dependência de UI no frontend (`react-router-dom`). O projeto já
  rejeitou dependência pesada antes (`xlsx`, por CVE); gráficos e rankings são
  desenhados à mão em CSS/SVG.
- CORS do backend aceita **uma** origem (`FRONTEND_URL`, default
  `http://localhost:5173`).

Explicitamente indecidido:

- Deploy não provisionado (alvo Azure for Students).
- Login com Google existe no backend mas **não tem entrada na UI**; depende de
  HTTPS, portanto do deploy.
- Unificação dos papéis `rep` e `admin` (ver `## Users`).

## Brand Commitments

- **O BuscaLED tem identidade própria** (confirmado pelo usuário). A Shocklight
  aparece como **fabricante dos produtos do catálogo**, não como dona da marca
  do sistema. A identidade visual da Shocklight não é vinculante.
- O nome do produto é **BuscaLED**.
- O logo atual (`docs/logo.png`) **não é definitivo** e pode ser repensado.
- Idioma da interface: português do Brasil, incluindo o vocabulário de domínio
  já estabelecido no código e no README (encaixe, posição de farol, vitrine,
  garagem, ticket/pedido, demanda).
- **Convenção é o compromisso, por escolha do usuário (2026-11-05).** Diante de
  uma rodada de direção visual com alternativas autorais, o usuário escolheu o
  padrão da categoria. Isso é preferência permanente, não falta de decisão: o
  trabalho visual executa a convenção em fidelidade total, sem ironia e sem
  truque autoral contrabandeado por dentro. Direção "estranha" não é melhoria
  aqui — é descumprimento.
- **Régua de acabamento: Nubank, iFood e Mercado Pago.** O nível de acabamento
  desses três é o piso, não o teto: brasileiros, mobile-first, em português e
  feitos para público leigo — a mesma situação do cliente final do BuscaLED.

## Evidence on Hand

Real, e que trabalho futuro deve preservar:

- **19 fotos oficiais de produto** em `frontend/public/leds/`, nomeadas pelo SKU
  (`SLL-*.jpg`). Confirmadas como **definitivas** pelo usuário.
- Matriz de compatibilidade real da Shocklight (planilha proprietária, fora do
  repositório).
- Integração real e validada com a PuxaPlaca.
- Métricas de qualidade reais e públicas: CI no GitHub Actions, SonarCloud
  (cobertura ~90% em código novo, Quality Gate OK).

Ausências que **não podem ser fabricadas**:

- Nenhum depoimento, cliente, estudo de caso, menção de imprensa, benchmark,
  preço ou número de vendas existe. Nada disso pode ser inventado em nenhuma
  superfície.
- O saldo atual da PuxaPlaca é R$ 0,02, ou seja, a consulta por placa ao vivo
  está indisponível até recarga — qualquer demonstração depende da entrada
  manual de veículo ou do cache.

## Product Principles

1. **A lacuna é informação.** Encaixe sem produto no catálogo é mostrado, não
   escondido — é o que diz ao representante onde a matriz precisa crescer.
2. **O cliente não precisa aprender o vocabulário.** Termos de domínio aparecem
   explicados pela própria interface, nunca como pré-requisito para avançar.
3. **Privacy by design não é um recurso, é uma restrição.** Se uma tela precisa
   da placa para funcionar, a tela está errada.
4. **O painel é ferramenta de trabalho diário.** Lá, precisão e varredura rápida
   valem mais que expressão visual.
5. **Peso de dependência é decisão de produto — e o usuário a revisou em
   2026-11-05.** A regra anterior ("capacidade nova se paga em código próprio
   antes de se pagar em pacote de terceiro") valeu até o frontend ter 3
   dependências. Ao ser confrontado com o custo, o usuário escolheu a stack
   completa: Tailwind, primitivos Radix, React Query, React Hook Form + Zod,
   Lucide e Recharts. O que permanece da regra é a consequência, não a
   proibição: cada dependência precisa estar em uso real, e `xlsx` segue
   rejeitada por CVE.

## Accessibility & Inclusion

Nenhuma exigência formal foi estabelecida: ao ser perguntado, o usuário não
conhecia o tema, e não há evidência de requisito de acessibilidade na RFC nem na
rubrica de avaliação. **Fato em aberto — não tratar como requisito confirmado.**

Decisão de execução (minha, não requisito do cliente): o trabalho de design adota
**WCAG 2.1 AA** como piso de qualidade — contraste de texto, operação completa por
teclado e rótulos acessíveis. Promover a requisito duro se o usuário confirmar que
a avaliação cobra.

Necessidade de usuário já conhecida e não negociável: o cliente final é
**leigo no domínio**. Clareza de linguagem é requisito de acessibilidade aqui,
não só de redação.
