# ADR-0001 — Monólito em camadas com Repository Pattern e PostgreSQL

- **Status:** Proposto (pendente de aprovação para implementação)
- **Versão:** 1.1
- **Data:** 2026-11-08
- **Decisores:** responsável pelo projeto, com apoio consultivo de IA
- **Escopo:** Projeto Final Full Cycle — Nível B / TourFlow API

## Contexto

O projeto precisa comprovar um fluxo de reservas turísticas ponta a ponta em prazo curto. A criação deve garantir integridade transacional e impedir sobre-reservas sob concorrência. A rubrica exige funcionamento, SOLID, um pattern justificado, testes, operação básica e documentação; não exige microsserviços nem grande volume de dados no nível B.

O desenvolvimento ocorre em Windows sem Node.js adequado instalado (a máquina tem versão diferente da exigida), e os runners self-hosted disponíveis são compartilhados com outros projetos. O ambiente precisa ser reproduzível em máquina limpa e idêntico entre execução local e CI.

## Decisão

Adotar **monólito REST em camadas**, Node.js 24 + TypeScript (ESM) + Express 5 + PostgreSQL 17 Alpine (sujeito a validação de compatibilidade). Dividir o código em rotas/controllers (HTTP), serviços de aplicação/domínio (regras), repositórios (interface e implementação SQL `pg`) e infraestrutura (banco, logs e configuração). Aplicar o **Repository Pattern**, com dependências dos serviços apontando para contratos de repositório, e injetar implementações nos pontos de composição, sem contêiner de injeção.

A criação de reservas será **transacional e atômica**: obter bloqueio de linha da saída (`SELECT ... FOR UPDATE`), validar que a saída é futura e que há capacidade, inserir reserva e atualizar ocupação dentro da mesma transação. Em erro, fazer rollback. Restrições de banco reforçam a invariante de capacidade. Utilizar migrations explícitas, controladas e restritas aos bancos de desenvolvimento e de teste da TourFlow.

**Ambiente Docker-first.** Node.js, npm, lint, typecheck, build, testes e k6 executam somente em containers; Git e Claude Code permanecem nativos no Windows. Um Dockerfile multi-stage (`base`, `deps`, `dev`, `build`, `runtime`) e um único `docker-compose.yml` definem os serviços `api` (imagem `runtime`, não-root), `dev` (ferramentas de qualidade), `db` (desenvolvimento, volume persistente), `db-test` (testes, tmpfs descartável) e `k6` (smoke). Bancos de desenvolvimento e de teste são instâncias separadas; o PostgreSQL não publica porta no host e a API publica apenas em `127.0.0.1`.

**Operação e qualidade mínimas.** CI no GitHub Actions em runner hospedado `ubuntu-latest`, executando build, lint, typecheck e testes pelo mesmo Docker Compose. Testes unitários dos serviços com repositório fake, testes de integração contra `db-test` e teste de concorrência. Observabilidade restrita a logs estruturados (Pino), uma métrica Prometheus e um SLO local verificado por k6. Não há integração com produção, deploy, autenticação ou serviços externos.

## Justificativa

1. **Monólito em vez de microsserviços:** um único serviço e banco permitem entregar um fluxo completo no prazo, sem rede entre serviços nem consistência distribuída, e satisfazem o pattern justificado exigido em M1 sem criar infraestrutura do nível A.
2. **Repository Pattern em vez de SQL nas rotas:** controllers não conhecem SQL e serviços dependem de contratos claros; as regras ficam testáveis em unidade com repositório fake, e o controle de concorrência fica concentrado e revisável em um único ponto.
3. **Docker-first em vez de Node.js no host:** elimina a dependência da versão instalada no Windows, garante Node.js 24 idêntico em qualquer máquina e no CI, e torna o README reproduzível em clone limpo apenas com Docker e Git.
4. **PostgreSQL em vez de banco em memória:** transações e bloqueios de linha reais são o mecanismo que impede sobre-reserva; um banco em memória ou substituto não comprovaria esse comportamento, e o teste de integração precisa exercitar o mesmo motor usado na aplicação.
5. **Runner hospedado em vez de self-hosted:** o runner `ubuntu-latest` é efêmero e isolado, não interfere nos projetos que compartilham os runners existentes e não expõe a máquina local; com Docker Compose no job, o CI reproduz o ambiente local.

## Alternativas consideradas

### A. SQL escrito diretamente nas rotas HTTP — rejeitada

É mais rápido no primeiro endpoint, mas mistura transporte, negócio e persistência, dificulta testes unitários, reaproveitamento e revisão do controle de concorrência.

### B. Microsserviços de catálogo e reservas — rejeitada

Exigiria integrações, operação distribuída e tratamento de consistência sem benefício proporcional ao escopo do Projeto B.

### C. ORM completo (Prisma/TypeORM) — adiada

Pode acelerar modelagem, mas adiciona abstração e superfície de configuração. SQL explícito via `pg` deixa a transação e o bloqueio de vagas visíveis para a avaliação. Não se trata de rejeição universal de ORMs.

### D. Atualizar contagem sem transação — rejeitada

Pode causar confirmação acima da capacidade. A regra de integridade exige operação atômica com teste de concorrência.

### E. Node.js e npm instalados no host Windows — rejeitada

Exigiria atualizar e manter a versão local, com risco de divergência entre máquinas e CI e de binários nativos incompatíveis com o container.

### F. Banco em memória ou SQLite nos testes — rejeitada

Não reproduz o `SELECT ... FOR UPDATE` nem o comportamento transacional do PostgreSQL, tornando o teste de concorrência inconclusivo.

### G. Runners self-hosted existentes — rejeitada

São compartilhados com outros projetos: risco de interferência, de vazamento de estado entre jobs e de exposição da máquina, sem benefício para o escopo.

## Consequências

**Positivas:** menor carga operacional; fluxo de dados claro; SQL auditável; injeção de dependência; repositórios simuláveis em unidade; mecanismo de concorrência determinístico; ambiente idêntico entre máquinas e CI; host sem Node.js.

**Custos:** mais arquivos que uma API de rota única; SQL e migrations escritos manualmente; cuidado com fronteiras e ciclo de vida da transação; necessidade de integração real para comprovar consistência; dependência do Docker Desktop no Windows, com primeiro build mais lento, observação de arquivos por bind mount possivelmente limitada e volume de `node_modules` que precisa ser sincronizado de forma explícita quando o lockfile muda.

## Regras de implantação

- Controllers nunca executam SQL nem tomam decisões de disponibilidade.
- Serviços não dependem de objetos Express (`Request`/`Response`).
- Repositórios não retornam detalhes HTTP.
- A transação não deve atravessar chamadas externas e deve possuir timeout explícito; o valor e sua justificativa são decisão técnica pendente, a definir na F1-T4.
- Uma implementação simples de repositório é suficiente; não criar abstrações genéricas por antecipação.
- Ambiente de teste usa banco próprio e isolado (`db-test`); proibir DDL contra sistemas existentes.
- Toda execução de Node.js ocorre em container; nenhum container instala dependências ao iniciar.
- Alterar esta decisão exige novo ADR ou atualização explícita aprovada.

## Evidências a produzir

- Código das camadas e injeção de dependências.
- Teste unitário do serviço usando repositório fake.
- Teste de integração com PostgreSQL e duas solicitações concorrentes.
- `Dockerfile` e `docker-compose.yml` executáveis com os serviços descritos.
- Execução verde do CI em `ubuntu-latest`.
- README com explicação curta do padrão e link para este ADR.

## Relação com a rubrica

Atende o requisito **M1: SOLID e um pattern justificado** e contribui para **M4: ADR com decisão arquitetural**. O ambiente Docker-first e o CI sustentam as evidências de **M2** e **M3**. Não pretende cumprir exigências exclusivas do Projeto A.

## Histórico de alterações

| Versão | Data | Tarefa | Alteração |
| --- | --- | --- | --- |
| 1.0 | 2026-11-08 | F0-T2 | Versão inicial do ADR. |
| 1.1 | 2026-11-08 | F0-T5 | Stack atualizada (ESM, Express 5, PostgreSQL 17 Alpine); verificação de saída futura sob bloqueio; decisões de ambiente Docker-first, separação `db`/`db-test`, acesso apenas local, CI em `ubuntu-latest` via Docker Compose, observabilidade e testes mínimos; justificativas reorganizadas por escolha; alternativas E, F e G; custos do Docker no Windows; regra de execução em container; evidências de Docker e CI. |
