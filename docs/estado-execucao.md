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
| Bloco 2 — F2-T3, F2-T4 | `d075476`; merge `8c18f24` em `develop` (PR #9) | Concluído e mesclado; CI `43037580198` verde (cobertura e integração) |
| Bloco 3 — F3-T1 a F3-T4 | `c5a83d0`; merge `b76cd30` em `develop` (PR #10) | Concluído e mesclado; CI `43047452444` (PR) e `43048277947` (`develop`) verdes |

## Checkpoint atual — Bloco 4: F4-T1 a F4-T4 (2026-11-11)

- Tarefas: smoke k6 (F4-T1), resultado real em `docs/desempenho.md` (F4-T2), revisão de segurança (F4-T3) e documentação de entrega (F4-T4), num único PR para `develop` (`docs/governanca.md` §20). O ensaio em clone limpo (F4-T5) fica fora do loop e é executado pelo responsável depois do push.
- Execução: Ralph Loop, iteração 1 de 3. Situação: **validado localmente**. Commit, push, PR, F4-T5 e auto-merge ficam fora do loop.

### Início

- `origin` → `https://github.com/podilon/tourflow-api.git`. `develop` local e `origin/develop` em `b76cd30225e5…`. Árvore com apenas as três mudanças de governança preparadas (`.claude/settings.json` +28, `CLAUDE.md` +7, `docs/governanca.md` +26), preservadas.
- `git switch -c feat/f4-k6-homologation origin/develop` levou as três mudanças.

### Imagem k6

- `buildx imagetools inspect grafana/k6:1.0.0` → índice OCI com digest `sha256:f21270290d702cbf0a7d6ba5d7ed100b63bcb233b558b885ed787547b3488279` (64 dígitos hexadecimais conferidos), com manifestos linux/amd64 e linux/arm64.
- O pull foi feito somente por `grafana/k6:1.0.0@sha256:f212…8279`. `RepoDigests` = `grafana/k6@sha256:f212…8279`; `version` → `k6 v1.0.0 (commit/41b4984b75-dirty, go1.24.2, linux/amd64)`. A mesma referência está fixada no serviço `k6`.

### Implementação

- `docker-compose.yml`: serviço `k6` (profile `perf`, `working_dir /scripts`, `./performance:/scripts:ro`, `./performance/results:/results`, `BASE_URL=http://api:3000`, sem porta). Parametrização com os padrões atuais preservados: `name: ${COMPOSE_PROJECT_NAME:-tourflow}`, `127.0.0.1:${TOURFLOW_API_PORT:-3000}:3000`, `tourflow-api`/`tourflow-dev:${TOURFLOW_IMAGE_TAG:-local}`, volumes `${TOURFLOW_PGDATA_VOLUME:-tourflow_pgdata}` e `${TOURFLOW_NODE_MODULES_VOLUME:-tourflow_dev_node_modules}`.
- `performance/smoke.js`: 1 VU por 30 s em `GET /departures`, intervalo de 50 ms; thresholds separados `p(95)<500` e `slo_departures_ok rate>=0.99` (sucesso só com HTTP 200 e duração < 500 ms); `handleSummary` grava `performance/results/smoke-summary.json` e classifica o SLO (inconclusivo abaixo de 200 amostras).
- `eslint.config.js`: globais do k6 (`__ENV`, `__VU`, `__ITER`) apenas em `performance/**/*.js`.
- `.env.example`, `README.md` (estado, ambiente isolado, smoke k6, SLO medido, ressalvas de log, rastreabilidade com a rubrica), `docs/desempenho.md`, `CONTRIBUTORS.md` (Paulo Odilon Everton Rodrigues, @podilon) e `docs/ia.md`.
- `ci.yml`, `src/`, `tests/`, `PRD.md`, `ROADMAP.md` e ADR não foram alterados. O check obrigatório `Foundation (Compose lint, typecheck, test, build)` foi preservado.

### Verificações executadas

| Verificação | Resultado |
| --- | --- |
| `--profile perf config --quiet` e `--profile test config --quiet` | exit 0 |
| `--profile perf --profile test config --format json` | projeto `tourflow`; `api` só em `127.0.0.1:3000`; `db`, `db-test` e `k6` sem porta; imagens `tourflow-api:local`, Postgres e k6 por digest; volume `tourflow_pgdata`; `/scripts` somente leitura |
| `run --rm --no-deps dev npm run lint` | exit 0, sem avisos (inclui `performance/smoke.js`) |
| `run --rm --no-deps dev npm run typecheck` | exit 0 |
| `run --rm --no-deps dev npm run test:coverage` | exit 0; 122 testes em 7 arquivos; 100% de linhas e de branches; limiares de 80% inalterados |
| `--profile test up -d --wait db-test` + `test:integration` | exit 0; schema aplicado no `db-test`; 10 de 10 |
| `run --rm --no-deps dev npm run build` | exit 0 |
| `--profile test stop db-test` | `Stopped` |
| `up --build -d --wait api` | `api` e `db` `Healthy` |
| `GET /health` | `200 {"status":"ok","database":"up"}` |
| Fingerprint do catálogo em `db/tourflow` antes e depois do smoke | idêntico: 2 experiências, 1 reserva, 4 saídas, `141eee827dea643c94bb01d4471801f9` |
| **Smoke k6 oficial (única execução)** | **exit 0**; 572 requisições; p95 1,913 ms (`p(95)<500` OK); `slo_departures_ok` 100,00% (572/572, `rate>=0.99` OK); SLO **ATINGIDO** |
| `logs --tail 50 api` | linhas JSON `route":"/departures","statusCode":200` (49 nas últimas 50) |

### Revisão de segurança (F4-T3)

| Item | Resultado |
| --- | --- |
| Segredos | busca por tokens, chaves privadas e URIs com credenciais: nenhuma ocorrência. Único arquivo `.env*` versionado: `.env.example`, só com placeholders. `.env` e `.env.*` ignorados (`git check-ignore`) |
| Portas | `api` somente em `127.0.0.1` (porta parametrizável, padrão 3000); `db`, `db-test` e `k6` sem porta publicada |
| Imagens | Node `24.22.2-alpine3.24@sha256:a34a…`, Postgres `17.11-alpine@sha256:3540…`, k6 `1.0.0@sha256:f212…`: todas com tag exata e digest |
| Dependências | todas as versões de `package.json` são exatas; `npm audit --omit=dev` → 0 vulnerabilidades; `npm audit` → as mesmas 10 moderadas da cadeia de lint (GHSA-g3hv-75wg-m249; correção só por `--force`, com mudança incompatível) |
| Permissões | `disableBypassPermissionsMode: disable`; regras `deny` e `ask` inalteradas |
| CI | `runs-on: ubuntu-latest`, sem runner self-hosted; `ci.yml` inalterado |

### Ressalvas técnicas abertas (verificadas no código)

- `src/http/middlewares/error-handler.ts:30-31`: com `res.headersSent`, o erro segue para o handler padrão do Express, que imprime o stack no stderr fora de `NODE_ENV=test`. A resposta HTTP não expõe nada; o caso é raro e anterior ao Bloco 3. O comportamento do Express vem da documentação e não foi reproduzido.
- `src/infra/db/pool.ts:29`: um cliente ocioso com erro gera uma linha de texto no stderr (sem detalhes), não JSON.
- `src/http/middlewares/request-context.ts:31`: o log é escrito no `finish`; uma requisição abortada antes dele não gera linha.
- `prom-client` 15.1.3 está marcado como deprecated no npm; a troca exige nova aprovação.
- O commit `c5a83d0` não tem o trailer `Co-Authored-By`, porque a regra allow só cobre a mensagem exata. A autoria por IA está em `docs/ia.md`.

### F4-T5 — comandos do ensaio em clone limpo (a executar pelo responsável)

Depois do push da branch, num terminal PowerShell novo. Não toca no projeto `tourflow`, na porta 3000, no volume `tourflow_pgdata` nem nas imagens `:local`. Substitua `<SHA_PUBLICADO>` pelo SHA do PR informado no relatório de publicação.

```powershell
# 1. Clone novo e conferência do SHA publicado
cd "C:\Users\podil\PROJETOS\FULL CYCLE"
git clone --branch feat/f4-k6-homologation https://github.com/podilon/tourflow-api.git tourflow-api-clean
cd tourflow-api-clean
$expected = '<SHA_PUBLICADO>'
$actual = git rev-parse HEAD
"HEAD do clone: $actual"
if ($actual -ne $expected) { throw "SHA divergente: esperado $expected, obtido $actual. Não continue." }

# 2. .env do clone (passo opcional do README) com isolamento
Copy-Item .env.example .env
@'
COMPOSE_PROJECT_NAME=tourflow_clean
TOURFLOW_API_PORT=3100
TOURFLOW_PGDATA_VOLUME=tourflow_clean_pgdata
TOURFLOW_NODE_MODULES_VOLUME=tourflow_clean_dev_node_modules
TOURFLOW_IMAGE_TAG=clean
'@ | Add-Content .env

# 3. Configuração efetiva ANTES de subir qualquer serviço
$cfg = docker --context desktop-linux compose --profile dev --profile test --profile perf config --format json | ConvertFrom-Json
$api = $cfg.services.api.ports[0]
[pscustomobject]@{
  project       = $cfg.name
  api_host_ip   = $api.host_ip
  api_published = $api.published
  api_target    = $api.target
  pgdata_volume = $cfg.volumes.tourflow_pgdata.name
  nm_volume     = $cfg.volumes.tourflow_dev_node_modules.name
  api_image     = $cfg.services.api.image
  dev_image     = $cfg.services.dev.image
  db_ports      = [string]$cfg.services.db.ports
  dbtest_ports  = [string]$cfg.services.'db-test'.ports
  k6_ports      = [string]$cfg.services.k6.ports
} | Format-List
if ($cfg.name -ne 'tourflow_clean' -or $api.host_ip -ne '127.0.0.1' -or "$($api.published)" -ne '3100' -or "$($api.target)" -ne '3000' -or
    $cfg.volumes.tourflow_pgdata.name -ne 'tourflow_clean_pgdata' -or $cfg.volumes.tourflow_dev_node_modules.name -ne 'tourflow_clean_dev_node_modules' -or
    $cfg.services.api.image -ne 'tourflow-api:clean' -or $cfg.services.dev.image -ne 'tourflow-dev:clean' -or
    $cfg.services.db.ports -or $cfg.services.'db-test'.ports -or $cfg.services.k6.ports) {
  throw 'Configuração efetiva inesperada. Não suba os serviços.'
}
'CONFIG OK: tourflow_clean, 127.0.0.1:3100->3000, volumes e tags exclusivos, bancos e k6 sem porta'

# 4. Comandos do README (anote o $LASTEXITCODE de cada um)
docker --context desktop-linux compose up --build -d --wait api; "exit=$LASTEXITCODE"
docker --context desktop-linux compose ps
docker --context desktop-linux compose run --rm --no-deps api node dist/infra/db/migrate.js; "exit=$LASTEXITCODE"
docker --context desktop-linux compose run --rm --no-deps api node dist/infra/db/seed.js; "exit=$LASTEXITCODE"
curl.exe --include http://127.0.0.1:3100/health
curl.exe http://127.0.0.1:3100/departures
docker --context desktop-linux compose --profile dev build dev; "exit=$LASTEXITCODE"
docker --context desktop-linux compose run --rm dev npm run lint; "exit=$LASTEXITCODE"
docker --context desktop-linux compose run --rm dev npm run typecheck; "exit=$LASTEXITCODE"
docker --context desktop-linux compose run --rm dev npm run test:coverage; "exit=$LASTEXITCODE"
docker --context desktop-linux compose --profile test up -d --wait db-test; "exit=$LASTEXITCODE"
docker --context desktop-linux compose run --rm --no-deps dev npm run test:integration; "exit=$LASTEXITCODE"
docker --context desktop-linux compose run --rm dev npm run build; "exit=$LASTEXITCODE"
docker --context desktop-linux compose --profile perf run --rm --no-deps k6 run smoke.js; "k6 exit=$LASTEXITCODE"

# 5. Resultado do ensaio em arquivo separado; o JSON versionado é restaurado
Copy-Item performance\results\smoke-summary.json performance\results\clone-rehearsal-summary.json
git restore -- performance/results/smoke-summary.json
git diff --exit-code -- performance/results/smoke-summary.json; "versionado intacto=$($LASTEXITCODE -eq 0)"
git status --short
Get-Content performance\results\clone-rehearsal-summary.json

# 6. Parar o ambiente do clone (sem -v)
docker --context desktop-linux compose --profile test stop api db db-test
```

- **Saídas a trazer:** a linha `HEAD do clone`; o bloco da etapa 3 com `CONFIG OK`; o `exit=` de cada comando da etapa 4; as respostas de `/health` e `/departures`; os totais de testes e a tabela de cobertura; o resumo final do k6 com `k6 exit=`; a etapa 5 completa (`versionado intacto=True`, `git status --short` mostrando só `?? performance/results/clone-rehearsal-summary.json` e o conteúdo do JSON do ensaio).
- O resultado do k6 no clone é **evidência do ensaio**, registrada separadamente do resultado oficial em `docs/desempenho.md`. O `clone-rehearsal-summary.json` fica no clone e não é versionado; seus números são transcritos no registro da F4-T5.
- A remoção do diretório `tourflow-api-clean` e dos recursos `tourflow_clean_*` fica com o responsável (ROADMAP, rollback F4), sem `down -v` no projeto `tourflow`.

### Estado deixado

- `api` e `db` do projeto `tourflow` em execução, sem alteração de dados; `db-test` parado; volumes preservados.

## Checkpoint anterior — Bloco 3: F3-T1 a F3-T4 (2026-11-11)

- Tarefas: logs Pino (F3-T1), métrica e SLO documentado (F3-T2), OpenAPI 3.1 (F3-T3), ADR e README com tabela SOLID (F3-T4), num único PR (`docs/governanca.md` §19).
- Execução: Ralph Loop, iteração 1 de 3. Situação: **concluído e mesclado**. Commit `c5a83d0` feito pelo Claude Code com a mensagem autorizada, depois da revalidação em Docker (lint, typecheck, 122 unitários, 100% de linhas 32/32 e de branches 9/9, 10 testes de integração, build). Push, PR #10 e merge normal com `--match-head-commit`, sem `--auto`, após o CI `43047452444` verde. Merge `b76cd30`; CI de `develop` `43048277947` verde. Branch remota apagada pelo GitHub; branch local removida com `git branch -d` (`was c5a83d0`).

### Fechamento do PR #9 e branch

- Pré-checagens: `command -v jq` → `/c/ProgramData/chocolatey/bin/jq`; `command -v perl` → `/usr/bin/perl`; `origin` → `https://github.com/podilon/tourflow-api.git`; `git diff --stat` com apenas as três alterações de governança preparadas (`.claude/settings.json` +17, `CLAUDE.md` +7, `docs/governanca.md` +18), preservadas.
- Permissões: durante a validação dos logs, o comando `docker … logs --tail 20 --no-log-prefix api | jq -ec '…'` não estava na lista allow e foi submetido à confirmação. O responsável humano aprovou e acrescentou duas entradas exatas a `.claude/settings.json` (`docker --context desktop-linux compose -p tourflow logs --tail 20 --no-log-prefix api` e o filtro `jq -ec` correspondente), como parte da estratégia de automação governada. O diff final de `.claude/settings.json` no Bloco 3 é, portanto, de **+19 linhas** (17 preparadas pelo Codex + 2 aprovadas no loop). As regras `ask`/`deny` não foram alteradas, e o Claude Code não editou o arquivo diretamente (`Edit(./.claude/settings.json)` está em `deny`).
- `git fetch --prune origin` removeu `origin/feat/f2-t3-coverage-ci` e trouxe `develop` `90e238e..8c18f24`. `git ls-remote --heads origin main develop` lista apenas `develop` `8c18f24f7d84…` e `main` `a09b6f06f314…` (branch curta excluída no remoto). `git merge-base --is-ancestor d075476 origin/develop` → exit 0.
- `develop` local atualizada por `git fetch origin refs/heads/develop:refs/heads/develop` (fast-forward `90e238e..8c18f24`). `git switch -c feat/f3-observability-openapi origin/develop` levou as três alterações; só então `git branch -d feat/f2-t3-coverage-ci` (`was d075476`).

### Dependências (instaladas no contêiner `dev`, versões exatas)

- Produção: `pino` 10.4.0, `prom-client` 15.1.3. Desenvolvimento: `@apidevtools/swagger-parser` 13.1.0. `package.json` e `package-lock.json` gerados pelo npm no contêiner; `--profile dev build dev` e `npm ci` sincronizaram imagem e volume.
- O npm marca `prom-client` 15.1.3 como *deprecated* (substituto: `@prometheus-io/client`). Mantido por ser a dependência aprovada; a troca exige nova aprovação. O audit de desenvolvimento segue com as 10 ocorrências moderadas já registradas; a imagem `runtime` reporta `found 0 vulnerabilities`.

### Implementação

- `src/infra/logger.ts`: Pino JSON no stdout, `base: null`, horário ISO; logger desligado como padrão do `createApp` nos testes.
- `src/http/middlewares/request-context.ts`: primeiro middleware; gera `requestId` (UUID v4) na API, ignora o cabeçalho do cliente, devolve `X-Request-Id` e, no `finish`, escreve uma linha com `requestId`, `method`, `route` (padrão da rota ou `unmatched`), `statusCode`, `durationMs` e `errorCode` quando houver. Sem URL, query, corpo, cabeçalhos, dados pessoais ou objeto de erro.
- `src/http/send-error.ts`: todas as respostas de erro (controllers, `/health`, 404, `errorHandler`, `/metrics`) passam por ele, que grava o código em `res.locals.errorCode`. Contrato HTTP inalterado. O `errorHandler` deixou de escrever no `console.error`: o 500 aparece no log de requisição como `INTERNAL_ERROR`.
- `src/infra/metrics.ts` e `src/http/routes/metrics.ts`: `Registry` próprio, counter `tourflow_reservations_confirmed_total`, `GET /metrics`. `src/services/reservation-service.ts` recebe `onConfirmed` e o chama depois de `repository.create` resolver (após `COMMIT`); exceção do hook é absorvida. `src/server.ts` compõe logger, métricas e o hook e passou a logar início e encerramento em JSON.
- `docs/openapi.yaml`: OpenAPI 3.1 com `POST /reservations` e `GET /reservations/{id}`, schemas, cabeçalhos e exemplos fictícios; só referências locais.
- Testes: `tests/unit/observability.test.ts` (19), `tests/unit/openapi.test.ts` (7), caso 500 de `tests/unit/app.test.ts` ajustado ao novo comportamento, e prova da métrica em `tests/integration/reservations.test.ts` (201 incrementa, 409 não).
- Documentação: README (estado, OpenAPI, observabilidade, SLO, tabela SOLID, limitações), ADR v1.2.

### Verificações executadas

| Verificação | Resultado |
| --- | --- |
| `compose config --quiet` | exit 0 |
| `run --rm --no-deps dev npm run lint` | exit 0, sem avisos |
| `run --rm --no-deps dev npm run typecheck` | exit 0 |
| `run --rm --no-deps dev npm run test:coverage` | exit 0; 122 testes em 7 arquivos; linhas 100% (32/32), branches 100% (9/9), statements 100% (38/38), funções 100% (17/17); limiares de 80% (linhas e branches) inalterados |
| `--profile test stop db-test` + `up -d --wait db-test` | tmpfs novo; `Healthy` |
| `run --rm --no-deps dev npm run test:integration` | exit 0; schema aplicado no `db-test`; 10 testes, incluindo a prova da métrica e as duas de concorrência |
| `run --rm --no-deps dev npm run build` | exit 0 |
| `up --build -d --wait api` | imagem `runtime` reconstruída; `api` `Healthy` |
| `exec -T api npm ls --omit=dev --depth=0` | express 5.3.0, pg 8.23.1, pino 10.4.0, prom-client 15.1.3, zod 4.6.7 (sem swagger-parser) |
| `GET /metrics` (dentro do container `api`) | `200`, `text/plain; version=0.0.4; charset=utf-8`, `tourflow_reservations_confirmed_total 0` |
| `GET /health` | `200 {"status":"ok","database":"up"}` |
| `GET /departures?experienceId=abc` | `400 VALIDATION_ERROR` |
| `compose logs --tail 20 --no-log-prefix api \| jq -ec ...` | todas as linhas parseadas como JSON (exit 0); `/health` 200 sem `errorCode` (`requestId` `95cd8f83-…`) e `/departures` 400 com `errorCode` `VALIDATION_ERROR` (`requestId` `b584dd65-…`), sem query |
| `psql` em `db/tourflow` (ocupação) | inalterado: somente a reserva E2E do Bloco 1 (`…6b01`, 2 vagas); nenhuma reserva gravada neste bloco |
| `--profile test stop db-test` | `Stopped` (tmpfs descartado) |

### Estado deixado

- `api` e `db` em execução, sem alteração de dados; `db-test` parado. Volumes preservados.

## Checkpoint anterior — Bloco 2: F2-T3 e F2-T4 (2026-11-11)

- Tarefas: cobertura com limiar (F2-T3) e integração com PostgreSQL no CI (F2-T4), num único PR (`docs/governanca.md` §18).
- Execução: Ralph Loop, iteração 1 de 3. Situação: **concluído e mesclado** (PR #9, merge `8c18f24` em `develop`, CI `43037580198` verde).
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

1. Fora do loop: commit `feat: add k6 smoke and delivery documentation (F4-T1 to F4-T4)`, push de `feat/f4-k6-homologation` e um único PR para `develop`, ainda sem auto-merge.
2. O responsável executa o ensaio em clone limpo (comandos na seção F4-T5 acima) e traz a evidência.
3. Registro da F4-T5 em `docs/estado-execucao.md` e `docs/ia.md` (`docs: record clean clone rehearsal (F4-T5)`), push, conferência do destino, do SHA final e do check obrigatório aprovado nesse SHA; então auto-merge com `--match-head-commit`, sem polling.
4. A promoção `develop` → `main` e a entrega no Moodle ficam para a F5 (`docs/governanca.md` §20).

## Governança

- Consultar `CLAUDE.md`, `PRD.md`, `ROADMAP.md`, `docs/adr/0001-arquitetura.md` e `docs/governanca.md`.
- Não iniciar tarefa sem autorização. Git de escrita permanece sob controle humano.
- Não acessar produção, VPS ou bancos externos. Não excluir volumes. Não usar permissões irrestritas.
- Limitações conhecidas das permissões: `ask Bash(mkdir *)` comprovado; `ask PowerShell(New-Item *)` não comprovado (`docs/governanca.md` §7).

## Regra de atualização

Atualizar este documento somente após um marco verificável, informando data, tarefa, commit e branch confirmados, testes realmente executados, pendências e próxima ação. Não declarar tarefas concluídas sem evidências.
