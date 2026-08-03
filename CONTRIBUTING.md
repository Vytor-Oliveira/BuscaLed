# Guia de Contribuição — Squad de Validação (PAC Extensionista VIII)

Este repositório é individual (autoria de Vytor Oliveira), mas segue um fluxo de
**Code Review obrigatório por pares**, exigido pelo PAC Extensionista VIII. O squad
de validação atua como revisor técnico e QA deste projeto.

## Fluxo de branches

```
main            → sempre estável, protegida, só recebe merge via PR aprovado
feature/<nome>  → uma branch por funcionalidade/módulo (ex: feature/auth-jwt)
fix/<nome>      → correções de bugs reportados via Issue
```

## Passo a passo de uma entrega

1. Criar branch a partir da `main`: `git checkout -b feature/nome-da-feature`
2. Desenvolver e commitar em pequenos incrementos, com mensagens claras
   (`feat: adiciona motor de compatibilidade multi-posição`)
3. Rodar testes localmente antes de abrir o PR:
   ```bash
   npm run lint
   npm run test:cov
   ```
4. Abrir o Pull Request para `main` usando o template automático
   (`.github/PULL_REQUEST_TEMPLATE.md`)
5. Marcar 1–2 integrantes do squad como revisores
6. **Aguardar ao menos 1 aprovação** antes do merge (branch protection configurada)
7. Responder aos comentários — se algo for solicitado, ajustar e re-solicitar review
8. Fazer squash-merge após aprovação

## Papel do Squad de Validação

Cada projeto do squad deve ter pelo menos um colega atuando como:

- **Revisor de código (Code Review):** comenta nos PRs, aponta problemas de
  legibilidade, aderência às regras de negócio do RFC, más práticas de segurança
  (ver checklist no template de PR).
- **QA / Testador funcional:** executa o sistema publicado (ou localmente) e
  reporta bugs via Issue, usando o template `bug_report.md`.

### O que torna um comentário de review "bom" (o que conta para a nota do PAC VIII)

- Aponta **o quê** está errado e **por quê** (referenciando a regra de negócio,
  RF/RN do RFC, ou boas práticas — não apenas "não gostei").
- Sugere uma correção ou alternativa concreta.
- Distingue bloqueante ("precisa corrigir antes do merge") de sugestão
  ("nice to have, pode ficar para depois").

Comentários genéricos ("ok", "lgtm" sem contexto) não contam como evidência de
peer review válida.

## Rastreabilidade exigida pelo PAC VIII

Para a NP1/NP2, será necessário apresentar:

- Links de PRs em que você atuou como revisor (nos repositórios dos colegas)
- Links de Issues que você abriu como QA (nos repositórios dos colegas)
- Evidência de que bugs reportados a você foram corrigidos (comentário de
  fechamento na Issue, ou commit referenciando `closes #N`)

## Padrão de commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/pt-br/):

```
feat: nova funcionalidade
fix: correção de bug
test: adição/ajuste de testes
docs: documentação
refactor: refatoração sem mudança de comportamento
chore: configuração, dependências, CI
```
