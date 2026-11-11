# Uso de IA — TourFlow API

Registro exigido pelo `CLAUDE.md` §9 e pelo material oficial do Projeto B. A IA é ferramenta de apoio; as decisões, aprovações e operações Git de escrita são do responsável humano.

## Papéis

| Papel | Responsabilidade |
| --- | --- |
| Responsável humano | Aprova cada tarefa, decisões sensíveis, commits, pushes e a entrega |
| Claude Code (Anthropic) | Executor: planeja, implementa, testa e documenta tarefas aprovadas |
| Codex | Supervisor: audita arquitetura, qualidade, segurança e critérios de aceite |

## Registro por tarefa

Entradas de F0 e F1-T0 reconstruídas a partir do histórico Git e dos documentos versionados. Os prompts dessas fases não foram arquivados no repositório e, por isso, não estão reproduzidos aqui.

### F0 — Planejamento (2026-11-08)

- **Finalidade:** definir produto, arquitetura, governança e roadmap antes de qualquer código.
- **Uso de IA:** apoio consultivo na redação do PRD, do ADR-0001, do `CLAUDE.md` e do `ROADMAP.md` (o ADR registra "apoio consultivo de IA" entre os decisores).
- **Decisão humana:** aprovação do Gate G0 sobre a versão 1.1 dos quatro documentos.
- **Arquivos:** `PRD.md`, `docs/adr/0001-arquitetura.md`, `CLAUDE.md`, `ROADMAP.md`.
- **Evidência:** commits `2f6bd56` (versão inicial) e `d9b59b3` (versão 1.1 aprovada).
- **Validação:** revisão documental; nenhum código executado.

### F1-T0 — Permissões do Claude Code (2026-11-08)

- **Finalidade:** configurar regras allow/ask/deny e documentar o que é controle técnico e o que é apenas norma.
- **Uso de IA:** Claude Code elaborou `.claude/settings.json` e `docs/governanca.md` e executou testes inofensivos de permissão.
- **Decisão humana:** aprovação da tarefa; inclusão do `.gitignore` nesta tarefa (decisão D5 registrada em `docs/governanca.md` §8); execução de `/permissions` pelo responsável.
- **Arquivos:** `.claude/settings.json`, `.gitignore`, `docs/governanca.md`.
- **Evidência:** commit `1b8bd05`; resultados e limitações em `docs/governanca.md` §5 e §7 (incluindo o ask do PowerShell não comprovado).

### PREP-AUTO — Preparação da automação (2026-11-11)

- **Finalidade:** registrar a skill do executor e o checkpoint de desenvolvimento.
- **Arquivos:** `.claude/skills/tourflow-executor/SKILL.md`, `docs/estado-execucao.md`.
- **Evidência:** commit `fdbe62d`.

### F1-T1 — Fundação Docker-first (2026-11-11)

- **Finalidade:** base executável com Node.js 24, TypeScript ESM, Express 5 e Zod, inteiramente em containers.
- **Resumo do prompt:** prompt executivo supervisionado pelo Codex, com escopo, arquivos autorizados, comandos Docker permitidos, critérios de aceite, limite de três rodadas de correção e proibição de Git de escrita, F1-T2 e comandos destrutivos.
- **Decisões humanas:**
  - Autorização explícita da execução, do pull da imagem Node, da resolução npm em container, dos builds e dos volumes do projeto.
  - Imagem fixada por tag exata e digest em vez de `node:24-alpine`.
  - Inclusão de `tsconfig.build.json`, para separar o build de produção do typecheck.
  - `docker context show` executado manualmente pelo responsável, porque a regra deny `docker context *` é mantida.
  - Teste HTTP pelo host executado pelo responsável (`curl` permanece em deny).
- **Gerado pela IA (Claude Code):** `package.json` (scripts), configurações (`tsconfig*.json`, `eslint.config.js`, `vitest.config.ts`), `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.gitattributes`, `.env.example`, complemento do `.gitignore`, código em `src/`, testes em `tests/unit/app.test.ts`, `README.md`, este arquivo e a atualização de `docs/estado-execucao.md`.
- **Gerado por ferramenta:** `package-lock.json`, criado pelo `npm install` em container temporário.
- **Validação inicial:** lint, typecheck, testes (8 de 8) e build executados pelo Compose; API iniciada pelo Compose; UID, dependências do runtime e mapeamento de porta inspecionados. Comandos, exit codes e resultados estão em `docs/estado-execucao.md`.
- **Pedido de correção (rodada 1 de 3):** o parser JSON deveria classificar como 400 `VALIDATION_ERROR` as rejeições conhecidas causadas pela requisição, incluindo corpo acima de 16 KB. A falha inesperada deveria continuar em 500 `INTERNAL_ERROR`, com mensagem fixa no stderr e sem registrar o objeto de erro.
- **Alteração feita pelo Claude Code:**
  - `src/http/middlewares/error-handler.ts` passou a classificar os erros do parser pelo campo `type` e registra só uma mensagem fixa.
  - `tests/unit/app.test.ts` ganhou casos para corpo acima de 16 KB e charset não suportado.
  - O caso 500 verifica, com `util.inspect`, que a mensagem interna fictícia não chega ao log. O primeiro rascunho dessa asserção usava `JSON.stringify`, que serializa `Error` como `{}` e teria passado mesmo com o objeto bruto no log; o Claude Code corrigiu isso antes de executar.
- **Evidências, por origem:**
  - **Testes executados pelo Claude Code** (via Compose): lint sem avisos, typecheck e build com exit 0, 10 de 10 testes aprovados; imagem `api` reconstruída, com UID 1000 e o handler novo presente em `dist/`.
  - **HTTP verificado pelo responsável:** `curl.exe` no host às 10:55 UTC de 11/11/2026 retornou `HTTP/1.1 404`, `application/json` e `{"error":{"code":"NOT_FOUND","message":"Resource not found"}}`. O `curl` permanece em deny para o agente.
  - **Revisão de código pelo Codex:** auditoria independente da entrega e da rodada 1.
- **Parecer do Codex:** F1-T1 aprovada tecnicamente com ressalvas. O `node_modules` vazio no host foi aceito como ponto de montagem. Seguem abertas a avaliação de uma correção compatível para as 10 ocorrências moderadas do `npm audit` na cadeia de lint (0 em produção) e a atualização do rótulo "Proposto" do ADR-0001.
- **Decisão humana:** o responsável delegou ao Claude Code a publicação da F1-T1 (stage dos caminhos aprovados, commit, CI em `ubuntu-latest`, push da branch, PR e merge condicionado a CI verde no SHA atual). A exceção está registrada no `CLAUDE.md` §5 e no `docs/governanca.md` §11, com permissões Bash enumeradas no `.claude/settings.json`, ajustadas pelo Codex.

### F1-T2 — PostgreSQL, migrations, seed e saúde (2026-11-11)

- **Finalidade:** adicionar `db` e `db-test` (PostgreSQL 17 Alpine), a migration estrutural, a seed fictícia idempotente e `GET /health` com 200/503.
- **Resumo do prompt:** prompt executivo da skill `tourflow-executor` com plano já aprovado. Pedia conferir a base `fd74ca4` e as três alterações de governança preparadas pelo Codex, usar só os comandos exatos da lista allow, conferir o alvo antes de gravar e adquirir o lock antes de consultar `schema_migrations`. Também pedia executar migration e seed duas vezes, comparando histórico, contagens, fingerprint e xmin, e validar `/health` 200 → 503 → 200 na mesma instância. A publicação seria por PR para `develop` com auto-merge, sem promoção para `main` nem início da F1-T3.
- **Decisões humanas:** aprovação do plano, do pull do PostgreSQL 17 Alpine, de `pg` e `@types/pg` em container, da migration estrutural e da seed somente em `db/tourflow` e da publicação por PR (`CLAUDE.md` §5, `docs/governanca.md` §15). As permissões foram preparadas pelo Codex.
- **Gerado pela IA (Claude Code):** `db/migrations/0001_initial_schema.sql`, `db/seeds/0001_demo_catalog.sql`, `src/infra/db/*.ts`, `src/http/routes/health.ts`, as mudanças em `src/app.ts`, `src/server.ts`, `src/config/env.ts`, `Dockerfile`, `docker-compose.yml` e `.env.example`, os testes `tests/unit/health.test.ts` e `tests/unit/app.test.ts`, o README e os registros deste arquivo e de `docs/estado-execucao.md`.
- **Gerado por ferramenta:** as entradas de `pg` 8.23.1 e `@types/pg` 8.23.1 no `package.json` e no `package-lock.json`, criadas pelo `npm install --save-exact` em container.
- **Escolhas de implementação para revisão:**
  - Variáveis discretas `DB_*` em vez de connection string. `PG*` e `DATABASE_URL` são rejeitadas, porque o `pg` lê `PGOPTIONS` e outras variáveis implicitamente.
  - Listener `error` no pool, para que a queda do banco não derrube a API.
  - Imagem fixada como `postgres:17.11-alpine@sha256:…`, porque o `cat /etc/alpine-release` não pôde ser executado (ver evidências).
  - Senha local fictícia como valor padrão no Compose, porque o CI valida o Compose sem `.env`.
- **Evidências executadas pelo Claude Code:** Q via Compose (lint, typecheck, build com exit 0 e 25 de 25 testes). Migration 2× (`Applied 1 migration(s)`, depois `No pending migrations`; histórico igual). Seed 2× (`2`/`4` inserções, depois `0`/`0`; contagens, fingerprint `4213ee8b99f27b76d0d94eb021c0a2bc` e xmin `752` iguais). `api` healthy → unhealthy com `db` parado → healthy depois de restaurar, sempre no mesmo container. Detalhes em `docs/estado-execucao.md`.
- **Evidências pendentes:** a chamada HTTP pelo host (`curl.exe … /health`, comando exato da lista allow) foi **negada** pela política de permissões nesta sessão. O status 503 `UNAVAILABLE` foi comprovado pelo teste unitário da rota e, de forma indireta, pelo `HEALTHCHECK` do container, mas não por chamada HTTP no host.
- **Fechamento:** a evidência pendente foi executada pelo **responsável** no Windows, na mesma instância da API: `200` → `503 UNAVAILABLE` com `db` parado → `200` depois da restauração. Publicação pelo PR #6 (commit `f4c5db9`), mesclado em `develop` no merge `2e1a6e3`, com CI `43024218169` verde.

### F1-T3 — Consultas de catálogo (2026-11-11)

- **Finalidade:** `GET /experiences` e `GET /departures` (PRD RF-01 e RF-02) lendo o PostgreSQL existente, com filtro `experienceId`.
- **Resumo do prompt:** Ralph Loop (até três iterações) com a F1-T3 já aprovada. Pedia conferir `jq`, `perl`, `origin`, a base `2e1a6e3` e as quatro alterações do Codex; usar só os comandos exatos da lista allow; validar `experienceId` com Zod e SQL parametrizado; responder 200 com array vazio para UUID inexistente e 400 `VALIDATION_ERROR` sem eco para filtro inválido, vazio, repetido ou desconhecido; preservar `/health`, 404 e 500; comparar contagens e fingerprint antes e depois; comprovar seis respostas HTTP dentro do contêiner. Proibia instalar dependências, rodar migrations ou seed, alterar dados, operações Git de escrita e o início da F1-T4.
- **Decisões humanas:** aprovação da F1-T3, do Ralph Loop e da publicação por PR para `develop` após validação (`CLAUDE.md` §5, `docs/governanca.md` §16). As permissões e o registro de governança foram preparados pelo Codex.
- **Gerado pela IA (Claude Code):** `src/repositories/catalog-repository.ts`, `src/repositories/pg/pg-catalog-repository.ts`, `src/services/catalog-service.ts`, `src/http/controllers/catalog-controller.ts`, `src/http/routes/catalog.ts`, as mudanças em `src/app.ts` e `src/server.ts`, `tests/unit/catalog.test.ts`, os ajustes de fakes em `tests/unit/app.test.ts` e `tests/unit/health.test.ts`, o README e os registros deste arquivo e de `docs/estado-execucao.md`.
- **Escolhas de implementação para revisão:**
  - Uma única consulta com `WHERE $1::uuid IS NULL OR experience_id = $1::uuid`, em vez de SQL montado conforme o filtro.
  - A saída não expõe `reservedSeats`; expõe `availableSeats`, calculado no service.
  - `GET /experiences` não valida query string (não há parâmetros definidos); a validação strict vale para `GET /departures`.
  - O controller retorna mensagem fixa (`Invalid query parameters`), sem detalhes do Zod, para não ecoar a entrada.
- **Evidências executadas pelo Claude Code:** lint, typecheck e build com exit 0; 41 de 41 testes. API reconstruída e saudável; seis respostas comprovadas no contêiner `api` (`/experiences` 200, `/departures` 200, filtro existente 200 com 2 saídas, filtro inexistente `200 []`, filtro `abc` 400 `VALIDATION_ERROR`, `/health` 200). Contagens, fingerprint `4213ee8b99f27b76d0d94eb021c0a2bc` e xmin `752` iguais antes e depois. Detalhes em `docs/estado-execucao.md`.
- **Verificação pelo host (Codex, Windows), separada das evidências do loop:** `/experiences` 200 com 2 registros; `/departures` 200 com 4 registros em ordem de início, vagas 12, 8, 12 e 8, `startsAt` em ISO UTC e `priceCents` inteiro; filtro existente 200 com só as duas saídas correspondentes; UUID válido inexistente `200 []`; filtro `abc` 400 `VALIDATION_ERROR` sem eco; `/health` 200 com banco disponível.
- **Publicação (fora do loop):** stage explícito, commit `feat: add catalog queries (F1-T3)`, push, PR para `develop` e auto-merge com `--match-head-commit`, executados pelo Claude Code com os comandos enumerados em `.claude/settings.json`. Testes, migrations e seed não foram repetidos.
