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

## Checkpoint atual — F1-T3 (2026-11-11)

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

Publicação da F1-T3 por PR de `feat/f1-t3-catalog-queries` para `develop` com auto-merge no HEAD atual do PR (`docs/governanca.md` §16); depois do merge, limpeza somente da branch curta. A promoção para `main` e a F1-T4 dependem de aprovação própria.

## Governança

- Consultar `CLAUDE.md`, `PRD.md`, `ROADMAP.md`, `docs/adr/0001-arquitetura.md` e `docs/governanca.md`.
- Não iniciar tarefa sem autorização. Git de escrita permanece sob controle humano.
- Não acessar produção, VPS ou bancos externos. Não excluir volumes. Não usar permissões irrestritas.
- Limitações conhecidas das permissões: `ask Bash(mkdir *)` comprovado; `ask PowerShell(New-Item *)` não comprovado (`docs/governanca.md` §7).

## Regra de atualização

Atualizar este documento somente após um marco verificável, informando data, tarefa, commit e branch confirmados, testes realmente executados, pendências e próxima ação. Não declarar tarefas concluídas sem evidências.
