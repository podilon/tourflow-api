# TourFlow API — Projeto B (Projeto Final Full Cycle, nível simples)

API REST de reservas turísticas com prevenção de sobre-reserva. Escopo, critérios de aceite e arquitetura: [PRD](PRD.md), [ADR-0001](docs/adr/0001-arquitetura.md) e [ROADMAP](ROADMAP.md).

> **Estado atual: F1-T2 (PostgreSQL, migrations, seed e `/health`).** A API sobe com o PostgreSQL 17, aplica o schema e o catálogo fictício por comandos explícitos e informa a saúde do banco em `/health`. Os endpoints de catálogo e reservas chegam nas tarefas seguintes.

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

## Banco de teste isolado

```bash
docker compose --profile test up -d --wait db-test
```

`db-test` é outra instância (banco `tourflow_test`) com os dados em tmpfs, descartados ao parar o container, e sem porta publicada. Os testes de integração que o usam chegam na F2-T2.

## Configuração

Opcional: copie `.env.example` para `.env` (ignorado pelo Git) e use apenas valores locais e fictícios. Sem `.env`, o Compose usa uma senha local fictícia (`TOURFLOW_DB_PASSWORD`), aceitável porque nenhum banco publica porta. O PostgreSQL só lê a senha quando o volume é criado. Trocá-la depois exige recriar o banco, com aprovação, porque isso apaga os dados.

## Qualidade: lint, typecheck, testes e build

O serviço `dev` (profile `dev`) contém as ferramentas de desenvolvimento. O código é montado por bind mount e o `node_modules` fica no volume `tourflow_dev_node_modules`, nunca no host.

```bash
docker compose --profile dev build dev
docker compose run --rm dev npm run lint
docker compose run --rm dev npm run typecheck
docker compose run --rm dev npm run test
docker compose run --rm dev npm run build
```

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
- `src/app.ts` monta a aplicação Express sem abrir porta, com dependências injetadas e testável com Supertest. `src/server.ts` abre a porta e cria o pool. `src/config/env.ts` valida a configuração com Zod. `src/http/` contém a rota `/health` e o tratamento de 404 e de erros. `src/infra/db/` reúne o pool, o health check e os executores de migration e seed. O SQL versionado fica em `db/migrations/` e `db/seeds/`.
- Erros seguem o contrato `{"error":{"code":"<CÓDIGO>","message":"..."}}`, sem stack trace na resposta.

## Observações para Windows

O bind mount do código, combinado com o volume em `/app/node_modules`, faz o Docker criar uma pasta `node_modules` **vazia** na raiz do projeto, que serve apenas como ponto de montagem. Ela é ignorada pelo Git e não recebe dependências.

## Uso de IA

O desenvolvimento usa assistência de IA declarada em [docs/ia.md](docs/ia.md).
