# PRD — TourFlow API

> **Projeto Final Full Cycle — Nível B (simples)**
> Estado: **APROVADO — G0** | Versão: 1.1 | Data: 2026-11-08
> Fonte normativa: https://henriquelopeslima.github.io/diglass/aulas/24-projeto-final.html

## 1. Contexto e objetivo

Uma agência de turismo receptivo precisa disponibilizar experiências e saídas programadas e registrar reservas sem vender vagas além da capacidade. O TourFlow API é uma API REST de domínio único, criada do zero exclusivamente para demonstrar um fluxo de reservas **funcionando de ponta a ponta**, com persistência, testes, CI, operação básica e desempenho medido.

**Resultado esperado:** iniciar o ambiente com um comando, consultar uma saída, criar uma reserva válida e consultar sua confirmação; rejeitar reservas sem vagas; comprovar o fluxo em teste de integração.

## 2. Público e atores

- **Operador ou integrador HTTP:** consulta experiências e saídas e solicita reservas.
- **Avaliador:** reproduz a aplicação e os testes a partir do README, verifica o CI e as evidências.
- **Desenvolvedor:** implementa e mantém o código com assistência declarada de IA.

O protótipo **não terá autenticação** e será executado somente em ambiente local/educacional. Não deve ser publicado como serviço público que receba dados reais sem revisão de segurança e privacidade.

## 3. Escopo

### 3.1 Incluído (MVP obrigatório)

| ID | Requisito funcional | Critério de aceite verificável |
| --- | --- | --- |
| RF-01 | Listar experiências (`GET /experiences`) | Responde 200 e coleção JSON; seed mínimo de duas experiências fictícias. |
| RF-02 | Listar saídas (`GET /departures`) | Responde 200 com `id`, experiência, início, capacidade, vagas disponíveis e preço; aceita filtro opcional `experienceId`. |
| RF-03 | Criar reserva (`POST /reservations`) | Payload válido para saída futura com vagas retorna 201, `id` e `status=CONFIRMED`; reserva persistida. Saída com `starts_at <= now()`, verificada sob o mesmo bloqueio da transação, retorna 409 `DEPARTURE_CLOSED` sem alterar o banco. |
| RF-04 | Consultar reserva (`GET /reservations/:id`) | Retorna 200 para ID existente; 404 para inexistente; payload documentado. |
| RF-05 | Impedir sobre-reserva | Se `participants > availableSeats`, retorna 409 `NO_AVAILABILITY`, sem alterar o banco. Sob duas requisições concorrentes, nunca confirma acima da capacidade. |
| RF-06 | Validar entradas | Validação strict do payload: `departureId` UUID válido; `participants` inteiro de 1 a 20; `customerName` com 1 a 120 caracteres após remover espaços nas extremidades; `customerEmail` válido com até 254 caracteres; propriedades desconhecidas rejeitadas. Payload inválido retorna 400 `VALIDATION_ERROR` consistente. |
| RF-07 | Healthcheck (`GET /health`) | Retorna 200 quando API e conexão ao banco estão disponíveis; em falha do banco, 503. |

### 3.2 Opcional, somente se tudo obrigatório estiver verde

- Cancelar reserva (`POST /reservations/:id/cancel`), liberar vagas exatamente uma vez e comprovar com testes; não iniciar antes do gate de conclusão do MVP.

### 3.3 Explicitamente fora do escopo

Painel web, login/autorização, pagamentos, notificações, integrações externas, emissão fiscal, roteirização, vouchers, multi-tenancy, mensageria, cache, microsserviços, deploy em produção ou VPS, importação de dados reais e 100 mil pedidos (exigência apenas do Projeto A).

## 4. Modelo conceitual

- `experiences`: `id` (UUID), `name`, `description`, `duration_minutes`.
- `departures`: `id` (UUID), `experience_id` (FK), `starts_at` (TIMESTAMPTZ), `capacity` (inteiro > 0), `reserved_seats` (inteiro >= 0), `price_cents` (inteiro >= 0).
- `reservations`: `id` (UUID), `departure_id` (FK), `customer_name`, `customer_email`, `participants`, `status` (`CONFIRMED`), `created_at`.

**Invariante:** `0 <= reserved_seats <= capacity`; disponibilidades = `capacity - reserved_seats`. A criação de reserva e a atualização de `reserved_seats` devem ocorrer na **mesma transação** com `SELECT ... FOR UPDATE` na linha da saída, ou equivalente comprovadamente atômico. Sob o bloqueio, verificar que a saída é futura e que há vagas; inserir a reserva apenas após essas checagens.

**Seed:** dados sintéticos e fictícios (nunca dados reais de turistas), com IDs, nomes, capacidades e preços fixos. As datas das saídas são relativas ao momento da execução (por exemplo, `date_trunc('day', now()) + interval 'N days'` com horário fixo), de modo que sempre sejam futuras. A seed é idempotente: executá-la novamente não duplica nem altera registros existentes.

## 5. Contrato HTTP essencial

| Método | Rota | Sucesso | Erros principais |
| --- | --- | --- | --- |
| GET | `/health` | 200 | 503 |
| GET | `/experiences` | 200 | 500 |
| GET | `/departures?experienceId=<uuid>` | 200 | 400, 500 |
| POST | `/reservations` | 201 | 400, 404, 409, 500 |
| GET | `/reservations/:id` | 200 | 400, 404, 500 |
| GET | `/metrics` | 200, formato Prometheus | 500 |

Exemplo de criação (IDs são ilustrativos):

```json
{
  "departureId": "11111111-1111-4111-8111-111111111111",
  "customerName": "Cliente Exemplo",
  "customerEmail": "cliente@example.com",
  "participants": 2
}
```

Resposta `201` mínima: `id`, `departureId`, `participants`, `status`, `createdAt`. Erros têm estrutura estável `{"error":{"code":"<CÓDIGO>","message":"..."}}`; nunca expor stack trace em respostas HTTP.

| HTTP | `code` | Situação |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Payload, parâmetro ou filtro inválido (RF-06). |
| 404 | `NOT_FOUND` | Saída ou reserva inexistente, ou rota desconhecida. |
| 409 | `NO_AVAILABILITY` | `participants` maior que as vagas disponíveis (RF-05). |
| 409 | `DEPARTURE_CLOSED` | Saída já iniciada ou passada (RF-03). |
| 500 | `INTERNAL_ERROR` | Falha inesperada, sem detalhes internos. |
| 503 | `UNAVAILABLE` | Exclusivamente indisponibilidade temporária identificada, como banco inacessível no healthcheck (RF-07); nunca usado como erro genérico. |

## 6. Requisitos não funcionais

| ID | Requisito | Critério de aceite / evidência |
| --- | --- | --- |
| RNF-01 | Ambiente reproduzível (Docker-first) | Toda execução de Node.js/npm ocorre em containers; o host precisa apenas de Docker e Git. Dockerfile multi-stage (`base`, `deps`, `dev`, `build`, `runtime`) e um único `docker-compose.yml` com os serviços `api` (estágio `runtime`), `db` (PostgreSQL 17 Alpine, volume persistente), `dev` (lint, typecheck, testes e build), `db-test` (tmpfs, profile `test`) e `k6` (profile `perf`). `docker compose up --build -d` sobe API + PostgreSQL; README traz comandos para migrations, seed, testes e encerramento (`docker compose down`, sem `-v`). |
| RNF-02 | Design | TypeScript (ESM) com Express 5, responsabilidades separadas; Repository Pattern justificado em ADR-0001. |
| RNF-03 | Testes | Unitários das regras de reserva e pelo menos 1 integração HTTP com PostgreSQL real isolado (`db-test`), executados via `docker compose run --rm dev`. |
| RNF-04 | Cobertura | **80% de linhas e branches** para `src/domain/**/*.ts` e `src/services/**/*.ts`, medidos pelo Vitest (coverage v8); limiar declarado na configuração e aplicado no comando de CI; arquivos de bootstrap/configuração ficam fora do limiar por esse escopo explícito. |
| RNF-05 | CI verde | GitHub Actions em runner hospedado `ubuntu-latest` (runners self-hosted proibidos). Via Docker Compose: build da imagem `dev` (executa `npm ci`), lint, typecheck, testes unitários com verificação de cobertura e testes de integração com `db-test` isolado no job. |
| RNF-06 | Configuração e sigilo | `.env.example` com placeholders, `.env` ignorado; sem segredos reais ou credenciais no histórico; banco de teste nunca usa banco externo. |
| RNF-07 | Observabilidade | Logs Pino em JSON, uma linha por requisição, com os campos obrigatórios `requestId`, `method`, `route`, `statusCode`, `durationMs` e, quando houver erro, `errorCode`; os logs não contêm e-mail, corpo da requisição, credenciais nem outros dados pessoais. Métrica Prometheus `tourflow_reservations_confirmed_total`. |
| RNF-08 | SLO educacional | SLI: proporção de requisições `GET /departures` com status 200 e duração < 500 ms. Objetivo: **≥ 99%**. A verificação do SLO é distinta do smoke da RNF-09: é calculada sobre as requisições efetivamente registradas na execução k6 local, pela métrica `slo_departures_ok` com threshold `rate>=0.99`, e só é válida com amostra mínima de **200 requisições**. Se a execução não alcançar essa amostra, o SLO é declarado **inconclusivo**, sem extrapolação nem seleção de execuções favoráveis. Meta, janela e limitações explícitas; não apresentar como SLO real de produção. |
| RNF-09 | Performance (smoke) | Smoke test k6, executado em container, com 1 VU por 30 s; seu objetivo é medir `http_req_duration` p95, com threshold próprio `p(95)<500`. O smoke, por si só, não comprova o SLO (RNF-08). `docs/desempenho.md` registra ambiente, script, comando, número de requisições, p95, resultado do SLO (atingido, não atingido ou inconclusivo) e interpretação, sempre com resultados reais. |
| RNF-10 | Documentação | `README.md` (primeira linha declara o nível B), `docs/adr/0001-arquitetura.md`, `docs/openapi.yaml` (OpenAPI 3.1, rota principal), `docs/desempenho.md`, `docs/ia.md`, `CONTRIBUTORS.md`. O caminho `docs/adr/0001-decisao.md` do material oficial é tratado como exemplo; a rubrica exige 1 ADR. |
| RNF-11 | Integridade | Migrations versionadas idempotentes no fluxo controlado de ambiente local; nenhuma operação DDL destrutiva em bancos não pertencentes ao projeto. |
| RNF-12 | Segurança básica | Dependências fixadas por lockfile e imagens por tag exata; imagem `runtime` com usuário não-root e sem devDependencies; PostgreSQL sem porta publicada no host; porta da API publicada apenas em `127.0.0.1`; tratamento consistente de erros. |

**Observação:** 80% de cobertura, 99%/500 ms com amostra mínima de 200 requisições, p95 < 500 ms, 1 VU/30 s e os limites de payload são decisões internas deste projeto, **não** valores prescritos pelo professor.

## 7. Critérios de aceite de ponta a ponta (E2E)

1. Clonar repositório em ambiente limpo com Docker e Git e configurar `.env` conforme README.
2. Executar `docker compose up --build -d`; serviços `api` e `db` ficam saudáveis.
3. Aplicar migrations e seed com comando documentado e não destrutivo.
4. `GET /departures` devolve ao menos uma saída futura e vagas disponíveis.
5. `POST /reservations` com 2 vagas disponíveis confirma reserva e diminui vagas em 2.
6. `GET /reservations/:id` devolve a mesma reserva persistida.
7. Solicitação maior que vagas retorna `409`; ocupação permanece estável.
8. Teste concorrente confirma que a capacidade não é ultrapassada.
9. Comandos de teste do README (via `docker compose run --rm dev`) passam com o banco de teste isolado `db-test`; CI está verde.
10. Smoke k6 executado e evidenciado com p95 **medido** e SLO avaliado (atingido, não atingido ou inconclusivo), mesmo se a meta proposta não for alcançada (nesse caso registrar falha e análise).

## 8. Rastreabilidade com a rubrica

Critérios e pesos oficiais, sem alteração (rubrica consultada em 2026-11-08):

| Critério oficial | Peso | Evidência prevista |
| --- | ---: | --- |
| M1 — Funciona, código e design | 35 | API E2E, Compose que sobe com 1 comando, princípios SOLID, Repository Pattern + ADR |
| M2 — Testes e CI verde | 20 | Unitários do domínio, 1+ integração, coverage com limiar declarado e respeitado, workflow verde |
| M3 — Ambientes, segredos e observabilidade | 15 | CI verde (install, lint, test), `.env.example`, `.gitignore`, logs Pino, métrica e SLO |
| M4 — Arquitetura, documentação e desempenho | 30 | README com nível na primeira linha, ADR, OpenAPI, smoke k6, relatório com p95 medido |

**Ambiguidade da fonte oficial (pendente de confirmação com o docente):** o nome do critério M2 inclui "CI verde", mas a tabela de entregáveis do Projeto B lista "CI verde: install, lint, test" em M3. A evidência de CI aparece nas duas linhas apenas para rastreabilidade; os pesos oficiais permanecem inalterados.

Entrega via Moodle até **13/11/2026**: link do GitHub (ou convite), README, link de execução verde do CI, `docs/desempenho.md`, `CONTRIBUTORS.md`. IA permitida, mas seus prompts importantes precisam estar em `docs/ia.md`. Commits após 13/11 não serão avaliados. Apresentação opcional em 16/11 (vídeo, se escolhido, enviado até 13/11).

## 9. Riscos e reduções

| Risco | Mitigação |
| --- | --- |
| Escopo exceder prazo | Congelar MVP; cancelar requisito opcional. |
| Teste passar sem persistência real | Exigir integração com PostgreSQL de teste e asserções no banco. |
| Corrida de reservas | Bloqueio transacional e teste de concorrência. |
| CI divergir do ambiente local | Workflow em `ubuntu-latest` com o mesmo Docker Compose e `db-test` próprio do job. |
| Docker Desktop indisponível ou lento no Windows | Pré-requisito documentado no README; `node_modules` em volume do container, nunca no host. |
| Perda acidental do banco de desenvolvimento | Volumes nomeados separados; `docker compose down -v` fora do fluxo normal. |
| Métrica, p95 ou SLO inventados | Incluir evidência gerada por comando real e marcar pendente até executar; SLO sem amostra mínima é inconclusivo. |
| IA alterar arquivos fora da tarefa | Plano aprovado, diff revisado, branches e permissões restritas (`.claude/settings.json`). |

## 10. Decisões e perguntas ainda abertas

- **Fixadas nesta proposta:** nível B, repositório novo, turismo, monólito em camadas, Node.js 24 + TypeScript (ESM) + Express 5 + PostgreSQL 17 Alpine, ambiente Docker-first, CI em `ubuntu-latest` via Docker Compose, ADR mantido em `docs/adr/0001-arquitetura.md`, sem pagamento/auth.
- **A validar na Fase 1:** Docker Desktop funcional na máquina local (k6 também em container); compatibilidade do PostgreSQL 17 Alpine; nome/visibilidade do repositório; nome(s) em `CONTRIBUTORS.md`.
- **A confirmar com o docente:** módulo da rubrica (M2 ou M3) em que o CI é avaliado.
- **Gate de aprovação:** nenhuma implementação antes da aprovação explícita da Fase 0.

## 11. Histórico de alterações

| Versão | Data | Tarefa | Alteração |
| --- | --- | --- | --- |
| 1.0 | 2026-11-08 | F0-T1 | Versão inicial do PRD. |
| 1.1 | 2026-11-08 | F0-T5 | Saída passada → 409 `DEPARTURE_CLOSED`; validação strict e limites de payload; tabela de códigos de erro (503 `UNAVAILABLE` restrito a indisponibilidade temporária identificada); seed com datas relativas e idempotente; ambiente Docker-first com serviços e estágios definidos; globs de cobertura; CI em `ubuntu-latest` via Docker Compose; verificação do SLO (≥ 99%, mínimo de 200 requisições, senão inconclusivo) distinta do smoke de p95; rubrica com nomes oficiais e pesos inalterados, com ambiguidade do CI registrada; nota sobre o caminho do ADR; campos obrigatórios de log na RNF-07. |
