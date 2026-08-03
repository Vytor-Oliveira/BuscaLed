# BuscaLED

[![CI](https://github.com/Vytor-Oliveira/BuscaLed/actions/workflows/ci.yml/badge.svg)](https://github.com/Vytor-Oliveira/BuscaLed/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Vytor-Oliveira_BuscaLed&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Vytor-Oliveira_BuscaLed)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Vytor-Oliveira_BuscaLed&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Vytor-Oliveira_BuscaLed)

Motor de Compatibilidade e Orquestração de Pedidos para Iluminação Automotiva LED.

> Projeto de Portfólio — Engenharia de Software, Católica SC.
> RFC completa: a ser publicada em `/docs/RFC.pdf` assim que disponível.

## O que é

O BuscaLED cruza os dados de um veículo (por placa ou manualmente) com a matriz de
compatibilidade de LEDs automotivos da Shocklight, retornando todos os modelos
compatíveis por posição de farol, permitindo ao cliente final gerar um ticket de reserva
consolidado e ao representante comercial gerenciar pedidos, estoque e contato com o
cliente — tudo com Privacy by Design (a placa do veículo nunca é persistida).

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Banco de dados | PostgreSQL (Azure Database for PostgreSQL) |
| Fila de tarefas | Redis + Bull |
| E-mail transacional | SendGrid / Nodemailer |
| Autenticação | JWT + Google OAuth2 |
| CI/CD | GitHub Actions |
| Análise estática | SonarCloud |
| Observabilidade | New Relic |
| Containerização | Docker |

## Estrutura do repositório

```
.
├── backend/          # API REST (Node.js + Express)
├── frontend/          # SPA (React + Vite)
├── docs/              # RFC, diagramas C4, modelo de dados
├── .github/
│   ├── workflows/     # Pipelines de CI/CD
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── docker-compose.yml
├── sonar-project.properties
└── CONTRIBUTING.md    # Fluxo de Code Review / Peer Review (PAC VIII)
```

## Rodando localmente

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev

# Infra local (Postgres + Redis)
docker compose up -d
```

## Testes e cobertura

Metas definidas na RFC (RNF05): **75% backend / 25% frontend**.

```bash
cd backend && npm run test:cov
cd frontend && npm run test:cov
```

## Squad de Validação (PAC Extensionista VIII)

Este repositório segue o fluxo de **Code Review obrigatório** descrito em
[`CONTRIBUTING.md`](./CONTRIBUTING.md): nenhum merge é feito na `main` sem ao menos
uma aprovação de um integrante do squad.

## Parceiro Externo

Projeto validado com o representante comercial da marca **Shocklight** (Santa Catarina).

## Licença

Este projeto é acadêmico (TCC/Portfólio — Católica SC). Ver [`LICENSE`](./LICENSE).
