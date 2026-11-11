# TourFlow API — Estado de Execução

## Identificação

- Projeto: TourFlow API
- Curso: Full Cycle — Projeto Final B
- Prazo de entrega: 13/11/2026
- Repositório: https://github.com/podilon/tourflow-api

## Arquitetura de trabalho

- Codex: supervisão de arquitetura, qualidade e requisitos.
- Claude Code: implementação, testes e correções.
- Responsável humano: aprovações, commits e publicação.

## Marcos confirmados pelo Git

| Marco | Commit | Situação |
| --- | --- | --- |
| F0 / Gate G0 | `2f6bd56`, `d9b59b3` | Concluída e aprovada |
| F1-T0 — Permissões | `1b8bd05` | Concluída, com limitações em `docs/governanca.md` |
| PREP-AUTO — Skill e checkpoint | `fdbe62d` | Concluída |
| F1-T1 — Fundação Docker-first e CI | `develop` em `fd74ca4` (PRs #1 a #4) | Concluída e mesclada |
| F1-T2 — PostgreSQL, migrations, seed e saúde | `f4c5db9`; merge `2e1a6e3` em `develop` (PR #6) | Concluída e mesclada; CI `43024218169` verde |
| F1-T3 — Consultas de catálogo | `c53363f`; merge `59b1517` em `develop` (PR #7) | Concluída e mesclada |
| Bloco 1 — F1-T4, F1-T5, F2-T1, F2-T2 | `61c6c65`; merge `90e238e` em `develop` (PR #8) | Concluído e mesclado |

## Checkpoint atual — Bloco 2: F2-T3 e F2-T4 (2026-11-11)

- Tarefas: cobertura com limiar (F2-T3) e integração com PostgreSQL no CI (F2-T4), num único PR (`docs/governanca.md` §18).
- Execução: Ralph Loop, iteração 1 de 3. Situação: **validado localmente**. Sem commit; commit, push, PR e auto-merge ficam fora do loop.
- Pré-checagens: `jq` → `/c/ProgramData/chocolatey/bin/jq`; `perl` → `/usr/bin/perl`; `origin` → `https://github.com/podilon/tourflow-api.git`; árvore com apenas as três alterações de governança preparadas pelo Codex (`.claude/settings.json`, `CLAUDE.md`, `docs/governanca.md` §18; +44 linhas), preservadas.
- Git: `git fetch --prune origin` removeu `origin/feat/f1-t4-reservations` e trouxe `develop` `59b1517..90e238e`; `ls-remote` confirma `develop` em `90e238e3074c…` e nenhuma branch curta remota; `git merge-base --is-ancestor 61c6c654… origin/develop` → exit 0. `develop` local atualizada por `git fetch origin refs/heads/develop:refs/heads/develop` (fast-forward, `90e238e`). `git switch -c feat/f2-t3-coverage-ci origin/develop` levou as três alterações; só então `git branch -d feat/f1-t4-reservations` (`was 61c6c65`).

### Implementação

- Dependência: `npm install --save-dev --save-exact @vitest/coverage-v8@5.1.0` no contêiner `dev` (12 pacotes; `package.json` e `package-lock.json` atualizados). `--profile dev build dev` e `npm ci` sincronizaram imagem e volume. O audit segue com as mesmas 10 ocorrências moderadas da cadeia de lint já registradas.
- `vitest.config.ts`: `coverage.provider: 'v8'`, `include` com `src/domain/**/*.ts` e `src/services/**/*.ts` (arquivos não importados entram com 0%), reporters `text` e `json-summary`, `thresholds` de 80% para `lines` e `branches`. Nenhum arquivo excluído, nenhum limiar reduzido. `package.json`: script `test:coverage` (`vitest run --coverage`).
- `.github/workflows/ci.yml`: mesmo nome de job (`Foundation (Compose lint, typecheck, test, build)`), `ubuntu-latest` e gatilhos inalterados. O passo `Test` virou `Test with coverage`; novos passos `Start db-test` (`--profile test up -d --wait db-test`) e `Integration tests` (`test:integration`) antes do build; resumo com as novas linhas e os percentuais lidos de `coverage/coverage-summary.json`; encerramento `if: always()` com `--profile dev --profile test down --remove-orphans`, sem `-v`. Todas as etapas usam `-p "$CI_PROJECT"`.
- Nenhum teste novo foi necessário: a cobertura já era 100%.

### Verificações executadas

| Verificação | Resultado |
| --- | --- |
| `compose config --quiet` | exit 0 |
| `run --rm --no-deps dev npm run lint` | exit 0, sem avisos |
| `run --rm --no-deps dev npm run typecheck` | exit 0 |
| `run --rm --no-deps dev npm run test:coverage` | exit 0; 96 testes em 5 arquivos; linhas 100% (29/29), branches 100% (8/8), statements 100% (35/35), funções 100% (16/16) |
| Cobertura por arquivo | `domain/reservation.ts` 16/16 linhas, 6/6 branches; `services/catalog-service.ts` 5/5 linhas, 0 branches; `services/reservation-service.ts` 8/8 linhas, 2/2 branches |
| `--profile test up -d --wait db-test` | tmpfs novo; `Healthy` |
| `psql` no `db-test` antes da suíte | `tourflow_test`, `to_regclass('public.experiences')` vazio |
| `run --rm --no-deps dev npm run test:integration` | exit 0; schema aplicado (`Applied migration 0001_initial_schema`); 9 testes aprovados, incluindo as duas provas de concorrência, sem oscilação |
| `run --rm --no-deps dev npm run build` | exit 0 |
| `--profile test stop db-test` | `Stopped` (tmpfs descartado) |

O workflow foi revisado e só pode ser executado de fato no GitHub Actions. O primeiro run hospedado do PR será a evidência do CI.

### Estado deixado

- `api` e `db` em execução, sem alteração de dados; `db-test` parado. Volumes preservados.

## Checkpoint anterior — Bloco 1: F1-T4, F1-T5, F2-T1 e F2-T2 (2026-11-11)

- Tarefas: reservas (F1-T4), E2E manual documentado (F1-T5), testes unitários (F2-T1) e integração com PostgreSQL real (F2-T2), num único PR (`docs/governanca.md` §17).
- Branch: `feat/f1-t4-reservations`, criada por `git switch -c feat/f1-t4-reservations origin/develop` em `59b1517`, levando as três alterações de governança preparadas pelo Codex (`.claude/settings.json`, `CLAUDE.md`, `docs/governanca.md` §17), preservadas sem edição.
- Execução: Ralph Loop, iteração 1 de 3.
- Situação: **validado localmente**. Sem commit; commit, push, PR e auto-merge ficam fora do loop.
- Pré-checagens do Bash: `jq` → `/c/ProgramData/chocolatey/bin/jq`; `perl` → `/usr/bin/perl`.
- Nenhuma dependência instalada, nenhum SQL de migration novo, CI inalterado, nenhum volume excluído.

### Implementação

- `src/domain/reservation.ts`: schema strict do payload (Zod), schema do id, `DomainError` com códigos `NOT_FOUND`, `DEPARTURE_CLOSED`, `NO_AVAILABILITY` e a regra `assertReservable(snapshot, participants)`.
- `src/repositories/reservation-repository.ts` (contrato) e `src/repositories/pg/pg-reservation-repository.ts`: numa conexão do pool, `BEGIN` → `SET LOCAL lock_timeout '1500ms'`, `statement_timeout '1800ms'`, `idle_in_transaction_session_timeout '5s'` → `SELECT … FOR UPDATE` → `SELECT clock_timestamp()` → regra de domínio → `INSERT` → `UPDATE reserved_seats` → `COMMIT`. Falha → `ROLLBACK`; a conexão volta ao pool só após regra de negócio com rollback confirmado; nos demais casos é descartada (`release(true)`).
- `src/services/reservation-service.ts`, `src/http/controllers/reservation-controller.ts`, `src/http/routes/reservations.ts`; `src/app.ts` e `src/server.ts` injetam o serviço. Respostas sem nome e e-mail; `201` com `Location`.
- `src/infra/db/migrations.ts`: aplicação de migrations extraída de `migrate.ts` (mesmo comportamento) para reuso na integração. `migrate.ts` continua restrito a `db/tourflow` via `withWriteTarget`.
- Testes: `tests/unit/reservation.test.ts`, `tests/unit/pg-reservation-repository.test.ts`, guardas do alvo de teste em `tests/unit/health.test.ts`; `tests/helpers/test-db.ts`, `tests/helpers/global-setup.ts`, `tests/integration/reservations.test.ts`, `vitest.integration.config.ts`. `vitest.config.ts` passa a incluir só `tests/unit/`, então o `npm run test` do CI continua só com unitários.
- `docker-compose.yml`: o serviço `dev` recebe `TEST_DB_*` (alvo `db-test:5432/tourflow_test`). `package.json`: scripts `test:unit` e `test:integration`.

### Verificações executadas

| Verificação | Resultado |
| --- | --- |
| `run --rm --no-deps dev npm run lint` | exit 0, sem avisos |
| `run --rm --no-deps dev npm run typecheck` | exit 0 (a 1ª execução falhou por tipagem do fake em `pg-reservation-repository.test.ts`; corrigida) |
| `run --rm --no-deps dev npm run test:unit` | exit 0; 96 testes em 5 arquivos (a 1ª execução teve 1 falha no próprio teste: o parâmetro padrão do fake substituía `undefined`; corrigido) |
| `run --rm --no-deps dev npm run build` | exit 0 |
| `--profile test stop db-test` + `up -d --wait db-test` | tmpfs recriado; `Healthy` |
| `psql` no `db-test` antes da suíte | `current_database()` = `tourflow_test`; `to_regclass('public.experiences')` vazio |
| `run --rm --no-deps dev npm run test:integration` (1ª) | exit 0; `[db-test] Created schema_migrations`, `Applied migration 0001_initial_schema`; 9 testes aprovados |
| `run --rm --no-deps dev npm run test:integration` (2ª, mesmo tmpfs) | exit 0; `[db-test] No pending migrations`; 9 testes aprovados |
| Concorrência (integração) | 2 esperas pelo bloqueio observadas em `pg_stat_activity`; respostas `[201, 409 NO_AVAILABILITY]`; 1 reserva; `reserved_seats = 2` |
| Saída encerrada durante a espera (integração) | `xact_start` da transação da API anterior a `starts_at`; após o bloqueio, `409 DEPARTURE_CLOSED`; 0 reservas, `reserved_seats = 0` (~720 ms de teste) |
| `--profile test stop db-test` após os testes | `Stopped` (tmpfs descartado) |

### E2E no runtime local (após a integração verde)

| Etapa | Resultado |
| --- | --- |
| Linha de base em `db/tourflow` | 4 saídas, todas com `reserved_seats 0` e 0 reservas |
| `up --build -d --wait api` | imagem `runtime` reconstruída; `tourflow-db-1 Healthy`, `tourflow-api-1 Healthy` |
| Sonda 1 (alvo conferido: `DB_HOST=db`, `5432`, `current_database() = tourflow`; 0 reservas → POST) | `HTTP 201 9c08f28d-1577-438f-848b-0ccc191e0bb0`, `Location` correto; `HTTP 200` com corpo idêntico: `{"id":"9c08f28d-1577-438f-848b-0ccc191e0bb0","departureId":"3c9e7b52-6a0f-4d8e-8b1c-5f2a9d4e6b01","participants":2,"status":"CONFIRMED","createdAt":"2026-11-11T14:03:52.812Z"}`, sem nome nem e-mail |
| Sonda 2 (`participants: 11`) | `HTTP 409 NO_AVAILABILITY`; `availableSeats = 10` antes e depois |
| Delta em `db/tourflow` | só a saída `3c9e7b52-…6b01`: `reserved_seats 0 → 2`, reservas `0 → 1`, participantes `2`; as outras três saídas inalteradas |

Reserva fictícia da demonstração: `9c08f28d-1577-438f-848b-0ccc191e0bb0` (cliente `Cliente Ficticio E2E`, `cliente.e2e@example.test`). Se a sonda 1 for repetida, ela reutiliza essa reserva em vez de criar outra.

### Verificação pelo host (Windows, executada pelo Codex, somente leitura)

Evidência separada das anteriores, obtida em `127.0.0.1:3000` a partir do Windows, depois do loop:

| Requisição | Resultado |
| --- | --- |
| `GET /reservations/9c08f28d-1577-438f-848b-0ccc191e0bb0` | `200`, `status` `CONFIRMED`, 2 participantes, sem nome nem e-mail |
| `GET /departures` filtrado pela experiência da demonstração | saída `3c9e7b52-…6b01` com `capacity` 12 e `availableSeats` 10 |
| `GET /health` | `200` |

### Natureza de cada evidência

- **Unitários (96):** executados pelo Claude Code via Compose, sem banco, com fakes. São os únicos que o CI hospedado executa hoje (`npm run test`).
- **Integração (9):** executados pelo Claude Code localmente via Compose contra o `db-test` (tmpfs). **Ainda não rodam no CI**.
- **Prova de concorrência:** faz parte desses 9 testes de integração locais (duas esperas observadas, `[201, 409]`, 1 reserva, `reserved_seats = 2`, além da saída encerrada durante a espera). **Ainda não roda no CI**.
- **E2E no runtime:** as duas sondas do Claude Code dentro do contêiner `api` (POST/GET e 409).
- **Host:** as três leituras do Codex no Windows (acima), sem nenhuma escrita.

### Estado deixado

- `api` e `db` em execução; `db-test` parado (tmpfs descartado). Volumes `tourflow_pgdata` e `tourflow_dev_node_modules` preservados.

### Pendências

- Commit, push, PR para `develop` e auto-merge: fora do loop.
- Cobertura e integração no CI: próximo bloco.

## Checkpoint anterior — F1-T3 (2026-11-11)

- Tarefa: F1-T3 — Consultas de catálogo (`GET /experiences`, `GET /departures`).
- Branch: `feat/f1-t3-catalog-queries`, criada a partir de `origin/develop` em `2e1a6e3`, levando as quatro alterações de governança preparadas pelo Codex (`.claude/settings.json`, `.gitignore`, `CLAUDE.md`, `docs/governanca.md` §16).
- Execução: Ralph Loop, iteração 1 de 3.
- Situação: **validada localmente (Ralph Loop) e pelo host (Codex, Windows)**. Publicação por PR para `develop` com auto-merge.
- Pré-checagens do Bash: `command -v jq` → `/c/ProgramData/chocolatey/bin/jq` (`jq-1.8.1`); `command -v perl` → `/usr/bin/perl`; `origin` → `https://github.com/podilon/tourflow-api.git`; `origin/develop` = `HEAD` = `2e1a6e3d5516…`; árvore com apenas as quatro alterações esperadas (+48 linhas).

### Implementação

- `src/repositories/catalog-repository.ts`: contrato de leitura. `src/repositories/pg/pg-catalog-repository.ts`: SQL estático; o filtro vai sempre em `$1::uuid` (`NULL` = sem filtro). Ordenação estável: experiências por `name, id`; saídas por `starts_at, id`.
- `src/services/catalog-service.ts`: `startsAt` via `toISOString()` (UTC) e `availableSeats = capacity − reservedSeats`.
- `src/http/controllers/catalog-controller.ts`: `z.strictObject({ experienceId: z.uuid().optional() })`. Inválido, vazio, repetido (array) ou desconhecido → 400 `VALIDATION_ERROR` com mensagem fixa.
- `src/http/routes/catalog.ts`, `src/app.ts` (nova dependência `catalogService`) e `src/server.ts` (injeção do repositório PostgreSQL).
- Nenhuma dependência instalada; nenhuma migration ou seed executada.

### Verificações executadas

| Verificação | Resultado |
| --- | --- |
| Linha de base (antes das consultas) | experiences 2, reservations 0, departures 4, futuras 4, fingerprint `4213ee8b99f27b76d0d94eb021c0a2bc`; xmin das 6 linhas `752` |
| `run --rm --no-deps dev npm run lint` | exit 0, sem avisos |
| `run --rm --no-deps dev npm run typecheck` | exit 0 |
| `run --rm --no-deps dev npm run test` | exit 0; 41 testes aprovados em 3 arquivos (16 novos em `catalog.test.ts`) |
| `run --rm --no-deps dev npm run build` | exit 0 |
| `up --build -d --wait api` | imagem reconstruída; `tourflow-db-1 Healthy`, `tourflow-api-1 Healthy` |
| `GET /experiences` (no contêiner `api`) | `200`, 2 experiências ordenadas por nome |
| `GET /departures` | `200`, 4 saídas por `startsAt` (11-18, 11-21, 11-25, 12-02, 09:00 UTC), `availableSeats` = `capacity` |
| `GET /departures?experienceId=8f0c…7a01` | `200`, só as 2 saídas do passeio de barco |
| `GET /departures?experienceId=aaaaaaaa-…` | `200 []` |
| `GET /departures?experienceId=abc` | `400 {"error":{"code":"VALIDATION_ERROR","message":"Invalid query parameters"}}`, sem eco |
| `GET /health` | `200 {"status":"ok","database":"up"}` |
| Contagens, fingerprint e xmin depois das consultas | idênticos à linha de base: 2 / 0 / 4 / 4, `4213ee8b…`, todas as linhas `752` |

As linhas acima foram executadas pelo Claude Code no Ralph Loop: 41 testes via Compose e seis sondas HTTP **dentro do contêiner `api`**.

### Verificação pelo host (Windows, executada pelo Codex)

Evidência separada das sondas no contêiner, obtida em `127.0.0.1:3000` a partir do Windows:

| Requisição | Resultado |
| --- | --- |
| `GET /experiences` | `200`, 2 registros |
| `GET /departures` | `200`, 4 registros em ordem de início; vagas 12, 8, 12 e 8; `startsAt` em ISO UTC; `priceCents` inteiro |
| `GET /departures?experienceId=<UUID existente>` | `200`, somente as duas saídas correspondentes |
| `GET /departures?experienceId=<UUID válido inexistente>` | `200 []` |
| `GET /departures?experienceId=abc` | `400 VALIDATION_ERROR`, sem ecoar a entrada |
| `GET /health` | `200`, banco disponível |

### Estado deixado

- `api`, `db` e `db-test` em execução. Volumes `tourflow_pgdata` e `tourflow_dev_node_modules` preservados.

## Fechamento da F1-T2 (2026-11-11)

- PR #6 (`feat/f1-t2-postgresql-foundation` → `develop`), commit `f4c5db9`, mesclado em `2e1a6e3`. CI `43024218169` verde.
- A evidência HTTP pelo host, antes pendente, foi executada pelo responsável no Windows, na mesma instância da API: `200` → (`db` parado) `503 UNAVAILABLE` → (`db` restaurado) `200`.

## Checkpoint anterior — F1-T2 (2026-11-11)

- Tarefa: F1-T2 — Banco, migrations, seed e saúde.
- Branch: `feat/f1-t2-postgresql-foundation`, criada a partir de `origin/develop` em `fd74ca4`, levando as três alterações de governança do Codex (`.claude/settings.json`, `CLAUDE.md`, `docs/governanca.md` §15).
- Rodadas de correção: 0 de 3.
- Situação: **critérios verificados localmente, com a evidência HTTP pelo host pendente** (ver abaixo).

### Ambiente e imagem

- Docker 29.9.2 linux/amd64, Compose v5.6.1, contexto `desktop-linux`.
- `docker pull postgres:17-alpine` → digest `sha256:3540c0362c809df084ffac0ae69fe794515f9de92692f02178bcdce0ef0302ac`; `postgres --version` → `PostgreSQL 17.11`.
- O Compose fixa a imagem como `postgres:17.11-alpine@sha256:3540c036…`.
- `cat /etc/alpine-release` falhou com exit 1. O Git Bash converteu o caminho para `C:/Program Files/Git/etc/alpine-release` (conversão MSYS). Não foi uma recusa da política. A versão do Alpine fica **não verificada** e foi omitida da tag. O log do servidor mostra `compiled by gcc (Alpine 15.2.0)`.
- Antes da execução, o volume `tourflow_pgdata` não existia. Ele foi criado pelo primeiro `up db` e preservado durante todo o ciclo.

### Dependências

- `npm install --save-exact pg` → `pg` 8.23.1 em produção. `npm install --save-dev --save-exact @types/pg` → 8.23.1. Os dois rodaram em container.
- No runtime, `npm ls --omit=dev --depth=0` mostra express 5.3.0, pg 8.23.1 e zod 4.6.7. O `npm ci --omit=dev` do build informou `found 0 vulnerabilities`. As 10 ocorrências moderadas da cadeia de lint continuam como ressalva da F1-T1.

### Verificações executadas

| Verificação | Resultado |
| --- | --- |
| `compose config --quiet` | exit 0 |
| `--profile dev build dev` | exit 0 |
| `run --rm --no-deps dev npm run lint` | exit 0, sem avisos |
| `run --rm --no-deps dev npm run typecheck` | exit 0 |
| `run --rm --no-deps dev npm run test` | exit 0; 25 testes aprovados em 2 arquivos |
| `run --rm --no-deps dev npm run build` | exit 0 |
| `up -d --wait db` | `tourflow-db-1 Healthy` |
| `up --build -d --wait api` | imagem `runtime` construída com `COPY db` e `HEALTHCHECK`; `tourflow-api-1 Healthy` |
| `psql`: `current_database()`, `to_regclass('public.schema_migrations')` antes da migration | `tourflow`, vazio (tabela ausente) |
| migration, 1ª execução | `Created schema_migrations`, `Applied migration 0001_initial_schema`, `Applied 1 migration(s)` |
| migration, 2ª execução | `No pending migrations`; histórico antes e depois: `0001_initial_schema` |
| seed, 1ª execução | `Seed inserted 2 experience(s) and 4 departure(s)` |
| contagens e fingerprint antes da 2ª seed | experiences 2, reservations 0, departures 4, futuras 4, `4213ee8b99f27b76d0d94eb021c0a2bc` |
| xmin antes da 2ª seed | 6 linhas, todas `752` |
| seed, 2ª execução | `Seed inserted 0 experience(s) and 0 departure(s)` |
| contagens, fingerprint e xmin depois da 2ª seed | idênticos: 2 / 0 / 4 / 4, `4213ee8b…`, todas as linhas `752`; histórico de migrations inalterado |
| `ps -q api` antes de parar o banco | `d959ee589f89…` |
| `stop db` | `tourflow-db-1 Stopped`; log da API: `PostgreSQL idle client error; connection discarded` (processo não caiu) |
| `ps` com `db` parado | `tourflow-api-1 … (unhealthy)`, porque o `HEALTHCHECK` recebeu resposta não-2xx de `/health` |
| `up -d --wait db` (restauração) | `Healthy`; `ps -q api` → mesmo `d959ee589f89…`; `api` voltou a `(healthy)` |
| contagens e fingerprint depois da restauração | 2 / 0 / 4 / 4, `4213ee8b…` (dados persistidos no volume) |
| `--profile test up -d --wait db-test` | `Healthy`; `pg_isready -U tourflow -d tourflow_test` → `accepting connections` |
| `inspect … HostConfig.Tmpfs` de `tourflow-db-test-1` | `{"/var/lib/postgresql/data":""}` |
| `port db 5432` / `port db-test 5432` | `:0` (nenhuma porta publicada) |
| `port api 3000` | `127.0.0.1:3000` |
| `exec -T api id -u` | `1000` (não-root) |
| Isolamento | Com `db` parado e `db-test` saudável, a API ficou `unhealthy`: ela não alcança o `db-test` |

### Evidência pendente (resolvida no fechamento acima)

- `curl.exe --include --max-time 10 http://127.0.0.1:3000/health`, o comando exato da lista allow, foi **negado** pela política de permissões. A causa provável é a regra deny `Bash(curl *)`, que casaria antes do allow. Nada foi feito para contornar a negação.
- O corpo `503 {"error":{"code":"UNAVAILABLE",...}}` está comprovado pelos testes unitários da rota (Supertest). Em runtime, a comprovação é indireta, pelo `HEALTHCHECK`. Falta a chamada HTTP no host, que o responsável pode executar: `curl.exe --include http://127.0.0.1:3000/health` (200), `docker compose stop db`, de novo o `curl` (503) e `docker compose up -d --wait db`.

### Estado deixado

- `api`, `db` e `db-test` em execução. Volumes `tourflow_pgdata` e `tourflow_dev_node_modules` preservados.

## Checkpoint anterior — F1-T1 (2026-11-11)

- Tarefa: F1-T1 — Fundação Docker-first.
- Branch: `feat/f1-t1-docker-foundation`.
- HEAD: `fdbe62d` (commit base; as alterações da F1-T1 continuam na árvore de trabalho, sem commit).
- Situação: **F1-T1 aprovada tecnicamente com ressalvas pelo Codex, em publicação automatizada delegada pelo responsável** (`CLAUDE.md` §5 e `docs/governanca.md` §11).
- Árvore de trabalho auditada: 19 arquivos novos (`git ls-files --others --exclude-standard`) e 2 modificados (`.gitignore`, `docs/estado-execucao.md`), todos dentro do escopo aprovado. A contagem de 17, registrada antes, corresponde às linhas do `git status --short`, que agrupa `src/` e `tests/`; a auditoria a corrigiu para 19.
- Rodadas de correção: 1 de 3 utilizada.

### Ambiente verificado

- Docker Engine 29.9.2 (linux/amd64), Compose v5.6.1, contexto `desktop-linux` (confirmado pelo responsável; `docker context` está em deny).
- Imagem base: `node:24.22.2-alpine3.24@sha256:a34ab6d7f6f4813f4d0c5469d74685604b962fbdbf5793a7bc7b4998ecb867c8` (Node.js 24.22.2, Alpine 3.24.4, npm 11.19.1).
- Antes da execução: nenhum projeto Compose `tourflow`, nenhum volume `tourflow*` e porta 3000 livre.

### Dependências resolvidas (`--save-exact`, lockfile gerado em container)

- Produção: express 5.3.0, zod 4.6.7.
- Desenvolvimento: typescript 6.0.3, @types/node 24.19.2, @types/express 5.0.6, eslint 10.14.0, @eslint/js 10.0.1, typescript-eslint 8.72.2, vitest 5.1.0, supertest 7.3.2, @types/supertest 7.2.1.

### Verificações executadas

| Verificação | Resultado |
| --- | --- |
| `compose config --quiet` | exit 0 |
| `--profile dev build dev` | exit 0 |
| `run --rm --no-deps dev npm run lint` (`--max-warnings=0`) | exit 0, sem avisos |
| `run --rm --no-deps dev npm run typecheck` | exit 0 |
| `run --rm --no-deps dev npm run test` | exit 0; 8 testes aprovados em 1 arquivo |
| `run --rm --no-deps dev npm run build` | exit 0; `dist/` contém somente o código de `src/` |
| `up --build -d api` / `ps api` / `port api 3000` | exit 0; `Up`; `127.0.0.1:3000` |
| `exec -T api id -u` | `1000` (usuário `node`) |
| `exec -T api npm ls --omit=dev --depth=0` | apenas express 5.3.0 e zod 4.6.7 |
| `ls` das devDependencies diretas no runtime | ausentes (`No such file or directory`) |
| Configuração da imagem `runtime` | `User=node`, `Cmd=["node","dist/server.js"]`, sem instalação no startup |
| Montagens do Compose | `api` sem volumes; `tourflow_dev_node_modules` montado somente em `dev` |
| HTTP pelo host (executado pelo responsável) | `HTTP/1.1 404`, `application/json`, `{"error":{"code":"NOT_FOUND","message":"Resource not found"}}` |
| `npm audit --omit=dev` | 0 vulnerabilidades |
| `git diff --check` e verificação de whitespace dos arquivos novos | sem ocorrências |
| Busca de segredos nos arquivos novos | nenhum segredo encontrado |

### Rodada de correção 1 (solicitada na auditoria)

- `error-handler.ts`: rejeições do parser JSON causadas pelo cliente (`entity.parse.failed`, `entity.too.large`, `request.size.invalid`, `request.aborted`, `encoding.unsupported`, `charset.unsupported`) passam a responder 400 `VALIDATION_ERROR`, incluindo corpo acima de 16 KB. Falhas inesperadas continuam em 500 `INTERNAL_ERROR`, e o stderr recebe só uma mensagem fixa, sem o objeto de erro.
- `app.test.ts`: novos casos para corpo acima de 16 KB e charset não suportado. O caso 500 agora confirma a mensagem fixa e verifica, com `util.inspect`, que a mensagem interna fictícia não aparece em nenhum argumento do log.

| Verificação | Resultado |
| --- | --- |
| `run --rm --no-deps dev npm run lint` | exit 0, sem avisos |
| `run --rm --no-deps dev npm run typecheck` | exit 0 |
| `run --rm --no-deps dev npm run test` | exit 0; 10 testes aprovados em 1 arquivo |
| `run --rm --no-deps dev npm run build` | exit 0 |
| `up --build -d api` / `ps api` / `port api 3000` | exit 0; recriado, `Up`; `127.0.0.1:3000` |
| `exec -T api id -u` | `1000` |
| `exec -T api grep` da mensagem fixa em `dist/` | 1 ocorrência (imagem contém o handler novo) |
| HTTP pelo host (executado pelo responsável, 10:55 UTC) | `HTTP/1.1 404`, `application/json`, `{"error":{"code":"NOT_FOUND","message":"Resource not found"}}` |

### Parecer da auditoria (Codex)

F1-T1 aprovada tecnicamente com ressalvas, depois da rodada de correção 1. Evidências consideradas na rodada: lint sem avisos, typecheck e build com saída 0, 10 de 10 testes aprovados e HTTP 404 JSON `NOT_FOUND` reconfirmado pelo responsável no host às 10:55 UTC de 11/11/2026.

### Decisões da auditoria

- **`node_modules` no Windows: aceito.** É um ponto de montagem vazio criado pelo Docker (bind mount `.:/app` mais volume em `/app/node_modules`), com 0 itens e ignorado pelo Git. As dependências ficam isoladas em Docker. Item encerrado.

### Ressalvas abertas (não bloqueiam o commit)

- **`npm audit`:** 10 ocorrências moderadas na cadeia de lint (GHSA-g3hv-75wg-m249, via eslint e typescript-eslint) e 0 no audit de produção (`--omit=dev`). O `package-lock.json` marca `minimatch` 10.2.6 com `"dev": true`. A única correção indicada pelo npm é `npm audit fix --force`, que traz mudanças incompatíveis. Uma correção compatível ainda precisa ser avaliada, em tarefa com aprovação própria para mudança de dependência.
- **ADR-0001:** o rótulo "Proposto" permanece, apesar da aprovação do G0. É uma pendência documental para checkpoint próprio.

### Observação operacional

- O serviço `api` (`tourflow-api-1`) foi deixado em execução ao final da rodada 1. Esse estado não foi reverificado nesta etapa documental, que não usou Docker. Para parar: `docker compose stop api`.

## Próxima ação

Publicação de `feat/f2-t3-coverage-ci` por PR para `develop` com auto-merge no HEAD atual (`docs/governanca.md` §18), fora do Ralph Loop; o primeiro run hospedado comprovará cobertura e integração no CI. A promoção para `main` e o Bloco 3 dependem de aprovação própria.

## Governança

- Consultar `CLAUDE.md`, `PRD.md`, `ROADMAP.md`, `docs/adr/0001-arquitetura.md` e `docs/governanca.md`.
- Não iniciar tarefa sem autorização. Git de escrita permanece sob controle humano.
- Não acessar produção, VPS ou bancos externos. Não excluir volumes. Não usar permissões irrestritas.
- Limitações conhecidas das permissões: `ask Bash(mkdir *)` comprovado; `ask PowerShell(New-Item *)` não comprovado (`docs/governanca.md` §7).

## Regra de atualização

Atualizar este documento somente após um marco verificável, informando data, tarefa, commit e branch confirmados, testes realmente executados, pendências e próxima ação. Não declarar tarefas concluídas sem evidências.
