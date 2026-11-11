# TourFlow API — Projeto B (Projeto Final Full Cycle, nível simples)

API REST de reservas turísticas com prevenção de sobre-reserva. Escopo, critérios de aceite e arquitetura: [PRD](PRD.md), [ADR-0001](docs/adr/0001-arquitetura.md) e [ROADMAP](ROADMAP.md).

> **Estado atual: F1-T1 (fundação Docker-first).** A API sobe, valida a configuração e responde ao contrato de erro (404 em rota desconhecida). Banco de dados, migrations, seed e `/health` chegam na F1-T2; os endpoints de catálogo e reservas, nas tarefas seguintes.

## Pré-requisitos

- Docker Desktop (ou Docker Engine) com Docker Compose v2.
- Git.

Node.js e npm **não** são necessários no host: todas as execuções de Node.js, npm, lint, testes e build ocorrem em containers.

## Subir a API

```bash
docker compose up --build -d api
docker compose ps api
```

A porta é publicada apenas em `127.0.0.1:3000`. Verificação rápida (Windows):

```powershell
curl.exe --include http://127.0.0.1:3000/rota-inexistente
```

Resposta esperada: `404` com `{"error":{"code":"NOT_FOUND","message":"Resource not found"}}`.

Configuração opcional: copie `.env.example` para `.env` (ignorado pelo Git). Use apenas valores locais e fictícios.

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
docker compose stop api   # ou: docker compose down
```

Nunca use `docker compose down -v`: esse comando apaga os volumes do projeto.

## Imagem e estrutura

- `Dockerfile` multi-stage: `base` (Node.js 24.22.2 / Alpine 3.24, fixado por digest), `deps` (`npm ci`), `dev`, `build` (compila `src/` para `dist/`) e `runtime` (apenas `dist/` e dependências de produção, usuário não-root `node`).
- `src/app.ts` monta a aplicação Express sem abrir porta (testável com Supertest); `src/server.ts` abre a porta; `src/config/env.ts` valida a configuração com Zod; `src/http/middlewares/` contém o tratamento de 404 e de erros.
- Erros seguem o contrato `{"error":{"code":"<CÓDIGO>","message":"..."}}`, sem stack trace na resposta.

## Observações para Windows

O bind mount do código, combinado com o volume em `/app/node_modules`, faz o Docker criar uma pasta `node_modules` **vazia** na raiz do projeto, que serve apenas como ponto de montagem. Ela é ignorada pelo Git e não recebe dependências.

## Uso de IA

O desenvolvimento usa assistência de IA declarada em [docs/ia.md](docs/ia.md).
