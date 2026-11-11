# ADR-0001 — Monólito em camadas com Repository Pattern e PostgreSQL

- **Status:** Aceito. Aprovado no Gate G0 em 2026-11-08, conforme o commit [`d9b59b3`](https://github.com/podilon/tourflow-api/commit/d9b59b3d1a4198626619639a9ba6ac50f1c24310) ("docs: approve TourFlow API phase 0 architecture"), o cabeçalho do [PRD](../../PRD.md) ("APROVADO — G0") e o `CLAUDE.md`. Implementado nas fases F1 a F4.
- **Versão:** 1.3
- **Data:** 2026-11-11 (v1.0 e v1.1 em 2026-11-08; v1.2 em 2026-11-11)
- **Decisores:** responsável pelo projeto, com apoio consultivo de IA
- **Escopo:** Projeto Final Full Cycle — Nível B / TourFlow API

## 1. Contexto

O projeto precisa comprovar um fluxo de reservas turísticas ponta a ponta em prazo curto. A criação deve garantir integridade transacional e impedir sobre-reservas sob concorrência. A rubrica exige funcionamento, SOLID, um pattern justificado, testes, operação básica e documentação; não exige microsserviços nem grande volume de dados no nível B.

O desenvolvimento ocorre em Windows sem Node.js adequado instalado (a máquina tem versão diferente da exigida), e os runners self-hosted disponíveis são compartilhados com outros projetos. O ambiente precisa ser reproduzível em máquina limpa e idêntico entre execução local e CI.

## 2. Decisão

### 2.1 Arquitetura e padrão

Adotar **monólito REST em camadas**, Node.js 24 + TypeScript (ESM) + Express 5 + PostgreSQL 17 Alpine (sujeito a validação de compatibilidade). Dividir o código em rotas/controllers (HTTP), serviços de aplicação/domínio (regras), repositórios (interface e implementação SQL `pg`) e infraestrutura (banco, logs e configuração). Aplicar o **Repository Pattern**, com dependências dos serviços apontando para contratos de repositório, e injetar implementações nos pontos de composição, sem contêiner de injeção.

### 2.2 Concorrência e integridade

A criação de reservas será **transacional e atômica**: obter bloqueio de linha da saída (`SELECT ... FOR UPDATE`), validar que a saída é futura e que há capacidade, inserir reserva e atualizar ocupação dentro da mesma transação. Em erro, fazer rollback. Restrições de banco reforçam a invariante de capacidade. Utilizar migrations explícitas, controladas e restritas aos bancos de desenvolvimento e de teste da TourFlow.

### 2.3 Ambiente Docker-first

Node.js, npm, lint, typecheck, build, testes e k6 executam somente em containers; Git e Claude Code permanecem nativos no Windows. Um Dockerfile multi-stage (`base`, `deps`, `dev`, `build`, `runtime`) e um único `docker-compose.yml` definem os serviços `api` (imagem `runtime`, não-root), `dev` (ferramentas de qualidade), `db` (desenvolvimento, volume persistente), `db-test` (testes, tmpfs descartável) e `k6` (smoke). Bancos de desenvolvimento e de teste são instâncias separadas; o PostgreSQL não publica porta no host e a API publica apenas em `127.0.0.1`.

### 2.4 Operação e qualidade mínimas

CI no GitHub Actions em runner hospedado `ubuntu-latest`, executando build, lint, typecheck e testes pelo mesmo Docker Compose. Testes unitários dos serviços com repositório fake, testes de integração contra `db-test` e teste de concorrência. Observabilidade restrita a logs estruturados (Pino), uma métrica Prometheus e um SLO local verificado por k6. Não há integração com produção, deploy, autenticação ou serviços externos.

### 2.5 Justificativa

1. **Monólito em vez de microsserviços:** um único serviço e banco permitem entregar um fluxo completo no prazo, sem rede entre serviços nem consistência distribuída, e satisfazem o pattern justificado exigido em M1 sem criar infraestrutura do nível A.
2. **Repository Pattern em vez de SQL nas rotas:** controllers não conhecem SQL e serviços dependem de contratos claros; as regras ficam testáveis em unidade com repositório fake, e o controle de concorrência fica concentrado e revisável em um único ponto.
3. **Docker-first em vez de Node.js no host:** elimina a dependência da versão instalada no Windows, garante Node.js 24 idêntico em qualquer máquina e no CI, e torna o README reproduzível em clone limpo apenas com Docker e Git.
4. **PostgreSQL em vez de banco em memória:** transações e bloqueios de linha reais são o mecanismo que impede sobre-reserva; um banco em memória ou substituto não comprovaria esse comportamento, e o teste de integração precisa exercitar o mesmo motor usado na aplicação.
5. **Runner hospedado em vez de self-hosted:** o runner `ubuntu-latest` é efêmero e isolado, não interfere nos projetos que compartilham os runners existentes e não expõe a máquina local; com Docker Compose no job, o CI reproduz o ambiente local.

## 3. Alternativas consideradas

| Alternativa | Situação | Motivo |
| --- | --- | --- |
| A. SQL escrito diretamente nas rotas HTTP | Rejeitada | É mais rápido no primeiro endpoint, mas mistura transporte, negócio e persistência, dificulta testes unitários, reaproveitamento e revisão do controle de concorrência. |
| B. Microsserviços de catálogo e reservas | Rejeitada | Exigiria integrações, operação distribuída e tratamento de consistência sem benefício proporcional ao escopo do Projeto B. |
| C. ORM completo (Prisma/TypeORM) | Adiada | Pode acelerar modelagem, mas adiciona abstração e superfície de configuração. SQL explícito via `pg` deixa a transação e o bloqueio de vagas visíveis para a avaliação. Não se trata de rejeição universal de ORMs. |
| D. Atualizar contagem sem transação | Rejeitada | Pode causar confirmação acima da capacidade. A regra de integridade exige operação atômica com teste de concorrência. |
| E. Node.js e npm instalados no host Windows | Rejeitada | Exigiria atualizar e manter a versão local, com risco de divergência entre máquinas e CI e de binários nativos incompatíveis com o container. |
| F. Banco em memória ou SQLite nos testes | Rejeitada | Não reproduz o `SELECT ... FOR UPDATE` nem o comportamento transacional do PostgreSQL, tornando o teste de concorrência inconclusivo. |
| G. Runners self-hosted existentes | Rejeitada | São compartilhados com outros projetos: risco de interferência, de vazamento de estado entre jobs e de exposição da máquina, sem benefício para o escopo. |

## 4. Consequências

**Positivas:** menor carga operacional; fluxo de dados claro; SQL auditável; injeção de dependência; repositórios simuláveis em unidade; mecanismo de concorrência determinístico; ambiente idêntico entre máquinas e CI; host sem Node.js.

**Custos:** mais arquivos que uma API de rota única; SQL e migrations escritos manualmente; cuidado com fronteiras e ciclo de vida da transação; necessidade de integração real para comprovar consistência; dependência do Docker Desktop no Windows, com primeiro build mais lento, observação de arquivos por bind mount possivelmente limitada e volume de `node_modules` que precisa ser sincronizado de forma explícita quando o lockfile muda.

### Regras de implantação

- Controllers nunca executam SQL nem tomam decisões de disponibilidade.
- Serviços não dependem de objetos Express (`Request`/`Response`).
- Repositórios não retornam detalhes HTTP.
- A transação não deve atravessar chamadas externas e deve possuir timeout explícito. Definido na F1-T4: `lock_timeout` 1,5 s < `statement_timeout` 1,8 s < `query_timeout` do cliente 2 s, e `idle_in_transaction_session_timeout` 5 s (`src/repositories/pg/pg-reservation-repository.ts`).
- Instrumentação não altera o resultado de negócio: a métrica de reserva confirmada é notificada depois do `COMMIT`, e uma falha dela é absorvida.
- Logs registram somente campos explícitos (request ID, método, padrão da rota, status, duração e código de erro), nunca URL bruta, query, corpo, dados pessoais ou o objeto de erro.
- Uma implementação simples de repositório é suficiente; não criar abstrações genéricas por antecipação.
- Ambiente de teste usa banco próprio e isolado (`db-test`); proibir DDL contra sistemas existentes.
- Toda execução de Node.js ocorre em container; nenhum container instala dependências ao iniciar.
- Alterar esta decisão exige novo ADR ou atualização explícita aprovada.

## 5. Evidências no código

Estado verificado em 2026-11-11, na versão promovida para `main` em `f0237c8bb653cc1262bbd97b86d4f10d981b42d7`.

| Decisão | Onde está no código | Evidência |
| --- | --- | --- |
| Camadas e composição sem contêiner | `src/server.ts` é o único ponto de composição: cria pool, repositórios PostgreSQL, services, logger e métricas e os injeta em `createApp` (`src/app.ts`) | Controllers (`src/http/controllers/`) não importam `pg`; services (`src/services/`) não importam Express, `pg` nem `prom-client` |
| Repository Pattern | Contratos em `src/repositories/catalog-repository.ts` e `reservation-repository.ts`; implementações em `src/repositories/pg/` | Os mesmos services rodam com fakes nos unitários e com PostgreSQL na integração |
| Regra de domínio separada da persistência | `assertReservable` em `src/domain/reservation.ts`, passada ao repositório como `guard` | Unitários em `tests/unit/reservation.test.ts` |
| Transação com `FOR UPDATE` | `src/repositories/pg/pg-reservation-repository.ts`: `FOR UPDATE`, relógio lido depois do bloqueio, `INSERT`, `UPDATE`, `COMMIT`/`ROLLBACK` | Duas provas de concorrência em `tests/integration/reservations.test.ts` |
| Invariante no banco | `db/migrations/0001_initial_schema.sql`: `CHECK (reserved_seats >= 0)` e `departures_reserved_seats_within_capacity` | Migration aplicada no `db` e no `db-test` |
| Testes e cobertura | `tests/unit/` (122), `tests/integration/` (10); `vitest.config.ts` com 80% de linhas e branches em `src/domain` e `src/services` | 100% medido; CI verde |
| Observabilidade | `src/infra/logger.ts`, `src/http/middlewares/request-context.ts`, `src/infra/metrics.ts`, `src/http/routes/metrics.ts` | Linha JSON por requisição; `tourflow_reservations_confirmed_total` incrementa só depois do `COMMIT` |
| Contrato | `docs/openapi.yaml` (OpenAPI 3.1, rotas de reserva) | Validado por `@apidevtools/swagger-parser` em `tests/unit/openapi.test.ts` |
| Docker-first | `Dockerfile` multi-stage e `docker-compose.yml` com `api`, `dev`, `db`, `db-test` e `k6` | Clone limpo reproduzido apenas com Docker e Git (F4-T5) |
| CI hospedado | `.github/workflows/ci.yml`, `ubuntu-latest`, via Compose | [Run 43059539492](https://github.com/podilon/tourflow-api/actions/runs/43059539492) verde em `f0237c8` |
| SLO verificado por k6 | `performance/smoke.js`, serviço `k6` (profile `perf`) | p95 1,913 ms e SLO 100% (572/572) em [docs/desempenho.md](../desempenho.md) |

A tabela SOLID, com princípio, componente, evidência e limitação, está no [README](../../README.md#72-solid-no-código). OCP está registrado como não demonstrado.

## 6. Relação com a rubrica

Atende o requisito **M1: SOLID e um pattern justificado** e contribui para **M4: ADR com decisão arquitetural**. O ambiente Docker-first e o CI sustentam as evidências de **M2** e **M3**. Não pretende cumprir exigências exclusivas do Projeto A.

## Histórico de alterações

| Versão | Data | Tarefa | Alteração |
| --- | --- | --- | --- |
| 1.0 | 2026-11-08 | F0-T2 | Versão inicial do ADR. |
| 1.1 | 2026-11-08 | F0-T5 | Stack atualizada (ESM, Express 5, PostgreSQL 17 Alpine); verificação de saída futura sob bloqueio; decisões de ambiente Docker-first, separação `db`/`db-test`, acesso apenas local, CI em `ubuntu-latest` via Docker Compose, observabilidade e testes mínimos; justificativas reorganizadas por escolha; alternativas E, F e G; custos do Docker no Windows; regra de execução em container; evidências de Docker e CI. |
| 1.2 | 2026-11-11 | F3-T4 | Timeout da transação registrado (definido na F1-T4); regras de instrumentação pós-`COMMIT` e de campos de log; seção de evidências produzidas com caminhos do código, testes, observabilidade, OpenAPI e referência à tabela SOLID do README. Decisão arquitetural inalterada. |
| 1.3 | 2026-11-11 | F5 (revisão documental) | Status atualizado de "Proposto" para "Aceito", com vínculo ao registro do G0 (commit `d9b59b3` e cabeçalho do PRD). Estrutura reorganizada em contexto, decisão, alternativas (em tabela), consequências e evidências no código, estas atualizadas para o estado entregue (k6, clone limpo e CI em `main`). Texto das decisões, justificativas, alternativas e regras preservado. Decisão arquitetural inalterada. |
