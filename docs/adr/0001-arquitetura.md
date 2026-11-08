# ADR-0001 — Monólito em camadas com Repository Pattern e PostgreSQL

- **Status:** Proposto (pendente de aprovação para implementação)
- **Data:** 2026-11-08
- **Decisores:** responsável pelo projeto, com apoio consultivo de IA
- **Escopo:** Projeto Final Full Cycle — Nível B / TourFlow API

## Contexto

O projeto precisa comprovar um fluxo de reservas turísticas ponta a ponta em prazo curto. A criação deve garantir integridade transacional e impedir sobre-reservas sob concorrência. A rubrica exige funcionamento, SOLID, um pattern justificado, testes, operação básica e documentação; não exige microsserviços nem grande volume de dados no nível B.

## Decisão

Adotar **monólito REST em camadas**, Node.js 24 + TypeScript + Express + PostgreSQL. Dividir o código em rotas/controllers (HTTP), serviços de aplicação/domínio (regras), repositórios (interface e implementação SQL `pg`) e infraestrutura (banco, logs e configuração). Aplicar o **Repository Pattern**, com dependências dos serviços apontando para contratos de repositório, e injetar implementações nos pontos de composição.

A criação de reservas será **transacional e atômica**: obter bloqueio de linha da saída (`SELECT ... FOR UPDATE`), validar capacidade, inserir reserva e atualizar ocupação dentro da mesma transação. Em erro, fazer rollback. Restrições de banco reforçam a invariante de capacidade. Utilizar migrations explícitas, controladas e restritas ao banco de desenvolvimento/teste da TourFlow.

## Justificativa

1. **Prazo e simplicidade:** um único serviço e banco permitem entregar um fluxo completo antes de adicionar recursos.
2. **Testabilidade:** regras isoladas nos serviços facilitam testes unitários; PostgreSQL de teste permite validar transações e integração.
3. **Manutenibilidade:** controllers não conhecem SQL; serviços dependem de contratos claros.
4. **Integridade:** PostgreSQL oferece transações e bloqueios adequados à disponibilidade de vagas.
5. **Aderência:** satisfaz o pattern justificado exigido em M1 sem criar infraestrutura do nível A.

## Alternativas consideradas

### A. SQL escrito diretamente nas rotas HTTP — rejeitada

É mais rápido no primeiro endpoint, mas mistura transporte, negócio e persistência, dificulta testes unitários, reaproveitamento e revisão do controle de concorrência.

### B. Microsserviços de catálogo e reservas — rejeitada

Exigiria integrações, operação distribuída e tratamento de consistência sem benefício proporcional ao escopo do Projeto B.

### C. ORM completo (Prisma/TypeORM) — adiada

Pode acelerar modelagem, mas adiciona abstração e superfície de configuração. SQL explícito via `pg` deixa a transação e o bloqueio de vagas visíveis para a avaliação. Não se trata de rejeição universal de ORMs.

### D. Atualizar contagem sem transação — rejeitada

Pode causar confirmação acima da capacidade. A regra de integridade exige operação atômica com teste de concorrência.

## Consequências

**Positivas:** menor carga operacional; fluxo de dados claro; SQL auditável; injeção de dependência; repositórios simuláveis em unidade; mecanismo de concorrência determinístico.

**Custos:** mais arquivos que uma API de rota única; SQL e migrations escritos manualmente; cuidado com fronteiras e ciclo de vida da transação; necessidade de integração real para comprovar consistência.

## Regras de implantação

- Controllers nunca executam SQL nem tomam decisões de disponibilidade.
- Serviços não dependem de objetos Express (`Request`/`Response`).
- Repositórios não retornam detalhes HTTP.
- A transação não deve atravessar chamadas externas e deve possuir timeout apropriado.
- Uma implementação simples de repositório é suficiente; não criar abstrações genéricas por antecipação.
- Ambiente de teste usa banco próprio, isolado; proibir DDL contra sistemas existentes.
- Alterar esta decisão exige novo ADR ou atualização explícita aprovada.

## Evidências a produzir

- Código das camadas e injeção de dependências.
- Teste unitário do serviço usando repositório fake.
- Teste de integração com PostgreSQL e duas solicitações concorrentes.
- README com explicação curta do padrão e link para este ADR.

## Relação com a rubrica

Atende o requisito **M1: SOLID e um pattern justificado** e contribui para **M4: ADR com decisão arquitetural**. Não pretende cumprir exigências exclusivas do Projeto A.
