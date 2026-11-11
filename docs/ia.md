# Uso de IA — TourFlow API

Registro exigido pelo `CLAUDE.md` §9 e pelo material oficial do Projeto B. A IA é ferramenta de apoio. As decisões, aprovações e operações Git de escrita são do responsável humano, Paulo Odilon Everton Rodrigues (@podilon), salvo quando ele as delegou explicitamente por tarefa. As delegações estão registradas no `CLAUDE.md` §5 e em `docs/governanca.md`.

## Papéis

| Papel | Responsabilidade |
| --- | --- |
| Responsável humano | Aprova cada tarefa, decisões sensíveis, commits, pushes e a entrega |
| Claude Code (Anthropic) | Executor: planeja, implementa, testa e documenta tarefas aprovadas |
| Codex | Supervisor: audita arquitetura, qualidade, segurança e critérios de aceite; prepara permissões |
| ChatGPT | Supervisão técnica nos gates finais |

## Como ler este registro

Cada fase traz os mesmos campos:

- **Objetivo:** o que a tarefa deveria entregar.
- **Prompt (resumo):** o pedido relevante feito à IA, resumido sem conteúdo sensível.
- **Intervenção humana:** aprovações, decisões e ações executadas pelo responsável.
- **Gerado pela IA / por ferramenta:** o que o Claude Code escreveu e o que foi produzido por ferramentas, como o npm e o k6.
- **Revisão:** escolhas expostas para revisão, auditorias e correções.
- **Validação:** verificações realmente executadas, com a origem de cada evidência.

As entradas de F0 e F1-T0 foram reconstruídas a partir do histórico Git e dos documentos versionados. Os prompts dessas fases não foram arquivados no repositório e, por isso, não estão reproduzidos aqui. O detalhe de comandos e exit codes de todas as fases está em [estado-execucao.md](estado-execucao.md).

| Fase | Tarefas | Período |
| --- | --- | --- |
| [F0](#f0--planejamento) | F0-T1 a F0-T5 | 2026-11-08 |
| [F1](#f1--fundação-persistência-e-fluxo-e2e) | F1-T0 a F1-T5 (F1-T4 e F1-T5 no Bloco 1) | 2026-11-08 a 2026-11-11 |
| [F2](#f2--testes-e-ci) | F2-T1 a F2-T4 (Blocos 1 e 2) | 2026-11-11 |
| [F3](#f3--observabilidade-e-contrato) | F3-T1 a F3-T4 (Bloco 3) | 2026-11-11 |
| [F4](#f4--desempenho-e-homologação) | F4-T1 a F4-T5 (Bloco 4) | 2026-11-11 |
| [F5](#f5--congelamento-e-entrega) | Promoção para `main` e revisão documental | 2026-11-11 |

---

## F0 — Planejamento

### F0 — Produto, arquitetura, governança e roadmap (2026-11-08)

- **Objetivo:** definir produto, arquitetura, governança e roadmap antes de qualquer código.
- **Prompt (resumo):** não arquivado. Uso consultivo de IA na redação do PRD, do ADR-0001, do `CLAUDE.md` e do `ROADMAP.md`. O ADR registra "apoio consultivo de IA" entre os decisores.
- **Intervenção humana:** aprovação do Gate G0 sobre a versão 1.1 dos quatro documentos.
- **Arquivos:** `PRD.md`, `docs/adr/0001-arquitetura.md`, `CLAUDE.md`, `ROADMAP.md`.
- **Revisão:** revisão documental pelo responsável.
- **Validação:** nenhum código executado. Evidência nos commits `2f6bd56` (versão inicial) e `d9b59b3` (versão 1.1 aprovada).

---

## F1 — Fundação, persistência e fluxo E2E

### F1-T0 — Permissões do Claude Code (2026-11-08)

- **Objetivo:** configurar regras allow/ask/deny e documentar o que é controle técnico e o que é apenas norma.
- **Prompt (resumo):** não arquivado.
- **Intervenção humana:** aprovação da tarefa; inclusão do `.gitignore` nesta tarefa (decisão D5 registrada em `docs/governanca.md` §8); execução de `/permissions` pelo responsável.
- **Gerado pela IA:** `.claude/settings.json` e `docs/governanca.md`; testes inofensivos de permissão executados pelo Claude Code.
- **Arquivos:** `.claude/settings.json`, `.gitignore`, `docs/governanca.md`.
- **Validação:** commit `1b8bd05`; resultados e limitações em `docs/governanca.md` §5 e §7, incluindo o ask do PowerShell não comprovado.

### PREP-AUTO — Preparação da automação (2026-11-11)

- **Objetivo:** registrar a skill do executor e o checkpoint de desenvolvimento.
- **Arquivos:** `.claude/skills/tourflow-executor/SKILL.md`, `docs/estado-execucao.md`.
- **Validação:** commit `fdbe62d`.

### F1-T1 — Fundação Docker-first (2026-11-11)

- **Objetivo:** base executável com Node.js 24, TypeScript ESM, Express 5 e Zod, inteiramente em containers.
- **Prompt (resumo):** prompt executivo supervisionado pelo Codex, com escopo, arquivos autorizados, comandos Docker permitidos, critérios de aceite, limite de três rodadas de correção e proibição de Git de escrita, F1-T2 e comandos destrutivos.
- **Intervenção humana:**
  - Autorização explícita da execução, do pull da imagem Node, da resolução npm em container, dos builds e dos volumes do projeto.
  - Imagem fixada por tag exata e digest em vez de `node:24-alpine`.
  - Inclusão de `tsconfig.build.json`, para separar o build de produção do typecheck.
  - `docker context show` executado manualmente pelo responsável, porque a regra deny `docker context *` é mantida.
  - Teste HTTP pelo host executado pelo responsável (`curl` permanece em deny).
  - Delegação ao Claude Code da publicação da F1-T1: stage dos caminhos aprovados, commit, CI em `ubuntu-latest`, push da branch, PR e merge condicionado a CI verde no SHA atual. A exceção está no `CLAUDE.md` §5 e no `docs/governanca.md` §11, com permissões Bash enumeradas no `.claude/settings.json`, ajustadas pelo Codex.
- **Gerado pela IA (Claude Code):** `package.json` (scripts), configurações (`tsconfig*.json`, `eslint.config.js`, `vitest.config.ts`), `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.gitattributes`, `.env.example`, complemento do `.gitignore`, código em `src/`, testes em `tests/unit/app.test.ts`, `README.md`, este arquivo e a atualização de `docs/estado-execucao.md`.
- **Gerado por ferramenta:** `package-lock.json`, criado pelo `npm install` em container temporário.
- **Revisão:**
  - Pedido de correção (rodada 1 de 3): o parser JSON deveria classificar como 400 `VALIDATION_ERROR` as rejeições conhecidas causadas pela requisição, incluindo corpo acima de 16 KB. A falha inesperada deveria continuar em 500 `INTERNAL_ERROR`, com mensagem fixa no stderr e sem registrar o objeto de erro.
  - Alteração feita pelo Claude Code: `src/http/middlewares/error-handler.ts` passou a classificar os erros do parser pelo campo `type` e a registrar só uma mensagem fixa; `tests/unit/app.test.ts` ganhou casos para corpo acima de 16 KB e charset não suportado.
  - O caso 500 verifica, com `util.inspect`, que a mensagem interna fictícia não chega ao log. O primeiro rascunho dessa asserção usava `JSON.stringify`, que serializa `Error` como `{}` e teria passado mesmo com o objeto bruto no log; o Claude Code corrigiu isso antes de executar.
  - Parecer do Codex: F1-T1 aprovada tecnicamente com ressalvas. O `node_modules` vazio no host foi aceito como ponto de montagem. Ficaram abertas a avaliação de uma correção compatível para as 10 ocorrências moderadas do `npm audit` na cadeia de lint (0 em produção) e a atualização do rótulo "Proposto" do ADR-0001, feita na revisão documental da F5.
- **Validação:**
  - Inicial: lint, typecheck, testes (8 de 8) e build executados pelo Compose; API iniciada pelo Compose; UID, dependências do runtime e mapeamento de porta inspecionados.
  - Após a rodada 1, pelo Claude Code via Compose: lint sem avisos, typecheck e build com exit 0, 10 de 10 testes; imagem `api` reconstruída, com UID 1000 e o handler novo presente em `dist/`.
  - HTTP verificado pelo responsável: `curl.exe` no host às 10:55 UTC de 11/11/2026 retornou `HTTP/1.1 404`, `application/json` e `{"error":{"code":"NOT_FOUND","message":"Resource not found"}}`.
  - Revisão de código pelo Codex: auditoria independente da entrega e da rodada 1.

### F1-T2 — PostgreSQL, migrations, seed e saúde (2026-11-11)

- **Objetivo:** adicionar `db` e `db-test` (PostgreSQL 17 Alpine), a migration estrutural, a seed fictícia idempotente e `GET /health` com 200/503.
- **Prompt (resumo):** prompt executivo da skill `tourflow-executor` com plano já aprovado. Pedia conferir a base `fd74ca4` e as três alterações de governança preparadas pelo Codex, usar só os comandos exatos da lista allow, conferir o alvo antes de gravar e adquirir o lock antes de consultar `schema_migrations`. Também pedia executar migration e seed duas vezes, comparando histórico, contagens, fingerprint e xmin, e validar `/health` 200 → 503 → 200 na mesma instância. A publicação seria por PR para `develop` com auto-merge, sem promoção para `main` nem início da F1-T3.
- **Intervenção humana:** aprovação do plano, do pull do PostgreSQL 17 Alpine, de `pg` e `@types/pg` em container, da migration estrutural e da seed somente em `db/tourflow` e da publicação por PR (`CLAUDE.md` §5, `docs/governanca.md` §15). As permissões foram preparadas pelo Codex. O responsável executou no Windows a verificação HTTP que estava pendente.
- **Gerado pela IA (Claude Code):** `db/migrations/0001_initial_schema.sql`, `db/seeds/0001_demo_catalog.sql`, `src/infra/db/*.ts`, `src/http/routes/health.ts`, as mudanças em `src/app.ts`, `src/server.ts`, `src/config/env.ts`, `Dockerfile`, `docker-compose.yml` e `.env.example`, os testes `tests/unit/health.test.ts` e `tests/unit/app.test.ts`, o README e os registros deste arquivo e de `docs/estado-execucao.md`.
- **Gerado por ferramenta:** as entradas de `pg` 8.23.1 e `@types/pg` 8.23.1 no `package.json` e no `package-lock.json`, criadas pelo `npm install --save-exact` em container.
- **Revisão (escolhas de implementação):**
  - Variáveis discretas `DB_*` em vez de connection string. `PG*` e `DATABASE_URL` são rejeitadas, porque o `pg` lê `PGOPTIONS` e outras variáveis implicitamente.
  - Listener `error` no pool, para que a queda do banco não derrube a API.
  - Imagem fixada como `postgres:17.11-alpine@sha256:…`, porque o `cat /etc/alpine-release` não pôde ser executado.
  - Senha local fictícia como valor padrão no Compose, porque o CI valida o Compose sem `.env`.
- **Validação:**
  - Pelo Claude Code: Q via Compose (lint, typecheck, build com exit 0 e 25 de 25 testes). Migration 2× (`Applied 1 migration(s)`, depois `No pending migrations`; histórico igual). Seed 2× (`2`/`4` inserções, depois `0`/`0`; contagens, fingerprint `4213ee8b99f27b76d0d94eb021c0a2bc` e xmin `752` iguais). `api` healthy → unhealthy com `db` parado → healthy depois de restaurar, sempre no mesmo container.
  - Evidência inicialmente pendente: a chamada HTTP pelo host (`curl.exe … /health`) foi **negada** pela política de permissões. O 503 `UNAVAILABLE` estava comprovado pelo teste unitário da rota e, de forma indireta, pelo `HEALTHCHECK`.
  - Fechamento: o **responsável** executou no Windows, na mesma instância da API, `200` → `503 UNAVAILABLE` com `db` parado → `200` depois da restauração. Publicação pelo PR #6 (commit `f4c5db9`), mesclado em `develop` no merge `2e1a6e3`, com CI `43024218169` verde.

### F1-T3 — Consultas de catálogo (2026-11-11)

- **Objetivo:** `GET /experiences` e `GET /departures` (PRD RF-01 e RF-02) lendo o PostgreSQL existente, com filtro `experienceId`.
- **Prompt (resumo):** Ralph Loop (até três iterações) com a F1-T3 já aprovada. Pedia conferir `jq`, `perl`, `origin`, a base `2e1a6e3` e as quatro alterações do Codex; usar só os comandos exatos da lista allow; validar `experienceId` com Zod e SQL parametrizado; responder 200 com array vazio para UUID inexistente e 400 `VALIDATION_ERROR` sem eco para filtro inválido, vazio, repetido ou desconhecido; preservar `/health`, 404 e 500; comparar contagens e fingerprint antes e depois; comprovar seis respostas HTTP dentro do contêiner. Proibia instalar dependências, rodar migrations ou seed, alterar dados, operações Git de escrita e o início da F1-T4.
- **Intervenção humana:** aprovação da F1-T3, do Ralph Loop e da publicação por PR para `develop` após validação (`CLAUDE.md` §5, `docs/governanca.md` §16). As permissões e o registro de governança foram preparados pelo Codex.
- **Gerado pela IA (Claude Code):** `src/repositories/catalog-repository.ts`, `src/repositories/pg/pg-catalog-repository.ts`, `src/services/catalog-service.ts`, `src/http/controllers/catalog-controller.ts`, `src/http/routes/catalog.ts`, as mudanças em `src/app.ts` e `src/server.ts`, `tests/unit/catalog.test.ts`, os ajustes de fakes em `tests/unit/app.test.ts` e `tests/unit/health.test.ts`, o README e os registros deste arquivo e de `docs/estado-execucao.md`.
- **Revisão (escolhas de implementação):**
  - Uma única consulta com `WHERE $1::uuid IS NULL OR experience_id = $1::uuid`, em vez de SQL montado conforme o filtro.
  - A saída não expõe `reservedSeats`; expõe `availableSeats`, calculado no service.
  - `GET /experiences` não valida query string (não há parâmetros definidos); a validação strict vale para `GET /departures`.
  - O controller retorna mensagem fixa (`Invalid query parameters`), sem detalhes do Zod, para não ecoar a entrada.
- **Validação:**
  - Pelo Claude Code: lint, typecheck e build com exit 0; 41 de 41 testes. API reconstruída e saudável; seis respostas comprovadas no contêiner `api` (`/experiences` 200, `/departures` 200, filtro existente 200 com 2 saídas, filtro inexistente `200 []`, filtro `abc` 400 `VALIDATION_ERROR`, `/health` 200). Contagens, fingerprint `4213ee8b99f27b76d0d94eb021c0a2bc` e xmin `752` iguais antes e depois.
  - Pelo host (Codex, Windows), separada das evidências do loop: `/experiences` 200 com 2 registros; `/departures` 200 com 4 registros em ordem de início, vagas 12, 8, 12 e 8, `startsAt` em ISO UTC e `priceCents` inteiro; filtro existente 200 com só as duas saídas correspondentes; UUID válido inexistente `200 []`; filtro `abc` 400 `VALIDATION_ERROR` sem eco; `/health` 200 com banco disponível.
  - Publicação (fora do loop): stage explícito, commit `feat: add catalog queries (F1-T3)`, push, PR para `develop` e auto-merge com `--match-head-commit`, executados pelo Claude Code com os comandos enumerados em `.claude/settings.json`. Testes, migrations e seed não foram repetidos.

### Bloco 1 — F1-T4, F1-T5, F2-T1 e F2-T2 (2026-11-11)

- **Objetivo:** `POST /reservations` e `GET /reservations/:id` com prevenção de sobre-reserva (PRD RF-03 a RF-06), fluxo E2E documentado, testes unitários das regras e suíte de integração permanente contra o `db-test`.
- **Prompt (resumo):** Ralph Loop (até três iterações) com o Bloco 1 aprovado. Pedia criar `feat/f1-t4-reservations` a partir de `origin/develop` em `59b1517` preservando as três alterações do Codex; usar só os comandos exatos da lista allow; validação strict; `201` com `Location`, `200`, `400`, `404`, `409 DEPARTURE_CLOSED`, `409 NO_AVAILABILITY` e `500` genérico, sem devolver nome e e-mail; numa conexão e transação, `SELECT FOR UPDATE`, `clock_timestamp()` lido depois do bloqueio, verificação, `INSERT`, `UPDATE reserved_seats` e `COMMIT`, com `lock_timeout` 1500 ms, `statement_timeout` 1800 ms e `idle_in_transaction_session_timeout` 5 s; rollback e descarte da conexão em estado incerto; guardas `db-test:5432/tourflow_test` + `current_database()` antes do schema e das fixtures; prova de concorrência (2 × 2 vagas, capacidade 3, duas esperas observadas) e de saída encerrada durante a espera; duas sondas E2E no runtime local só depois da integração verde. Proibia instalar dependências, alterar o CI, criar SQL de migration, excluir volumes, Git de escrita no loop, promoção para `main` e o Bloco 2.
- **Intervenção humana:** aprovação do Bloco 1 em um PR, do Ralph Loop, da aplicação do schema existente e de fixtures somente no `db-test` e de uma única reserva fictícia de duas vagas no `db/tourflow` (`CLAUDE.md` §5, `docs/governanca.md` §17). As permissões, incluindo as duas sondas E2E exatas, foram preparadas pelo Codex.
- **Gerado pela IA (Claude Code):** `src/domain/reservation.ts`, `src/repositories/reservation-repository.ts`, `src/repositories/pg/pg-reservation-repository.ts`, `src/services/reservation-service.ts`, `src/http/controllers/reservation-controller.ts`, `src/http/routes/reservations.ts`, `src/infra/db/migrations.ts` (extraído de `migrate.ts`), as mudanças em `src/app.ts`, `src/server.ts`, `src/infra/db/migrate.ts`, `docker-compose.yml` (`TEST_DB_*` no `dev`), `package.json` (scripts), `tsconfig.json`, `vitest.config.ts`, `vitest.integration.config.ts`, `tests/helpers/*`, `tests/integration/reservations.test.ts`, `tests/unit/reservation.test.ts`, `tests/unit/pg-reservation-repository.test.ts`, os ajustes de fakes e guardas em `tests/unit/{app,catalog,health}.test.ts`, o README e os registros deste arquivo e de `docs/estado-execucao.md`.
- **Revisão (escolhas de implementação):**
  - As regras ficam no domínio (`assertReservable`) e são passadas ao repositório como `guard`, executado dentro da transação com a saída bloqueada. Assim o repositório não decide regra de negócio e os unitários usam um repositório fake.
  - `clock_timestamp()` em consulta própria depois do `FOR UPDATE`, sem depender da ordem de avaliação dentro da mesma instrução.
  - A conexão volta ao pool somente após erro de domínio com `ROLLBACK` confirmado; qualquer outro erro (incluindo `lock_timeout`, falha no `COMMIT` ou no `ROLLBACK`) a descarta. `lock_timeout` vira `500`, porque o PRD reserva o `503` ao healthcheck.
  - A integração não apaga dados: cada teste cria fixtures com UUIDs novos e o tmpfs é descartado ao parar o `db-test`. O schema é aplicado pela mesma função do migrador (`applyMigrations`), chamada só depois das guardas do alvo de teste.
  - `vitest.config.ts` passou a incluir apenas `tests/unit/`, para que o `npm run test` do CI continue sem banco.
  - Falhas intermediárias corrigidas no loop: tipagem de um fake e um parâmetro padrão no teste ([estado-execucao.md](estado-execucao.md)).
- **Validação:**
  - Pelo Claude Code: lint, typecheck e build com exit 0; 96 de 96 unitários; integração 9 de 9 em tmpfs recém-criado e de novo 9 de 9 no mesmo tmpfs (`No pending migrations`); concorrência com 2 esperas observadas, `[201, 409]`, 1 reserva, `reserved_seats = 2`; saída encerrada durante a espera com `409 DEPARTURE_CLOSED` e nada gravado.
  - E2E no runtime: `201` + `200` com corpo idêntico para a reserva fictícia `9c08f28d-1577-438f-848b-0ccc191e0bb0`, depois `409 NO_AVAILABILITY` com `availableSeats = 10` preservado; delta no `db/tourflow` de 1 reserva e 2 vagas somente na saída `3c9e7b52-…6b01`.
  - Pelo host (Codex, Windows, somente leitura): `GET /reservations/9c08f28d-1577-438f-848b-0ccc191e0bb0` → `200`, `CONFIRMED`, 2 participantes, sem nome nem e-mail; `GET /departures` filtrado → saída da demonstração com capacidade 12 e 10 vagas; `GET /health` → `200`.
  - Alcance: naquele momento, os 96 unitários rodavam no CI hospedado; os 9 testes de integração, incluindo a prova de concorrência, rodavam apenas localmente. A integração entrou no CI no Bloco 2.
  - Publicação (fora do loop): stage explícito, commit, push, PR para `develop` e auto-merge com `--match-head-commit`, executados pelo Claude Code com os comandos enumerados em `.claude/settings.json`. POST, migrations e testes não foram repetidos.

---

## F2 — Testes e CI

F2-T1 (unitários) e F2-T2 (integração) foram entregues no [Bloco 1](#bloco-1--f1-t4-f1-t5-f2-t1-e-f2-t2-2026-11-11), acima.

### Bloco 2 — F2-T3 e F2-T4: cobertura e integração no CI (2026-11-11)

- **Objetivo:** cobertura v8 com limiar de 80% de linhas e branches em `src/domain` e `src/services` (PRD RNF-04) e execução da suíte de integração com PostgreSQL real no CI (RNF-05).
- **Prompt (resumo):** Ralph Loop (até três iterações) com o Bloco 2 aprovado. Pedia conferir `jq`, `perl`, `origin` e o diff; `fetch --prune`, confirmar a remoção remota da branch anterior e a ancestralidade de `61c6c65`; fast-forward de `develop` pelo refspec autorizado; criar `feat/f2-t3-coverage-ci` preservando as três alterações do Codex e só então apagar a branch anterior; instalar somente `@vitest/coverage-v8@5.1.0` no contêiner, reconstruir `dev` e `npm ci`; incluir todos os arquivos de `src/domain` e `src/services`; não baixar limiares nem excluir código; no CI, preservar nome do job, `ubuntu-latest` e gatilhos, rodar cobertura e integração com `db-test` no mesmo job e projeto Compose, resumo e limpeza `if: always()` sem `-v`. Proibia Git de publicação no loop, promoção para `main` e o Bloco 3.
- **Intervenção humana:** aprovação do Bloco 2, da dependência de cobertura, dos limiares e da integração no `db-test` do CI, com o check obrigatório preservado (`CLAUDE.md` §5, `docs/governanca.md` §18). Permissões preparadas pelo Codex.
- **Gerado pela IA (Claude Code):** `vitest.config.ts` (bloco `coverage`), o script `test:coverage`, as mudanças em `.github/workflows/ci.yml`, o README e os registros deste arquivo e de `docs/estado-execucao.md`.
- **Gerado por ferramenta:** a entrada `@vitest/coverage-v8` 5.1.0 no `package.json` e no `package-lock.json`, criada por `npm install --save-dev --save-exact` em contêiner.
- **Revisão (escolhas de implementação):**
  - A cobertura é medida só nos unitários, que são os testes das regras; a integração roda separada, sem cobertura, para não mascarar lacunas dos unitários.
  - Reporter `json-summary` para que o resumo do CI mostre os percentuais reais, lidos com `jq` do arquivo gerado.
  - O `db-test` sobe depois da cobertura, para que uma falha de unitários não gaste tempo com o PostgreSQL; o build fica por último.
- **Validação:**
  - Pelo Claude Code: `compose config`, lint, typecheck e build com exit 0; `test:coverage` com exit 0, 96 testes, 100% de linhas (29/29) e de branches (8/8); integração com exit 0, 9 de 9 em tmpfs novo, sem oscilação nas provas de concorrência. Nenhum teste novo foi necessário.
  - CI hospedado: PR #9 mesclado em `develop` no merge `8c18f24f7d840fa96e4541d030acd4dbc4a5b8be`; CI `43037580198` verde com cobertura e integração. `d075476` confirmado como ancestral de `origin/develop`; branch remota excluída e branch local removida com `git branch -d`.

---

## F3 — Observabilidade e contrato

### Bloco 3 — F3-T1 a F3-T4: logs, métrica, SLO, OpenAPI, ADR e README (2026-11-11)

- **Objetivo:** logs Pino em JSON com request ID (PRD RNF-07), métrica `tourflow_reservations_confirmed_total` em `/metrics`, SLO educacional documentado (RNF-08, sem medição), contrato OpenAPI 3.1 das reservas e ADR/README com evidências e tabela SOLID.
- **Prompt (resumo):** Ralph Loop (até três iterações) com o Bloco 3 aprovado. Pedia as pré-checagens (`jq`, `perl`, `origin`, diff, `fetch --prune`, ancestralidade de `d075476`, branch remota excluída), fast-forward de `develop`, criação de `feat/f3-observability-openapi` preservando as três alterações e só então `git branch -d` da anterior; instalar somente `pino` e `prom-client` (produção) e `@apidevtools/swagger-parser` (dev) com versões exatas em Docker, reconstruir `dev` e `npm ci`; uma linha de log por requisição com `requestId` gerado na API e devolvido no cabeçalho, `method`, padrão da rota, `statusCode`, `durationMs` e `errorCode`, sem URL bruta, query, corpo, credenciais, nome, e-mail ou objeto de erro; contrato HTTP preservado; `Registry` próprio; incremento só depois da confirmação no banco, sem que falha de instrumentação vire erro HTTP; prova no `db-test` de que 201 incrementa e 409 não; nenhuma reserva em `db/tourflow`; OpenAPI validado com swagger-parser e referências locais; SLO documentado sem medir. Proibia k6, Git de publicação no loop, promoção para `main` e o Bloco 4.
- **Intervenção humana:** aprovação do Bloco 3, das três dependências e da publicação para `develop` fora do loop (`CLAUDE.md` §5, `docs/governanca.md` §19). O Codex preparou 17 entradas de permissão. Outras duas entradas exatas (o `logs --tail 20 --no-log-prefix api` e o filtro `jq -ec` usado para validar os logs) foram solicitadas durante o loop pela confirmação de permissão e aprovadas pelo responsável humano para automação governada. Total: +19 linhas em `.claude/settings.json`, sem mudança em `ask`/`deny`. O merge foi autorizado pelo responsável depois da auditoria externa.
- **Gerado pela IA (Claude Code):** `src/infra/logger.ts`, `src/infra/metrics.ts`, `src/http/middlewares/request-context.ts`, `src/http/routes/metrics.ts`, `src/http/send-error.ts`, as mudanças em `src/app.ts`, `src/server.ts`, `src/services/reservation-service.ts`, nos controllers, em `/health`, no 404 e no `errorHandler`; `docs/openapi.yaml`; `tests/unit/observability.test.ts`, `tests/unit/openapi.test.ts`, o ajuste do caso 500 em `tests/unit/app.test.ts` e a prova da métrica em `tests/integration/reservations.test.ts`; README, ADR v1.2 e os registros deste arquivo e de `docs/estado-execucao.md`.
- **Gerado por ferramenta:** as entradas `pino` 10.4.0, `prom-client` 15.1.3 e `@apidevtools/swagger-parser` 13.1.0 no `package.json` e no `package-lock.json`, criadas por `npm install --save-exact` em contêiner.
- **Revisão (escolhas de implementação):**
  - O service recebe a métrica como callback `onConfirmed` (DIP): não importa `prom-client`, e o callback é chamado só depois de `repository.create` resolver, ou seja, após o `COMMIT`. Exceções do callback são absorvidas no service e no `recordReservationConfirmed`.
  - Todas as respostas de erro passam por `sendError`, que grava o código em `res.locals`; o middleware lê esse valor no `finish`. Assim o log não precisa inspecionar o corpo nem o erro.
  - `route` vem de `req.baseUrl + req.route.path`; sem rota casada, `unmatched`. O request ID enviado pelo cliente é ignorado para não permitir injeção de valores no log.
  - O `errorHandler` deixou de escrever no `console.error`: há uma única linha por requisição, e o 500 aparece com `errorCode` `INTERNAL_ERROR`.
  - `createApp` usa logger desligado e `Registry` novo quando nada é injetado, para não alterar os testes existentes.
  - `prom-client` 15.1.3 é marcado como *deprecated* no npm; mantido por ser a dependência aprovada.
  - Falha intermediária: o primeiro teste de falha do contador usou `vi.spyOn(Counter.prototype, 'inc')`, mas o `prom-client` define `inc` na instância; o teste passou a espionar o contador obtido do `Registry`.
- **Validação:**
  - Pelo Claude Code: `compose config`, lint, typecheck e build com exit 0; `test:coverage` com exit 0, 122 testes em 7 arquivos, 100% de linhas (32/32) e de branches (9/9); integração com exit 0, 10 de 10 em tmpfs novo, incluindo 201 incrementa / 409 não incrementa. Runtime: `/metrics` 200 com o contador; `/health` 200 e `/departures?experienceId=abc` 400, ambos com linhas JSON validadas por `jq` (a segunda com `errorCode` `VALIDATION_ERROR`); `db/tourflow` sem novas reservas.
  - Não executado no bloco: k6 e medição do SLO (Bloco 4).
  - Publicação e fechamento: revalidação em Docker antes do commit (mesmos resultados); commit `c5a83d0` com a mensagem autorizada, push, PR #10, CI `43047452444` verde, merge normal com `--match-head-commit` e sem `--auto` (merge `b76cd30`); CI de `develop` `43048277947` verde. Limpeza: `fetch --prune`, `merge-base --is-ancestor`, fast-forward de `develop` e `git branch -d`. Ressalvas técnicas abertas (stack no stderr com `headersSent`, linha de texto em `pool.ts`, requisição abortada sem log, `prom-client` deprecated, commit sem trailer `Co-Authored-By`) registradas em `docs/estado-execucao.md`.

---

## F4 — Desempenho e homologação

### Bloco 4 — F4-T1 a F4-T4: smoke k6, desempenho, segurança e documentação de entrega (2026-11-11)

- **Objetivo:** smoke k6 em container com p95 e SLO avaliados separadamente (PRD RNF-08, RNF-09), `docs/desempenho.md` com resultado real, revisão de segurança (RNF-12) e documentação de entrega (README, `CONTRIBUTORS.md`, este arquivo). O ensaio em clone limpo (F4-T5) fica fora do loop.
- **Prompt (resumo):** Ralph Loop (até três iterações). Pedia confirmar `origin`, a base `b76cd30` e as três mudanças de governança; criar `feat/f4-k6-homologation`; consultar o manifesto de `grafana/k6:1.0.0`, validar o digest do índice e baixar somente pela referência `tag@digest`, confirmando `RepoDigests` e versão; parametrizar projeto, porta no host, volumes e tags com os padrões atuais; serviço `k6` no profile `perf` sem porta; script de 1 VU por 30 s em `GET /departures` com intervalo de 50 ms; p95 `<500` e `slo_departures_ok >= 99%` separados, com SLO inconclusivo abaixo de 200 amostras; uma medição oficial, somente leitura; registrar todas as medições, falhas e o código de saída (o 99 é resultado); revisão de segredos, portas, imagens, dependências, permissões e CI sem alterar `ci.yml`; documentação com rastreabilidade da rubrica e os comandos do clone para o responsável. Proibia commit, push, PR e F4-T5 no loop, promoção para `main` e Moodle.
- **Intervenção humana:** aprovação do Bloco 4, do pull de `grafana/k6:1.0.0` por digest, da parametrização do Compose e do nome em `CONTRIBUTORS.md` (Paulo Odilon Everton Rodrigues, @podilon). No plano original, o clone limpo seria executado pelo responsável, porque `git clone` era negado ao Claude Code; essa decisão foi substituída na F4-T5. Permissões e `docs/governanca.md` §20 preparados pela supervisão (`.claude/settings.json` +28).
- **Gerado pela IA (Claude Code):** `performance/smoke.js`, o serviço `k6` e a parametrização em `docker-compose.yml`, o bloco do k6 em `eslint.config.js`, as variáveis comentadas em `.env.example`, `docs/desempenho.md`, `CONTRIBUTORS.md`, as seções novas do README, este registro e o checkpoint em `docs/estado-execucao.md`.
- **Gerado por ferramenta:** `performance/results/smoke-summary.json`, escrito pelo `handleSummary` do k6 na execução oficial (não editado).
- **Revisão (escolhas de implementação):**
  - Intervalo de 50 ms em vez do 1 s típico de smoke: com 1 s, 30 s gerariam cerca de 30 amostras e o SLO seria sempre inconclusivo. A amostra real foi de 572.
  - O SLO é uma métrica `Rate` própria (`slo_departures_ok`), independente do threshold de p95. A classificação (`ATINGIDO`/`NAO_ATINGIDO`/`INCONCLUSIVO`) é calculada no `handleSummary` a partir de `passes + fails`.
  - O `handleSummary` não usa a jslib remota de resumo textual (que exigiria rede durante a execução); imprime um resumo próprio.
  - A parametrização usa `${VAR:-padrão}`, então o ambiente atual e o CI (que usa `-p "$CI_PROJECT"`) continuam idênticos; a configuração efetiva padrão foi conferida com `config --format json`.
  - A prova de "somente leitura" usa a impressão digital do catálogo (contagens e `md5`) antes e depois do smoke.
- **Validação:**
  - Pelo Claude Code: `config` dos profiles `perf` e `test` com exit 0; lint (incluindo o script k6), typecheck e build com exit 0; `test:coverage` 122/122 com 100% de linhas e branches; integração 10/10 no `db-test`; `/health` 200; smoke oficial único com **exit 0**: 572 requisições, p95 1,913 ms, `slo_departures_ok` 100% (572/572), SLO **ATINGIDO**; catálogo de `db/tourflow` idêntico antes e depois; `npm audit --omit=dev` 0, `npm audit` 10 moderadas conhecidas.
  - Não executado no bloco: F4-T5 e qualquer outra execução do k6.
  - Publicação: commit `2820b89` no PR #11.

### F4-T5 — Ensaio em clone limpo (2026-11-11)

- **Objetivo:** provar que a branch publicada do PR #11 (`2820b89d…8142`) sobe e passa pelo roteiro do README num clone novo e isolado, sem tocar no ambiente `tourflow`.
- **Prompt (resumo):** fazer todo o ensaio no Claude Code. Conferir o PR #11 e as seis alterações de governança. Clonar com o comando exato da lista allow em `.tourflow-f4-clean` e confirmar o SHA. Criar o `.env` fictício com projeto `tourflow_clean`, porta 3100, volumes e tag `clean`. Conferir a configuração efetiva antes de subir. Executar API, migrations, seed, HTTP 200, lint, typecheck, cobertura, integração, build e k6 com `RESULTS_DIR=../results/clone-rehearsal`. Parar só o clone, registrar a evidência, fazer commit e push, conferir o CI e pedir auto-merge sem polling. A promoção para `main` e o Moodle ficam fora.
- **Intervenção humana:** o responsável substituiu a execução manual do clone pela execução no Claude Code e atualizou `CLAUDE.md`, `docs/governanca.md` §20, `.claude/settings.json`, `.gitignore` e `.dockerignore`. Durante o ensaio, aprovou a cópia do `.env` com `cp`, porque a regra deny de leitura do `.env` também bloqueia a ferramenta Write. Como a deny `Bash(curl *)` bloqueou as duas entradas allow com `curl.exe`, o responsável escolheu verificar o HTTP com `fetch` dentro do container `api` do clone e com `compose port`.
- **Gerado pela IA (Claude Code):** o `.env` local do clone, que não é versionado, e os registros deste arquivo e de `docs/estado-execucao.md`.
- **Gerado por ferramenta:** `performance/results/clone-rehearsal/smoke-summary.json` no clone, escrito pelo k6. O arquivo não é versionado.
- **Revisão:** a evidência do clone é mantida separada da medição oficial e não a substitui.
- **Validação:**
  - Pelo Claude Code: SHA do clone `2820b89d03a1799fafdc46e1838a1c1391aa8142`; configuração efetiva isolada conferida; `up`, migrate e seed com exit 0; `/health` e `/departures` 200 na porta interna, com bind `127.0.0.1:3100`; lint, typecheck e build com exit 0; `test:coverage` 122/122 com 100% de linhas e branches; integração 10/10; k6 com exit 0, 571 requisições, p95 2,063 ms e SLO 100% (571/571) **ATINGIDO**; JSON oficial com SHA-256 inalterado; serviços do clone parados e volumes preservados.
  - Não executado: requisição HTTP pelo host em `127.0.0.1:3100`, bloqueada pela deny `Bash(curl *)`.
  - Publicação: commit `e66f47c` (`docs: record clean clone rehearsal (F4-T5)`) no PR #11, mesclado em `develop` em `cfb2d9d`; CI de `develop` `43057766477` verde.

---

## F5 — Congelamento e entrega

### F5-T1 e F5-T2 — Promoção de `develop` para `main` (2026-11-11)

- **Objetivo:** promover a versão revisada de `develop` para `main` e confirmar o CI de push no SHA resultante.
- **Prompt (resumo):** abrir o PR de `develop` para `main` no SHA aprovado `cfb2d9d04602c3feb997f86ebd4481f94ca2d1cf`, conferir as referências remotas, o check obrigatório `Foundation` e a ausência de bloqueios, e solicitar o merge com `--match-head-commit`, preservando as duas branches e sem polling.
- **Intervenção humana:** aprovação da promoção vinculada ao SHA `cfb2d9d` e preparação das permissões e da regra em `docs/governanca.md` §21. Esses ajustes locais ficaram fora do SHA promovido.
- **Gerado pela IA (Claude Code):** o PR #12 (`chore: promote develop to main for delivery (F5)`) e o pedido de merge.
- **Validação:** PR #12 mesclado em 2026-11-11 às 16:33:42 UTC, com `headRefOid` `cfb2d9d04602c3feb997f86ebd4481f94ca2d1cf` e merge `f0237c8bb653cc1262bbd97b86d4f10d981b42d7` em `main`. O CI de push [43059539492](https://github.com/podilon/tourflow-api/actions/runs/43059539492) concluiu com sucesso, com `headSha` igual ao merge: 122 unitários, cobertura 100%, 10 testes de integração.

### F5 — Revisão documental de entrega (2026-11-11)

- **Objetivo:** reorganizar a documentação para o avaliador conhecer o projeto, subir a API em Docker, reproduzir o fluxo de reservas e encontrar a evidência de cada critério da rubrica sem consultar o histórico de conversas.
- **Prompt (resumo):** atuar como revisor sênior da documentação; confirmar o estado do PR #12 e do run 43059539492 contra o SHA `f0237c8`; preservar os ajustes locais de permissões e governança fora do diff de entrega e aproveitar a atualização local do `ROADMAP.md`; reestruturar o README em onze seções, na ordem de leitura do avaliador, com uma matriz da rubrica (Critério, Peso, Requisito, Evidência, Como verificar); revisar ROADMAP, ADR, OpenAPI, desempenho, este arquivo, `CONTRIBUTORS.md` e o diário de execução; validar links, comandos e exemplos; preparar o diff e o checklist do Moodle sem publicar.
- **Intervenção humana:** definição do escopo, da ordem das seções e dos números a conferir; a publicação, a promoção do novo SHA e a submissão no Moodle aguardam autorização.
- **Gerado pela IA (Claude Code):** as revisões de `README.md`, `ROADMAP.md`, `docs/adr/0001-arquitetura.md`, `docs/desempenho.md`, `docs/ia.md`, `CONTRIBUTORS.md` e `docs/estado-execucao.md`. `docs/openapi.yaml`, código, dependências, CI e dados não foram alterados.
- **Revisão:** números conferidos com `performance/results/smoke-summary.json`, com os registros da F4-T5 e com o log do run 43059539492. O status do ADR passou de "Proposto" para "Aceito", conforme o G0 e a implementação, e a decisão foi preservada.
- **Segunda rodada (acabamento editorial):** o responsável pediu que o README fosse a página de entrada da avaliação, com subtítulo de valor, navegação curta, badge do CI de `main`, cobertura identificada por medição, escopo e fonte, diagrama Mermaid, tabela de stack com versões verificadas, tabela de variáveis com obrigatoriedade, governança de branches e commits (distinguindo convenção de exigência do GitHub) e seção de entrega com o run exato. Também pediu o vínculo do status do ADR ao registro do G0, destaque de método, resultado oficial, ensaio e limitações em `docs/desempenho.md` e um texto pronto para o Moodle.
- **Revisão da segunda rodada:** versões conferidas no `Dockerfile`, no `docker-compose.yml` e no `package-lock.json`; rulesets e configuração de merge conferidos pela API do GitHub; o `availableSeats` exibido pelo catálogo e a decisão sob bloqueio no domínio foram descritos separadamente, como estão no código. `docs/openapi.yaml` foi conferido contra o README e não precisou de alteração.
- **Validação:** as verificações executadas e as baseadas em evidências existentes estão listadas no checkpoint da F5 em [estado-execucao.md](estado-execucao.md).
