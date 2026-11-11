# TourFlow API — Projeto B (Projeto Final Full Cycle, nível simples)

API REST de reservas turísticas com prevenção de sobre-reserva. Escopo, critérios de aceite e arquitetura: [PRD](PRD.md), [ADR-0001](docs/adr/0001-arquitetura.md) e [ROADMAP](ROADMAP.md).

> **Estado atual: Bloco 4 (F4-T1 a F4-T4), validado localmente; ensaio em clone limpo (F4-T5) pendente.** O smoke k6 mediu p95 de 1,913 ms e o SLO educacional foi **ATINGIDO** (100% de 572 amostras): ver [docs/desempenho.md](docs/desempenho.md). A API sobe com o PostgreSQL 17, aplica o schema e o catálogo fictício por comandos explícitos, informa a saúde do banco em `/health`, lista experiências e saídas, cria reservas com bloqueio transacional (`POST /reservations`) e as consulta (`GET /reservations/:id`). Cada requisição gera uma linha de log JSON (Pino) com request ID, e `GET /metrics` expõe `tourflow_reservations_confirmed_total`. O contrato de reservas está em [docs/openapi.yaml](docs/openapi.yaml) (OpenAPI 3.1). O CI executa lint, typecheck, unitários com cobertura mínima de 80% (linhas e branches), integração com PostgreSQL isolado (`db-test`) e build. O smoke k6 roda em container (profile `perf`).

## Pré-requisitos

- Docker Desktop (ou Docker Engine) com Docker Compose v2.
- Git.

Node.js e npm **não** são necessários no host: todas as execuções de Node.js, npm, lint, testes e build ocorrem em containers.

## Subir a API e o banco

```bash
docker compose up --build -d --wait api   # sobe db (saudável) e api
docker compose ps
```

A porta da API é publicada apenas em `127.0.0.1:3000`. O PostgreSQL (`db`) não publica porta no host; seus dados ficam no volume `tourflow_pgdata`.

### Ambiente paralelo isolado (opcional)

O projeto Compose, a porta da API no host, os volumes e a tag das imagens locais são parametrizados. Os padrões valem quando nada é definido: projeto `tourflow`, porta `3000`, volumes `tourflow_pgdata` e `tourflow_dev_node_modules`, imagens `tourflow-api:local` e `tourflow-dev:local`. Para rodar uma segunda cópia (por exemplo, um clone limpo) sem tocar no ambiente atual, defina no `.env` da cópia:

```dotenv
COMPOSE_PROJECT_NAME=tourflow_clean
TOURFLOW_API_PORT=3100
TOURFLOW_PGDATA_VOLUME=tourflow_clean_pgdata
TOURFLOW_NODE_MODULES_VOLUME=tourflow_clean_dev_node_modules
TOURFLOW_IMAGE_TAG=clean
```

Os comandos deste README continuam os mesmos; nos exemplos com `curl.exe`, troque a porta `3000` pela definida. Antes de subir os serviços, confira a configuração efetiva com `docker compose config` (nome do projeto, porta publicada em `127.0.0.1`, volumes e tags).

## Migrations e seed

Passos explícitos, idempotentes e não destrutivos, executados na imagem da API:

```bash
docker compose run --rm --no-deps api node dist/infra/db/migrate.js
docker compose run --rm --no-deps api node dist/infra/db/seed.js
```

- Antes de gravar, os dois comandos conferem o alvo: host `db`, porta interna `5432`, banco `tourflow` e, já conectados, `current_database()` e `inet_server_port()`. Variáveis `PG*` e `DATABASE_URL` são rejeitadas para que nada redirecione a conexão. Credenciais não aparecem nos logs.
- A migration roda numa transação, adquire um advisory lock antes de consultar `schema_migrations` e aplica apenas versões ausentes. A segunda execução responde `No pending migrations`.
- A seed insere duas experiências e quatro saídas **fictícias** com IDs fixos (`ON CONFLICT DO NOTHING`). Ela nunca altera linhas existentes, reservas nem `reserved_seats`. As datas são `CURRENT_DATE + N + TIME '09:00'` com fuso fixado em **UTC** (`SET LOCAL TIME ZONE 'UTC'`): cada saída começa às 09:00 UTC, de 7 a 21 dias depois da data UTC da primeira execução.

## Saúde

```powershell
curl.exe --include http://127.0.0.1:3000/health
```

- `200` `{"status":"ok","database":"up"}` quando a API alcança o banco.
- `503` `{"error":{"code":"UNAVAILABLE","message":"Database is unavailable"}}` quando o banco está inacessível. A API continua no ar e volta a responder `200` quando o banco retorna.
- O `HEALTHCHECK` da imagem `runtime` consulta essa rota. Por isso, o `docker compose ps` mostra `api` como `unhealthy` enquanto o banco estiver parado.

Rota desconhecida: `404` com `{"error":{"code":"NOT_FOUND","message":"Resource not found"}}`.

## Catálogo (somente leitura)

```powershell
curl.exe http://127.0.0.1:3000/experiences
curl.exe http://127.0.0.1:3000/departures
curl.exe "http://127.0.0.1:3000/departures?experienceId=8f0c2a1e-1b6d-4c1a-9a51-0d2b6f1e7a01"
```

- `GET /experiences` → `200` com array JSON de `{ id, name, description, durationMinutes }`, ordenado por `name` e, em empate, por `id`.
- `GET /departures` → `200` com array JSON de `{ id, experienceId, startsAt, capacity, availableSeats, priceCents }`, ordenado por `startsAt` e, em empate, por `id`. `startsAt` é ISO 8601 em UTC (`2026-11-18T09:00:00.000Z`), `priceCents` é inteiro e `availableSeats` = `capacity` − `reserved_seats`.
- Filtro opcional `experienceId` (UUID, validado com Zod e enviado ao SQL como parâmetro). UUID existente devolve só as saídas daquela experiência. UUID válido sem experiência devolve `200` com `[]`.
- Filtro inválido, vazio, repetido ou parâmetro desconhecido → `400` `{"error":{"code":"VALIDATION_ERROR","message":"Invalid query parameters"}}`, sem ecoar a entrada.
- Falha do banco nessas rotas → `500` `INTERNAL_ERROR`, sem detalhe interno.

## Reservas

```powershell
curl.exe --include -X POST http://127.0.0.1:3000/reservations -H "Content-Type: application/json" -d "{\"departureId\":\"3c9e7b52-6a0f-4d8e-8b1c-5f2a9d4e6b01\",\"customerName\":\"Cliente Ficticio\",\"customerEmail\":\"cliente@example.test\",\"participants\":2}"
curl.exe --include http://127.0.0.1:3000/reservations/<id>
```

- `POST /reservations` → `201`, cabeçalho `Location: /reservations/<id>` e corpo `{ id, departureId, participants, status: "CONFIRMED", createdAt }`. Nome e e-mail são gravados, mas **nunca devolvidos**.
- `GET /reservations/:id` → `200` com o mesmo corpo; `404 NOT_FOUND` se não existir; `400 VALIDATION_ERROR` se o id não for UUID.
- Validação strict (Zod): `departureId` UUID; `customerName` de 1 a 120 caracteres depois de aparar espaços; `customerEmail` válido, até 254 caracteres; `participants` inteiro de 1 a 20; propriedade desconhecida rejeitada. Inválido → `400` `{"error":{"code":"VALIDATION_ERROR","message":"Invalid reservation payload"}}`, sem ecoar a entrada.
- Saída inexistente → `404 NOT_FOUND`. Saída com início `<=` agora → `409 DEPARTURE_CLOSED`. `participants` acima das vagas → `409 NO_AVAILABILITY`. Nos três casos, nada é gravado. Falha inesperada → `500 INTERNAL_ERROR` genérico.

### Como a sobre-reserva é impedida

Numa única conexão e transação: `BEGIN`; `SET LOCAL lock_timeout = '1500ms'`, `statement_timeout = '1800ms'` e `idle_in_transaction_session_timeout = '5s'`; `SELECT ... FROM departures WHERE id = $1 FOR UPDATE`; `SELECT clock_timestamp()` **depois** de obter o bloqueio (o `now()` seria o início da transação, anterior à espera); verificação de horário e vagas no domínio (`src/domain/reservation.ts`); `INSERT` da reserva; `UPDATE departures SET reserved_seats = reserved_seats + $2`; `COMMIT`. Requisições concorrentes na mesma saída esperam na fila do bloqueio e decidem com o valor já confirmado pela anterior.

- Os limites seguem a ordem lock (1,5 s) < statement (1,8 s) < `query_timeout` do cliente `pg` (2 s): o servidor cancela antes do cliente e a conexão fica em estado conhecido. O limite de ociosidade (5 s) encerra uma transação abandonada.
- Qualquer falha provoca `ROLLBACK`. A conexão volta ao pool somente depois de uma regra de negócio (404/409) com rollback confirmado; em erro inesperado, falha no `COMMIT` ou rollback malsucedido, ela é descartada (`release(true)`).
- Expirar o `lock_timeout` produz `500 INTERNAL_ERROR` (o `503` é reservado ao healthcheck pelo PRD).

## Fluxo de ponta a ponta (E2E manual)

Com `api` e `db` no ar, migrations e seed aplicadas:

1. `curl.exe http://127.0.0.1:3000/departures` — a saída `3c9e7b52-…6b01` mostra `availableSeats: 12`.
2. `POST /reservations` com `participants: 2` nessa saída (exemplo acima) → `201` com `Location`.
3. `GET /reservations/<id>` → `200` com o mesmo corpo; `GET /departures` agora mostra `availableSeats: 10`.
4. `POST /reservations` com `participants: 11` → `409 NO_AVAILABILITY`; `availableSeats` continua `10`.

Evidência registrada em `docs/estado-execucao.md` (reserva fictícia `9c08f28d-1577-438f-848b-0ccc191e0bb0`).

## Contrato OpenAPI

[docs/openapi.yaml](docs/openapi.yaml) descreve, em OpenAPI 3.1, `POST /reservations` (201, 400, 404, 409 `NO_AVAILABILITY`/`DEPARTURE_CLOSED`, 500) e `GET /reservations/{id}` (200, 400, 404, 500), com schemas, cabeçalhos `Location` e `X-Request-Id` e exemplos fictícios. Somente referências locais (`#/components/...`).

`tests/unit/openapi.test.ts` valida o documento com `@apidevtools/swagger-parser` dentro do container (`npm run test`), confere que só há referências locais, que o exemplo de requisição é aceito pelo schema Zod da API, que os limites do schema espelham o Zod e que a resposta `201` real tem exatamente as propriedades do schema `Reservation`.

## Observabilidade

### Logs (Pino, JSON no stdout)

```bash
docker compose logs --tail 20 api
```

Uma linha JSON por requisição, escrita ao fim da resposta (`src/http/middlewares/request-context.ts`):

```json
{"level":40,"time":"2026-11-11T14:38:38.210Z","requestId":"b584dd65-4abc-4cbb-97d1-5dfe2974f6d1","method":"GET","route":"/departures","statusCode":400,"durationMs":2.196,"errorCode":"VALIDATION_ERROR","msg":"request completed"}
```

- `requestId` (UUID v4) é **gerado pela API** e devolvido no cabeçalho `X-Request-Id`; um valor enviado pelo cliente é ignorado.
- `route` é o **padrão** da rota (`/reservations/:id`), nunca a URL bruta; rota desconhecida aparece como `unmatched`. Query string, corpo, cabeçalhos, nome, e-mail, credenciais e o objeto de erro (mensagem, stack, SQL) não são registrados.
- `errorCode` aparece somente em respostas de erro e repete o código do contrato (`VALIDATION_ERROR`, `NOT_FOUND`, `NO_AVAILABILITY`, `DEPARTURE_CLOSED`, `UNAVAILABLE`, `INTERNAL_ERROR`). Nível: `info` (< 400), `warn` (4xx), `error` (5xx).
- O `HEALTHCHECK` da imagem também gera linhas de `GET /health`.

### Métrica (Prometheus)

```bash
docker compose exec -T api node -e "fetch('http://127.0.0.1:3000/metrics').then(async r => console.log(r.status, await r.text()))"
```

- `GET /metrics` → `200`, `text/plain; version=0.0.4`, a partir de um `Registry` próprio do `prom-client` (`src/infra/metrics.ts`), sem as métricas padrão do processo.
- `tourflow_reservations_confirmed_total` (counter) incrementa **somente depois do `COMMIT`** de uma reserva (`onConfirmed` em `src/services/reservation-service.ts`). Respostas 400, 404 e 409 não incrementam. Uma falha da instrumentação é absorvida e não transforma a reserva confirmada em erro HTTP.
- O contador é por processo e volta a zero quando a API reinicia.
- Prova contra PostgreSQL real: `tests/integration/reservations.test.ts` (`db-test`) confirma que um `201` incrementa e um `409 NO_AVAILABILITY` não incrementa.

### SLO educacional de `GET /departures`

| Item | Definição |
| --- | --- |
| SLI | Proporção de requisições `GET /departures` com status `200` **e** duração `< 500 ms`. |
| Objetivo | **≥ 99%** dessas requisições. |
| Verificação | Métrica k6 `slo_departures_ok` com threshold `rate>=0.99`, calculada sobre as requisições efetivamente registradas numa execução local. |
| Amostra mínima | **200 requisições**. Abaixo disso, o resultado é **inconclusivo**, sem extrapolação nem escolha de execuções favoráveis. |
| Janela | Uma execução k6 local (ambiente Docker Compose desta máquina). |
| Limitações | Meta educacional, local, sem tráfego real; não é um SLO de produção. O p95 do smoke é medido separadamente, com threshold próprio. |

**Medição oficial (2026-11-11):** 572 amostras, `slo_departures_ok` = 100,00% → **ATINGIDO**. Detalhes, ambiente e limites em [docs/desempenho.md](docs/desempenho.md).

## Smoke k6 (desempenho)

Com `api` e `db` no ar (seção "Subir a API e o banco", com migrations e seed aplicadas):

```bash
docker compose --profile perf run --rm --no-deps k6 run smoke.js
```

- Serviço `k6` (profile `perf`): imagem `grafana/k6:1.0.0` fixada por digest do índice, script em [`performance/smoke.js`](performance/smoke.js) montado somente leitura em `/scripts`, resultado gravado em `performance/results/smoke-summary.json`. Ele acessa `http://api:3000` pela rede interna e não publica porta.
- Cenário: 1 VU por 30 s em `GET /departures`, com intervalo de 50 ms. São dois thresholds avaliados separadamente: `p(95)<500` (smoke) e `slo_departures_ok rate>=0.99` (SLO, sucesso só com HTTP 200 abaixo de 500 ms). O SLO é classificado como inconclusivo abaixo de 200 amostras.
- Somente leitura: não cria reservas. Um threshold reprovado faz o k6 terminar com código 99; isso é resultado da medição e deve ser registrado, não contornado.
- Resultado oficial: p95 de **1,913 ms** e SLO **ATINGIDO** (572/572), com código de saída 0 ([docs/desempenho.md](docs/desempenho.md)). Executar de novo sobrescreve o `smoke-summary.json` local; a evidência oficial é a versionada no Git.

## Banco de teste isolado e testes de integração

```bash
docker compose --profile test up -d --wait db-test
docker compose run --rm --no-deps dev npm run test:integration
docker compose --profile test stop db-test   # descarta o tmpfs
```

- `db-test` é outra instância (banco `tourflow_test`) com os dados em tmpfs, descartados ao parar o container, e sem porta publicada.
- O serviço `dev` recebe `TEST_DB_*`. Antes de aplicar o schema versionado existente ou gravar fixtures, a suíte confere host `db-test`, porta `5432` e banco `tourflow_test` e, já conectada, `current_database()` e `inet_server_port()`; qualquer divergência aborta (`tests/helpers/test-db.ts`). O migrador de desenvolvimento continua restrito a `db/tourflow`.
- Cada teste cria experiência e saída fictícias com UUIDs novos; nada é apagado.
- A suíte cobre caso feliz com persistência, consulta, 400, 404, 409 `NO_AVAILABILITY`, 409 `DEPARTURE_CLOSED`, o contador `tourflow_reservations_confirmed_total` (201 incrementa, 409 não) e duas provas de concorrência: duas reservas de 2 vagas disputando uma saída de capacidade 3 (as duas esperas pelo bloqueio são observadas em `pg_stat_activity`; resultado: um `201`, um `409`, uma reserva e `reserved_seats = 2`) e uma saída que se encerra durante a espera (`409 DEPARTURE_CLOSED`, nada gravado, embora a transação tenha começado antes do início da saída).

## Configuração

Opcional: copie `.env.example` para `.env` (ignorado pelo Git) e use apenas valores locais e fictícios. Sem `.env`, o Compose usa uma senha local fictícia (`TOURFLOW_DB_PASSWORD`), aceitável porque nenhum banco publica porta. O PostgreSQL só lê a senha quando o volume é criado. Trocá-la depois exige recriar o banco, com aprovação, porque isso apaga os dados.

## Qualidade: lint, typecheck, testes e build

O serviço `dev` (profile `dev`) contém as ferramentas de desenvolvimento. O código é montado por bind mount e o `node_modules` fica no volume `tourflow_dev_node_modules`, nunca no host.

```bash
docker compose --profile dev build dev
docker compose run --rm dev npm run lint
docker compose run --rm dev npm run typecheck
docker compose run --rm dev npm run test:unit       # sem banco; "npm run test" é equivalente
docker compose run --rm dev npm run test:coverage   # unitários + cobertura v8 com limiar
docker compose run --rm dev npm run build
```

### Cobertura

- `npm run test:coverage` mede, com o provider v8 (`@vitest/coverage-v8` 5.1.0), todos os arquivos de `src/domain/**/*.ts` e `src/services/**/*.ts`, inclusive os que nenhum teste importa (entram com 0%). O comando **falha** abaixo de 80% de linhas ou de branches (`vitest.config.ts`). O relatório fica em `coverage/` (ignorado pelo Git).
- Medição local em 11/11/2026 (Bloco 3): **100% de linhas (32/32) e 100% de branches (9/9)** em `src/domain/reservation.ts`, `src/services/catalog-service.ts` e `src/services/reservation-service.ts`, com 122 testes unitários em 7 arquivos (exit 0).

### CI

O job `Foundation (Compose lint, typecheck, test, build)`, em `ubuntu-latest`, usa um projeto Compose próprio (`CI_PROJECT`) em todas as etapas: valida o Compose, constrói a imagem `dev`, roda lint, typecheck, `test:coverage`, sobe o `db-test` desse projeto (`--profile test up -d --wait`), roda `test:integration` e o build. O resumo do job lista o resultado de cada etapa e os percentuais de cobertura. Ao final, sempre (`if: always()`), os containers do job são encerrados com `down --remove-orphans`, sem `-v`. O banco de desenvolvimento (`db`) não participa.

Os testes de integração exigem o `db-test` (seção acima).

## Sincronizar dependências do ambiente `dev`

O volume `tourflow_dev_node_modules` é preenchido a partir da imagem `dev` **somente quando é criado**. Depois de qualquer mudança no `package-lock.json`, sincronize explicitamente:

```bash
docker compose --profile dev build dev
docker compose run --rm dev npm ci
```

Nenhum container instala dependências ao iniciar. Incluir uma dependência nova exige aprovação prévia (ver ROADMAP §1) e é feito em container: `docker compose run --rm dev npm install --save-exact <pacote>`.

## Parar

```bash
docker compose --profile test stop api db db-test   # ou: docker compose down
```

Nunca use `docker compose down -v`: esse comando apaga os volumes do projeto, inclusive o banco de desenvolvimento (`tourflow_pgdata`).

## Imagem e estrutura

- `Dockerfile` multi-stage: `base` (Node.js 24.22.2 / Alpine 3.24, fixado por digest), `deps` (`npm ci`), `dev`, `build` (compila `src/` para `dist/`) e `runtime` (apenas `dist/`, `db/` e dependências de produção, usuário não-root `node`, `HEALTHCHECK` em `/health`).
- PostgreSQL `postgres:17.11-alpine`, fixado por digest, em `db` (volume persistente) e `db-test` (tmpfs, profile `test`).
- `src/app.ts` monta a aplicação Express sem abrir porta, com dependências injetadas e testável com Supertest. `src/server.ts` abre a porta e cria o pool. `src/config/env.ts` valida a configuração com Zod. `src/http/` contém as rotas (`/health`, catálogo, reservas), os controllers e o tratamento de 404 e de erros. `src/domain/reservation.ts` concentra validação do payload e regras de reserva (saída inexistente, encerrada, sem vagas). `src/services/` deriva `availableSeats`, serializa datas e orquestra a reserva; `src/repositories/` define os contratos e as implementações PostgreSQL com SQL parametrizado (a de reservas executa a transação com `FOR UPDATE`). `src/infra/db/` reúne o pool, o health check, a aplicação de migrations (`migrations.ts`, compartilhada com a integração) e os executores de migration e seed. `src/infra/logger.ts` cria o logger Pino e `src/infra/metrics.ts` o `Registry` e o contador; `src/http/middlewares/request-context.ts` gera o request ID e escreve o log de cada requisição; `src/http/routes/metrics.ts` expõe `/metrics`. `tests/unit/` usa fakes; `tests/integration/` usa o `db-test`. O SQL versionado fica em `db/migrations/` e `db/seeds/`.
- Erros seguem o contrato `{"error":{"code":"<CÓDIGO>","message":"..."}}`, sem stack trace na resposta. Todas as respostas de erro passam por `src/http/send-error.ts`, que também entrega o `errorCode` ao log.

## Design: Repository Pattern e SOLID

O padrão adotado é o **Repository Pattern** ([ADR-0001](docs/adr/0001-arquitetura.md)): os services dependem de contratos (`src/repositories/*-repository.ts`), e as implementações PostgreSQL (`src/repositories/pg/`) são injetadas em `src/server.ts`, sem contêiner de injeção.

| Princípio | Arquivo ou componente | Evidência | Limitação |
| --- | --- | --- | --- |
| SRP | `src/http/controllers/*`, `src/services/*`, `src/repositories/pg/*`, `src/domain/reservation.ts`, `src/http/middlewares/request-context.ts` | Controllers validam a entrada e traduzem para HTTP; o domínio decide saída inexistente, encerrada ou sem vagas; services orquestram e serializam; repositórios executam SQL parametrizado e a transação. Log e métrica ficam em `src/infra/` e no middleware, fora das regras. | O controller de reservas mapeia `DomainError` para status HTTP; é tradução de transporte, não regra. |
| DIP | `src/services/reservation-service.ts`, `src/services/catalog-service.ts`, `src/server.ts` | Os services importam apenas os tipos `ReservationRepository`/`CatalogRepository` e recebem a métrica como callback `onConfirmed`, sem depender de `pg` nem de `prom-client`. A composição concreta ocorre só em `src/server.ts`. | `src/app.ts` cria, por padrão, um logger desligado e um `Registry` novo quando nada é injetado (conveniência para os testes). |
| ISP | `src/repositories/reservation-repository.ts`, `src/repositories/catalog-repository.ts`, `ReservationPool`/`TransactionClient` em `pg-reservation-repository.ts` | Contratos pequenos e separados por consumidor: leitura de catálogo (2 métodos), reservas (2 métodos); os repositórios PostgreSQL pedem só `query`/`connect`/`release`, não o `Pool` inteiro. | — |
| LSP | Fakes em `tests/unit/reservation.test.ts`, `tests/unit/catalog.test.ts` e `tests/unit/observability.test.ts` × `tests/integration/reservations.test.ts` | Os mesmos services e controllers rodam com repositórios fake (unitários) e com os repositórios PostgreSQL (integração no `db-test`), sem alteração de código, e produzem os mesmos contratos HTTP. | Há apenas duas implementações de cada contrato (PostgreSQL e fake de teste). |
| OCP | — | **Não demonstrado** como extensão de produção: não há variação real de comportamento que justifique pontos de extensão, e nenhum foi criado por antecipação. A substituição de repositórios nos testes está registrada em LSP. | Abstrações artificiais foram evitadas de propósito (YAGNI). |

## Limitações

- API de demonstração **sem autenticação**: publicada só em `127.0.0.1`, não deve ser exposta.
- Sem cancelamento de reserva, pagamento, cache, filas ou deploy.
- Métrica por processo, sem persistência; logs apenas no stdout do container.
- SLO e p95 medidos numa única execução local de 30 s com 1 VU: não é teste de carga nem SLO de produção ([docs/desempenho.md](docs/desempenho.md)).
- Logs: o handler padrão do Express pode imprimir o stack no stderr quando um erro ocorre depois que a resposta já começou a ser enviada (`error-handler.ts` repassa o erro com `next(err)` quando `res.headersSent`); `src/infra/db/pool.ts` escreve uma linha de texto, não JSON, quando um cliente ocioso falha; uma requisição abortada pelo cliente antes do `finish` não gera linha de log.
- `prom-client` 15.1.3 é marcado como *deprecated* no npm em favor de `@prometheus-io/client`; a troca exige nova aprovação de dependência.

## Rastreabilidade com a rubrica do Projeto B

| Critério (peso) | O que é pedido | Evidência no repositório |
| --- | --- | --- |
| M1 — Funciona, código e design (35) | API E2E, Compose com um comando, SOLID, Repository Pattern + ADR | `docker-compose.yml` e `Dockerfile` (seções "Subir a API e o banco" e "Fluxo de ponta a ponta"); `src/`; tabela SOLID e seção "Design" acima; [ADR-0001](docs/adr/0001-arquitetura.md) |
| M2 — Testes e CI verde (20) | Unitários do domínio, 1+ integração, cobertura com limiar, workflow verde | `tests/unit/` (122 testes), `tests/integration/reservations.test.ts` (10 testes no `db-test`, incluindo concorrência); `vitest.config.ts` com 80% de linhas e branches (medido: 100%); `.github/workflows/ci.yml` (check `Foundation (Compose lint, typecheck, test, build)`, `ubuntu-latest`); URLs dos runs verdes em [docs/estado-execucao.md](docs/estado-execucao.md) |
| M3 — Ambientes, segredos e observabilidade (15) | CI verde, `.env.example`, `.gitignore`, logs Pino, métrica e SLO | [`.env.example`](.env.example) só com placeholders; `.gitignore` com `.env`; seção "Observabilidade" (logs JSON, `/metrics`, SLO) |
| M4 — Arquitetura, documentação e desempenho (30) | README com nível na primeira linha, ADR, OpenAPI, smoke k6, relatório com p95 medido | Primeira linha deste README; [ADR-0001](docs/adr/0001-arquitetura.md); [docs/openapi.yaml](docs/openapi.yaml); [performance/smoke.js](performance/smoke.js); [docs/desempenho.md](docs/desempenho.md) (p95 1,913 ms; SLO ATINGIDO) |
| Entrega e uso de IA | `CONTRIBUTORS.md`, prompts relevantes | [CONTRIBUTORS.md](CONTRIBUTORS.md); [docs/ia.md](docs/ia.md) |

Evidência local e evidência do CI hospedado ficam separadas: o k6 e o ensaio em clone limpo rodam localmente; o CI hospedado executa lint, typecheck, cobertura, integração e build.

## Observações para Windows

O bind mount do código, combinado com o volume em `/app/node_modules`, faz o Docker criar uma pasta `node_modules` **vazia** na raiz do projeto, que serve apenas como ponto de montagem. Ela é ignorada pelo Git e não recebe dependências.

## Uso de IA

O desenvolvimento usa assistência de IA declarada em [docs/ia.md](docs/ia.md).
