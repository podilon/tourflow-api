# ROADMAP — TourFlow API | Projeto Final Full Cycle B

> Versão: 1.2 | Atualização: 11/11/2026 | Estado: **F0 a F4 concluídas; F5 em andamento (promoção validada; revisão documental e Moodle pendentes)**
> Entrega oficial: **sexta-feira, 13/11/2026, pelo Moodle**. Apresentação opcional: **16/11/2026**.

## Situação em 11/11/2026

### Trajetória

```text
08/11  F0  PRD, ADR, governança e roadmap ──► Gate G0
08/11  F1-T0 permissões
11/11  F1  Docker-first, PostgreSQL, catálogo e reservas ──► PRs #1, #6, #7, #8
11/11  F2  unitários, integração, cobertura e CI ──────────► PRs #8, #9
11/11  F3  logs, métrica, SLO, OpenAPI, ADR v1.2 ──────────► PR #10
11/11  F4  k6, desempenho, segurança, clone limpo ─────────► PR #11 (develop cfb2d9d)
11/11  F5  promoção develop → main ───────────────────────► PR #12 (main f0237c8)
11/11  F5  revisão documental ─────────────────────────────► próximo PR (pendente)
até 13/11  F5-T3 submissão no Moodle (pendente)
16/11  F6  apresentação (opcional)
```

| Fase | Status | Entrega ou próximo passo | Evidência |
| --- | --- | --- | --- |
| F0 — Planejamento | Concluída | Escopo, arquitetura e governança aprovados no G0 em 08/11. | Commits `2f6bd56`, `d9b59b3` |
| F1 — Fundação e API | Concluída | Permissões, Docker, PostgreSQL, catálogo e reservas com controle de capacidade. | Commit `1b8bd05`; [PR #1](https://github.com/podilon/tourflow-api/pull/1), [#6](https://github.com/podilon/tourflow-api/pull/6), [#7](https://github.com/podilon/tourflow-api/pull/7), [#8](https://github.com/podilon/tourflow-api/pull/8) |
| F2 — Testes e CI | Concluída | Testes unitários e de integração, cobertura e CI obrigatório. | [PR #8](https://github.com/podilon/tourflow-api/pull/8), [#9](https://github.com/podilon/tourflow-api/pull/9) · [CI 43037580198](https://github.com/podilon/tourflow-api/actions/runs/43037580198) |
| F3 — Observabilidade e contrato | Concluída | Logs JSON, métricas, SLO documentado e OpenAPI. | [PR #10](https://github.com/podilon/tourflow-api/pull/10) · [CI 43048277947](https://github.com/podilon/tourflow-api/actions/runs/43048277947) |
| F4 — Desempenho e homologação | Concluída | Clone limpo e evidências mesclados em `develop` no SHA `cfb2d9d`. | [PR #11](https://github.com/podilon/tourflow-api/pull/11) · [CI em develop](https://github.com/podilon/tourflow-api/actions/runs/43057766477) |
| F5 — Congelamento e entrega | Em andamento | F5-T1 e F5-T2 concluídas para a versão `f0237c8`. Revisão documental preparada localmente, aguardando autorização para publicar e promover. F5-T3 (Moodle) pendente. | [PR #12](https://github.com/podilon/tourflow-api/pull/12) · [CI de push em main 43059539492](https://github.com/podilon/tourflow-api/actions/runs/43059539492) |
| F6 — Apresentação | Opcional | Apresentação em 16/11. Se a entrega incluir vídeo, o prazo é 13/11. | — |

### Marcos da F5

| Marco | Estado | Registro |
| --- | --- | --- |
| Promoção de `develop` (`cfb2d9d04602c3feb997f86ebd4481f94ca2d1cf`) para `main` | Concluída em 11/11, 16:33 UTC | [PR #12](https://github.com/podilon/tourflow-api/pull/12), merge `f0237c8bb653cc1262bbd97b86d4f10d981b42d7` |
| F5-T2 — CI de push verde no SHA promovido | Concluída | [Run 43059539492](https://github.com/podilon/tourflow-api/actions/runs/43059539492), `headSha` `f0237c8…`, `success` |
| Revisão documental de entrega | Preparada localmente; aguarda autorização | Diff em `README.md`, `ROADMAP.md`, `CONTRIBUTORS.md`, ADR, `docs/desempenho.md`, `docs/ia.md` e `docs/estado-execucao.md` |
| F5-T3 — Submissão no Moodle | Pendente | Confirmação do envio a registrar em `docs/estado-execucao.md` |

### Etapas restantes da F5

1. **Revisão documental.** Com autorização, publicar a branch documental por PR para `develop`, conferir o check obrigatório `Foundation` no SHA do PR e mesclar.
2. **Nova promoção.** Abrir o PR de `develop` para `main` no SHA documental aprovado e mesclar com `--match-head-commit`. A aprovação anterior estava vinculada a `cfb2d9d` e não cobre o novo SHA.
3. **F5-T2 da versão documental.** Registrar o SHA resultante em `main` e a URL do CI de push verde nesse mesmo SHA.
4. **F5-T3.** Submeter no Moodle até 13/11/2026 com o link do repositório, o README, o link do CI verde, `docs/desempenho.md` e `CONTRIBUTORS.md`, e registrar a confirmação do envio. A F5-T3 só é marcada como concluída após essa confirmação.

## 1. Política de execução

- Fases em sequência, com tarefas pequenas, aprovação antes das mudanças e evidências reais.
- No início de toda tarefa: inspecionar `git status`, propor arquivos/comandos/testes/rollback; aguardar aprovação.
- Ao encerrar: apresentar diff, saída dos testes, riscos e atualizar rastreabilidade.
- Não usar branch, deploy, banco ou segredos de projetos preexistentes. Deploy, VPS, ambiente de produção e runners self-hosted estão fora do roadmap.
- Toda tarefa tem critérios de aceite binários e um **gate de tarefa (GT)**: aprovação humana do relatório no formato do CLAUDE.md §6. Sem GT, a tarefa seguinte não inicia. A coluna *Gate* indica também aprovações prévias exigidas (download, dependência, migration, push).
- Docker-first: Node.js, npm, lint, typecheck, build, testes e k6 executam somente em containers. **Q** designa o conjunto de qualidade `docker compose run --rm dev npm run lint`, `typecheck`, `test` e `build`, todos com exit 0.
- Dependências só mudam por ação explícita e previamente autorizada, sempre em container (`docker compose run --rm dev npm install --save-exact <pacote>` para incluir e `docker compose build dev` seguido de `docker compose run --rm dev npm ci` para sincronizar o volume após mudança do lockfile). Nenhum container instala ou baixa dependências ao iniciar.
- **Rollback não destrutivo:** parar apenas os serviços da tarefa (`docker compose stop` ou `docker compose down`, nunca com `-v`); reverter somente arquivos rastreados alterados pela tarefa (`git restore <arquivos>`), mediante aprovação; listar os arquivos não rastreados criados pela tarefa para remoção pelo responsável ou com aprovação explícita. São proibidos em rollback: apagar volumes PostgreSQL, `docker volume rm`/`prune`, `git clean`, `git reset --hard` e qualquer exclusão fora do escopo da tarefa. Toda exclusão exige aprovação humana.
- A fila de implementação começa **somente depois da aprovação explícita dos documentos da Fase 0** (Gate G0).

## 2. Sequência planejada

Responsabilidade pelos artefatos Docker: F1-T1 cria o `Dockerfile` (estágios `base`, `deps`, `dev`, `build`, `runtime`) e o `docker-compose.yml` com `api` e `dev`; F1-T2 acrescenta `db`, `db-test` e o `HEALTHCHECK`; F4-T1 acrescenta `k6`.

### F0 — Planejamento e aprovação (08/11) — status: CONCLUÍDA, G0 APROVADO EM 08/11

| ID | Objetivo | Arquivos | Comandos | Critérios de aceite | Dep. | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| F0-T1 | Definir produto | `PRD.md` | — | Escopo, RF/RNF, regras, E2E, rubrica, riscos definidos. | — | GT |
| F0-T2 | Registrar arquitetura | `docs/adr/0001-arquitetura.md` | — | Decisão, alternativas rejeitadas, consequências e evidências. | — | GT |
| F0-T3 | Definir governança | `CLAUDE.md` | — | Permissões, gates, protocolo Plan→Approve→Execute→Verify e bloqueios. | — | GT |
| F0-T4 | Planejar execução | `ROADMAP.md` | — | Ordem, dependências, datas, critérios de aceite e contingência. | — | GT |
| F0-T5 | Emendas documentais v1.1 | os quatro arquivos acima | `git diff --check`, `git diff`, `git status --short` | Inconsistências C1–C4 e lacunas L1–L3 corrigidas; Docker-first e F1-T0 incorporados; versão 1.1 e histórico em cada documento; sem duplicações; `git diff --check` com exit 0. | F0-T1..T4 | GT por arquivo |

**Gate G0:** responsável revisou e aprovou os quatro documentos na versão 1.1; escopo congelado; Claude Code autorizado a planejar F1-T0, **não a executar automaticamente**.

**Rollback F0:** documentos ainda não commitados voltam à versão anterior com `git restore <arquivo>`, somente com aprovação.

### F1 — Fundação, persistência e fluxo E2E (09/11)

| ID | Objetivo | Arquivos | Comandos | Critérios de aceite | Dep. | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| F1-T0 | Configurar e validar permissões do Claude Code | `.claude/settings.json`, `docs/governanca.md` | Validação JSON nativa (`ConvertFrom-Json`); `/permissions`; testes negativos locais e somente leitura (`git tag --list`, leitura de `./.env`); teste positivo `git status` | Três níveis de evidência, registrados separadamente em `docs/governanca.md`: (1) **sintaxe**: JSON válido e regras allow/ask/deny listadas em `/permissions`; (2) **testes seguros**: comandos locais e somente leitura casam com regras deny e são bloqueados, e `git status` roda sem prompt, sem nenhuma operação remota; (3) **bloqueio comprovado**: declarado apenas para as regras efetivamente exercitadas. Regras de comandos destrutivos ou remotos ficam como "configuradas, não testadas", nunca executadas para teste nem declaradas bloqueadas por analogia. A sintaxe das regras para PowerShell é validada; `docs/governanca.md` distingue regra documental de controle técnico. | G0 | GT |
| F1-T1 | Fundação Docker-first | `.gitignore`, `.dockerignore`, `.gitattributes`, `.env.example`, `package.json`, `package-lock.json` (gerado), `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`, `Dockerfile`, `docker-compose.yml`, `src/app.ts`, `src/server.ts`, `src/config/env.ts`, `src/http/middlewares/`, `tests/unit/app.test.ts`, `README.md` inicial, `docs/ia.md` | Bootstrap único: `package.json` mínimo escrito à mão e `docker run --rm` com `node:24-alpine` (tag exata), volume anônimo em `node_modules` e `npm install --save-exact`, gerando o lockfile antes de qualquer build; depois `docker compose build dev`, **Q** e `docker compose up --build -d api` | Lockfile gerado em container, sem `node_modules` no host; o estágio `deps` executa apenas `npm ci`; nenhum entrypoint ou comando de inicialização executa `npm install` ou `npm ci`; volume `tourflow_dev_node_modules` exclusivo do `dev`, preenchido a partir da imagem na criação e atualizado só pelo procedimento autorizado do §1, documentado no README; **Q** com exit 0 (lint sem warnings); `api` responde 404 JSON estável em rota desconhecida, publicado só em `127.0.0.1`; imagem `runtime` não-root e sem devDependencies; `.env` ignorado; README com nível B na primeira linha. | F1-T0 | GT; aprovação prévia de branch, pull da imagem Node e download do registro npm |
| F1-T2 | Banco, migrations, seed e saúde | `docker-compose.yml` (`db`, `db-test`), `Dockerfile` (`HEALTHCHECK`), `.env.example` (placeholders do PostgreSQL), `db/migrations/*.sql`, `src/infra/db/`, rota `/health` | `docker compose up -d --wait db`; migrations e seed por `docker compose run --rm`, cada um executado duas vezes; `docker compose --profile test up -d --wait db-test`; contagens via `docker compose exec db psql` | `db` em PostgreSQL 17 Alpine (tag exata), volume `tourflow_pgdata`, sem porta no host; `db-test` no profile `test`, em tmpfs, banco `tourflow_test`, healthcheck `pg_isready` aprovado pelo `--wait`; tabelas e constraints da invariante; segunda execução de migrations sem efeito; seed idempotente com saídas futuras (datas relativas a `now()`), que só insere registros ausentes e nunca altera reservas nem `reserved_seats`; `/health` responde 200 e, com o banco parado, 503 `UNAVAILABLE`. | F1-T1 | GT; aprovação prévia da migration estrutural e do pull da imagem PostgreSQL |
| F1-T3 | Consultas | `src/repositories/`, `src/services/`, `src/http/routes/`, `src/http/controllers/` | **Q**; `curl` contra `127.0.0.1` | `GET /experiences` e `GET /departures` retornam registros do banco; filtro `experienceId` funciona e UUID inválido retorna 400 `VALIDATION_ERROR`. | F1-T2 | GT |
| F1-T4 | Reservas | `src/domain/`, `src/services/`, `src/repositories/pg/`, rotas de reservas | **Q**; `curl` | `POST /reservations` transacional com `SELECT ... FOR UPDATE` e `GET /reservations/:id`; validação strict; erros 400 `VALIDATION_ERROR`, 404 `NOT_FOUND`, 409 `NO_AVAILABILITY` e 409 `DEPARTURE_CLOSED`; concorrência protegida. | F1-T3 | GT |
| F1-T5 | E2E manual documentado | `README.md` (seção do fluxo) | `docker compose up --build -d`; migrations e seed; `curl` | Compose com um comando sobe `api` e `db` saudáveis; fluxo listar→reservar→consultar reproduzível por curl; pedido acima das vagas retorna 409 sem alterar a ocupação. | F1-T4 | GT |

**Gate G1:** ambiente inicia do zero via Docker, seed e migrations executam no **banco do projeto**, fluxo confirmado em PostgreSQL, não há sobre-reserva comprovada manualmente; saída de comandos e diffs anexados ao relatório de tarefa.

**Rollback F1:** política do §1. Em F1-T0, voltar à configuração anterior de permissões. Em F1-T1, `docker compose down` sem `-v`; imagens e volume `tourflow_dev_node_modules` são removidos apenas pelo responsável. Em F1-T2, migration com falha é revertida pela própria transação; reverter schema já aplicado ou recriar o banco de desenvolvimento exige aprovação explícita e nunca apaga `tourflow_pgdata` automaticamente. Em F1-T3..T5, reverter apenas os arquivos da tarefa.

### F2 — Testes e CI (10/11)

| ID | Objetivo | Arquivos | Comandos | Critérios de aceite | Dep. | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| F2-T1 | Testes unitários | `tests/unit/` | `docker compose run --rm dev npm run test:unit` | Regras de participantes válidos (1 a 20), capacidade, saída encerrada, inexistência e erro de domínio testadas com asserções, usando repositório fake. | G1 | GT |
| F2-T2 | Teste de integração | `tests/integration/`, `tests/helpers/` | `docker compose --profile test up -d --wait db-test`; `docker compose run --rm dev npm run test:integration` | API real + `db-test` isolado; guarda aborta a suíte se o host não for `db-test` ou o banco não terminar em `_test`; caso feliz, consulta persistida, 409 e cenário concorrente. | F2-T1 | GT |
| F2-T3 | Coverage | `vitest.config.ts`, `package.json` | `docker compose run --rm dev npm run test:unit -- --coverage` | `@vitest/coverage-v8` com limiar >= 80% de linhas **e branches** em `src/domain/**/*.ts` e `src/services/**/*.ts`; comando falha se abaixo. | F2-T2 | GT; aprovação prévia da dependência de coverage |
| F2-T4 | GitHub Actions | `.github/workflows/ci.yml` | No runner: `docker compose build dev` (executa `npm ci`), **Q** com coverage, `db-test` via profile `test` e testes de integração | `runs-on: ubuntu-latest`, sem labels `self-hosted`; build, lint, typecheck, unitários com coverage e integração via Docker Compose; run verde com link. | F2-T3 | GT; push executado pelo responsável |

**Gate G2:** pipeline finaliza verde; saídas e cobertura reais disponíveis; isolamento da base de teste comprovado.

**Rollback F2:** reverter apenas os arquivos de teste, configuração e workflow da tarefa; `db-test` é descartável (tmpfs) e é parado com `docker compose stop db-test`. Nenhuma operação remota pelo agente: correção de workflow já publicado é feita por novo commit, com push pelo responsável.

### F3 — Observabilidade e contrato (11/11)

| ID | Objetivo | Arquivos | Comandos | Critérios de aceite | Dep. | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| F3-T1 | Logs | `src/infra/logger.ts`, middleware de request ID | **Q**; `docker compose logs api` | Pino JSON com os campos obrigatórios `requestId`, `method`, `route`, `statusCode`, `durationMs` e, em respostas de erro, `errorCode`; demonstração registrada de uma linha de log de sucesso e uma de erro, ambas JSON válidas; nenhum e-mail, corpo de requisição, credencial ou outro dado pessoal nos logs. | G2 | GT; aprovação prévia da dependência Pino |
| F3-T2 | Métrica e SLO | rota `/metrics`, `README.md` (seção SLO) | **Q**; `curl` em `/metrics` | `tourflow_reservations_confirmed_total` exposta em `/metrics`; SLO documentado conforme PRD RNF-08 (SLI, objetivo ≥ 99%, amostra mínima de 200 requisições, inconclusivo abaixo disso). | F3-T1 | GT; aprovação prévia da dependência prom-client |
| F3-T3 | OpenAPI 3.1 | `docs/openapi.yaml` | validação do YAML em container | POST `/reservations` com respostas 201/400/404/409 (`VALIDATION_ERROR`, `NOT_FOUND`, `NO_AVAILABILITY`, `DEPARTURE_CLOSED`), schemas e exemplos válidos. | F3-T2 | GT |
| F3-T4 | ADR e README | `docs/adr/0001-arquitetura.md`, `README.md` | — | ADR coerente com implementação; README contém nível na **primeira linha**, pré-requisitos (Docker e Git), subir/testar via Docker e limitações; README ou ADR traz tabela SOLID com princípio, arquivo ou componente, evidência e limitação: SRP (controllers, services e repositories com responsabilidades distintas), DIP (services dependem de contratos de repositório, não da implementação PostgreSQL), ISP (interfaces pequenas e adequadas a cada consumidor), OCP e LSP apenas onde se aplicam (substituição do repositório PostgreSQL pelo fake nos testes sem alterar os services), sem abstrações artificiais; princípio sem evidência é registrado como não demonstrado, nunca declarado atendido. | F3-T3 | GT |

**Gate G3:** logs/métrica inspecionáveis, contrato coerente com API executada, documentação permite reprodução, CI segue verde.

**Rollback F3:** reverter apenas os arquivos da tarefa; remoção de dependência incluída segue o procedimento autorizado do §1.

### F4 — Smoke k6 e homologação (12/11)

| ID | Objetivo | Arquivos | Comandos | Critérios de aceite | Dep. | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| F4-T1 | Smoke k6 | `performance/smoke.js`, `docker-compose.yml` (`k6`, profile `perf`) | `docker compose run --rm k6 run /scripts/smoke.js` | Cenário controlado de 1 VU por 30 s em `GET /departures`; thresholds `p(95)<500` (smoke) e `slo_departures_ok rate>=0.99` (SLO), avaliados separadamente; total de requisições registrado; sem assumir sucesso. | G3 | GT; aprovação prévia do pull da imagem k6 |
| F4-T2 | Resultado real | `docs/desempenho.md` | — | Data, hardware/ambiente, script, comando, duração, VUs, amostra, p95 real, resultado do SLO (atingido, não atingido ou inconclusivo se a amostra for menor que 200), falhas, conclusão e limites. | F4-T1 | GT |
| F4-T3 | Revisão de segurança | — | `git status`; busca de segredos; `docker compose config` | Sem segredos; `.env.example` só com placeholders; portas apenas em `127.0.0.1` e banco sem porta; lockfile e imagens com tag exata; permissões; dependências; nenhum runner self-hosted; comandos revisados. | F4-T2 | GT |
| F4-T4 | Revisão documental | `docs/ia.md`, `CONTRIBUTORS.md`, `README.md` | — | `docs/ia.md` com prompts relevantes e revisão; `CONTRIBUTORS.md` com autoria e contribuições; README final. | F4-T3 | GT |
| F4-T5 | Ensaio de clone limpo | — | Clone em diretório novo e comandos do README, apenas com Docker e Git | Reproduzir exatamente comandos do README; CI verde; conferir todos os artefatos. | F4-T4 | GT |

**Gate G4:** p95 real e resultado do SLO registrados (positivos, negativos ou inconclusivos, sem fabricação), checklist da rubrica completo e evidências acessíveis; fluxo em clone limpo funciona.

**Rollback F4:** reverter apenas os arquivos da tarefa; resultados de medição nunca são apagados para esconder falhas. O diretório do ensaio de clone limpo e seus recursos Docker são removidos apenas pelo responsável.

### F5 — Congelamento e entrega (13/11)

| ID | Objetivo | Arquivos | Comandos | Critérios de aceite | Dep. | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| F5-T1 | Revisar mudança final | — | `git status`, `git log` | `git status` limpo, SHA do commit, revisão de segredos e arquivos de entrega. | G4 | GT |
| F5-T2 | Validar CI final | — | consulta ao run do GitHub Actions | URL e SHA da última execução verde correspondem ao commit entregue. | F5-T1 | GT |
| F5-T3 | Submissão pelo Moodle | — | ação humana | URL repositório/convite, README, CI verde, `docs/desempenho.md`, `CONTRIBUTORS.md`; confirmação de envio. | F5-T2 | GT |

**Gate G5:** evidência de submissão antes do prazo. Commits posteriores a 13/11 não serão avaliados. Não declarar 'entregue' sem confirmação humana do Moodle.

**Rollback F5:** antes do prazo, correções entram por novo commit aprovado; sem reescrita de histórico nem force push.

### F6 — Apresentação opcional (16/11)

Roteiro: 1 min problema/nível; 3 min demo Compose/API; 3 min ADR/alternativa descartada; 3 min p95, SLO e aprendizados. Caso vídeo, enviar **até 13/11**.

## 3. Matriz de rastreabilidade da rubrica

Critérios e pesos oficiais, sem alteração, conforme PRD §8.

| Critério oficial | Peso | Tarefas | Evidência |
| --- | ---: | --- | --- |
| M1 — Funciona, código e design | 35 | F1, F3-T4 | `Dockerfile`, `docker-compose.yml`, código e ADR |
| M2 — Testes e CI verde | 20 | F2-T1..T4 | testes, relatório de coverage e URL de run verde |
| M3 — Ambientes, segredos e observabilidade | 15 | F1-T1, F2-T4, F3-T1..T2, F4-T3 | URL de run verde, `.env.example`, repositório limpo de segredos, stdout JSON, `/metrics`, SLO no README |
| M4 — Arquitetura, documentação e desempenho | 30 | F3-T3..T4, F4-T1..T2 | README, ADR, OpenAPI, `performance/smoke.js` e `docs/desempenho.md` |
| Entrega e uso de IA | — | F4-T4, F5 | `CONTRIBUTORS.md`, `docs/ia.md`, Moodle |

**Nota:** a evidência de CI aparece em M2 e M3 por causa da ambiguidade da fonte oficial registrada no PRD §8, pendente de confirmação com o docente. Os pesos são por critério; a pontuação individual depende da avaliação docente.

## 4. Evidências e checkpoints

Para cada gate, registrar em relatório curto: data, commit/branch, comandos e exit codes, cobertura quando aplicável, evidência de HTTP, resultado observado, decisão humana e pendências. Nunca escrever `PASSOU` sem ter executado a checagem correspondente. Não inventar link de CI, percentual de cobertura, p95 ou resultado de SLO.

## 5. Contingência por prioridade

1. **Não cortar:** reservas com consistência, PostgreSQL/Compose, testes de domínio+integração, coverage mínimo, CI, `.env.example`, logs, uma métrica, SLO, ADR, OpenAPI, k6/p95, README e documentos de entrega.
2. **Pode simplificar:** campos do catálogo, formatação de logs, seed, estrutura de pastas e variedade de cenários de carga, sem perder o requisito mínimo.
3. **Cortar primeiro:** cancelamento, filtros extras, dashboard, qualquer funcionalidade adicional.
4. **Se p95 ou SLO não atingirem a meta:** registrar a medição verdadeira, analisar gargalo e limitação; não falsificar nem esconder resultado. Amostra abaixo de 200 requisições torna o SLO inconclusivo.

## 6. Prompt de entrada para a Fase 1 (planejamento apenas)

```text
Você está no repositório TourFlow API, Projeto Final Full Cycle — Nível B.
Leia integralmente PRD.md, CLAUDE.md, ROADMAP.md e docs/adr/0001-arquitetura.md.
Verifique git status e inspecione apenas os arquivos existentes.
Estamos na tarefa F1-T0, mas ainda NÃO há autorização para modificar arquivos,
instalar dependências, executar Docker ou migrations, criar commits ou acessar serviços remotos.
Entregue: diagnóstico inicial, plano mínimo para F1-T0, caminhos que pretende criar,
comandos planejados, testes, riscos, critérios de aceite e rollback.
Pare e solicite aprovação explícita para executar F1-T0.
```

## 7. Histórico de alterações

| Versão | Data | Tarefa | Alteração |
| --- | --- | --- | --- |
| 1.0 | 2026-11-08 | F0-T4 | Versão inicial do roadmap. |
| 1.1 | 2026-11-08 | F0-T5 | F0-T5 e G0 sobre os documentos v1.1; nova F1-T0 com três níveis de evidência de permissões (sintaxe, testes seguros, bloqueio comprovado); F1-T1 Docker-first com bootstrap do lockfile em container temporário e atualização de dependências apenas por procedimento explícito e autorizado, sem instalação no startup; responsabilidade pelos artefatos Docker; F1-T2 com `db`, `db-test` (profile `test`, `--wait`) e seed idempotente; rollback não destrutivo por fase; tabelas com objetivo, arquivos, comandos, critérios, dependência e gate; CI em `ubuntu-latest` via Docker Compose; thresholds separados de p95 e SLO; matriz com nomes oficiais da rubrica e ambiguidade do CI; prompt de entrada voltado à F1-T0; evidências SOLID na F3-T4 e campos obrigatórios de log na F3-T1. |
| 1.2 | 2026-11-11 | F5 | Seção "Situação em 11/11/2026" com trajetória, status real e evidência por fase, marcos da F5 (PR #12, merge `f0237c8`, CI 43059539492) e etapas restantes da revisão documental, da nova promoção e do Moodle. Plano original das fases (§1 a §6) preservado. |
