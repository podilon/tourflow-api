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

## Checkpoint atual — F1-T1 (2026-11-11)

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

Publicação automatizada da F1-T1, delegada pelo responsável ao Claude Code: commit `feat: add Docker-first foundation (F1-T1)`, commit do CI da fundação (`ubuntu-latest`, Docker Compose), push de `feat/f1-t1-docker-foundation`, PR para `main` e merge somente com CI verde no SHA atual do PR e proteções do GitHub satisfeitas. As evidências de aceite continuam as registradas acima: 10 de 10 testes, lint, typecheck e build via Compose, e 404 confirmado pelo responsável no host. A F1-T2 depende de aprovação própria.

## Governança

- Consultar `CLAUDE.md`, `PRD.md`, `ROADMAP.md`, `docs/adr/0001-arquitetura.md` e `docs/governanca.md`.
- Não iniciar tarefa sem autorização. Git de escrita permanece sob controle humano.
- Não acessar produção, VPS ou bancos externos. Não excluir volumes. Não usar permissões irrestritas.
- Limitações conhecidas das permissões: `ask Bash(mkdir *)` comprovado; `ask PowerShell(New-Item *)` não comprovado (`docs/governanca.md` §7).

## Regra de atualização

Atualizar este documento somente após um marco verificável, informando data, tarefa, commit e branch confirmados, testes realmente executados, pendências e próxima ação. Não declarar tarefas concluídas sem evidências.
