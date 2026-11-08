# PRD — TourFlow API

> **Projeto Final Full Cycle — Nível B (simples)**
> Estado: **PROPOSTA PARA APROVAÇÃO** | Versão: 1.0 | Data: 2026-11-08
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
| RF-03 | Criar reserva (`POST /reservations`) | Payload válido para saída futura com vagas retorna 201, `id` e `status=CONFIRMED`; reserva persistida. |
| RF-04 | Consultar reserva (`GET /reservations/:id`) | Retorna 200 para ID existente; 404 para inexistente; payload documentado. |
| RF-05 | Impedir sobre-reserva | Se `participants > availableSeats`, retorna 409, sem alterar o banco. Sob duas requisições concorrentes, nunca confirma acima da capacidade. |
| RF-06 | Validar entradas | `participants` inteiro positivo, UUID válido, nome não vazio, e-mail válido; payload inválido retorna 400 consistente. |
| RF-07 | Healthcheck (`GET /health`) | Retorna 200 quando API e conexão ao banco estão disponíveis; em falha do banco, 503. |

### 3.2 Opcional, somente se tudo obrigatório estiver verde

- Cancelar reserva (`POST /reservations/:id/cancel`), liberar vagas exatamente uma vez e comprovar com testes; não iniciar antes do gate de conclusão do MVP.

### 3.3 Explicitamente fora do escopo

Painel web, login/autorização, pagamentos, notificações, integrações externas, emissão fiscal, roteirização, vouchers, multi-tenancy, mensageria, cache, microsserviços, deploy em produção, importação de dados reais e 100 mil pedidos (exigência apenas do Projeto A).

## 4. Modelo conceitual

- `experiences`: `id` (UUID), `name`, `description`, `duration_minutes`.
- `departures`: `id` (UUID), `experience_id` (FK), `starts_at` (TIMESTAMPTZ), `capacity` (inteiro > 0), `reserved_seats` (inteiro >= 0), `price_cents` (inteiro >= 0).
- `reservations`: `id` (UUID), `departure_id` (FK), `customer_name`, `customer_email`, `participants`, `status` (`CONFIRMED`), `created_at`.

**Invariante:** `0 <= reserved_seats <= capacity`; disponibilidades = `capacity - reserved_seats`. A criação de reserva e a atualização de `reserved_seats` devem ocorrer na **mesma transação** com `SELECT ... FOR UPDATE` na linha da saída, ou equivalente comprovadamente atômico. Inserir a reserva apenas após a checagem de vagas. Não persistir dados reais de turistas: seeds e testes usarão nomes/e-mails fictícios.

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

Resposta `201` mínima: `id`, `departureId`, `participants`, `status`, `createdAt`. Erros terão estrutura estável `{"error":{"code":"NO_AVAILABILITY","message":"..."}}`; nunca expor stack trace em respostas HTTP.

## 6. Requisitos não funcionais

| ID | Requisito | Critério de aceite / evidência |
| --- | --- | --- |
| RNF-01 | Ambiente reproduzível | `docker compose up --build -d` sobe API + PostgreSQL; README traz comandos para seed, teste e encerramento. |
| RNF-02 | Design | TypeScript, responsabilidades separadas; Repository Pattern justificado em ADR-0001. |
| RNF-03 | Testes | Unitários das regras de reserva e pelo menos 1 integração HTTP com PostgreSQL real isolado. |
| RNF-04 | Cobertura | **80% de linhas e branches** para arquivos de `src/domain` e `src/services` medidos pelo Vitest; limiar declarado e aplicado no comando de CI; excluir arquivos de bootstrap/configuração do limiar por escopo explícito. |
| RNF-05 | CI verde | GitHub Actions: checkout, setup Node, `npm ci`, lint, testes (unitários + integração), verificação de cobertura; banco de teste isolado no job. |
| RNF-06 | Configuração e sigilo | `.env.example` com placeholders, `.env` ignorado; sem segredos reais ou credenciais no histórico; banco de teste nunca usa banco externo. |
| RNF-07 | Observabilidade | Pino JSON com request ID, status e duração; não registrar corpo nem e-mail do cliente; métrica Prometheus `tourflow_reservations_confirmed_total`. |
| RNF-08 | SLO educacional | **99% das requisições de `GET /departures` com duração < 500 ms**, sob cenário local k6 documentado. Meta, janela de medição e limitações explícitas; não apresentar como SLO real de produção. |
| RNF-09 | Performance | Smoke test k6 com ao menos 1 VU por 30 s, medindo `http_req_duration` p95; `docs/desempenho.md` registra ambiente, script, comando, resultado real e interpretação. |
| RNF-10 | Documentação | `README.md`, `docs/adr/0001-arquitetura.md`, `docs/openapi.yaml` (OpenAPI 3.1, rota principal), `docs/desempenho.md`, `docs/ia.md`, `CONTRIBUTORS.md`. |
| RNF-11 | Integridade | Migrations versionadas idempotentes no fluxo controlado de ambiente local; nenhuma operação DDL destrutiva em bancos não pertencentes ao projeto. |
| RNF-12 | Segurança básica | Dependências fixadas por lockfile, usuário não-root no contêiner se viável, sem portas de DB publicadas fora do host local, tratamento consistente de erros. |

**Observação:** 80%, 500 ms, 1 VU/30 s são decisões internas deste projeto, **não** valores prescritos pelo professor.

## 7. Critérios de aceite de ponta a ponta (E2E)

1. Clonar repositório em ambiente limpo e configurar `.env` conforme README.
2. Executar `docker compose up --build -d`; serviços ficam saudáveis.
3. Aplicar migrations e seed com comando documentado e não destrutivo.
4. `GET /departures` devolve ao menos uma saída futura e vagas disponíveis.
5. `POST /reservations` com 2 vagas disponíveis confirma reserva e diminui vagas em 2.
6. `GET /reservations/:id` devolve a mesma reserva persistida.
7. Solicitação maior que vagas retorna `409`; ocupação permanece estável.
8. Teste concorrente confirma que a capacidade não é ultrapassada.
9. `npm test`/comandos do README passam em banco de teste isolado; CI está verde.
10. Smoke k6 executado e evidenciado com p95 **medido**, mesmo se a meta proposta não for alcançada (nesse caso registrar falha e análise).

## 8. Rastreabilidade com a rubrica

| Critério oficial | Peso | Evidência prevista |
| --- | ---: | --- |
| M1 — funcionamento, código e design | 35 | API E2E, Compose, princípios SOLID, Repository Pattern + ADR |
| M2 — testes e CI | 20 | Unitários, integração, coverage com limiar, workflow verde |
| M3 — configuração, segredos e observabilidade | 15 | `.env.example`, `.gitignore`, logs Pino, métrica e SLO |
| M4 — arquitetura, documentos e desempenho | 30 | README, ADR, OpenAPI, smoke k6, relatório com p95 medido |

Entrega via Moodle até **13/11/2026**: link do GitHub (ou convite), README, link de execução verde do CI, `docs/desempenho.md`, `CONTRIBUTORS.md`. IA permitida, mas seus prompts importantes precisam estar em `docs/ia.md`. Commits após 13/11 não serão avaliados. Apresentação opcional em 16/11 (vídeo, se escolhido, enviado até 13/11).

## 9. Riscos e reduções

| Risco | Mitigação |
| --- | --- |
| Escopo exceder prazo | Congelar MVP; cancelar requisito opcional. |
| Teste passar sem persistência real | Exigir integração com PostgreSQL de teste e asserções no banco. |
| Corrida de reservas | Bloqueio transacional e teste de concorrência. |
| CI falhar por dependência de ambiente local | Workflow com serviço PostgreSQL próprio e comandos reprodutíveis. |
| Métrica ou p95 inventados | Incluir evidência gerada por comando real e marcar pendente até executar. |
| IA alterar arquivos fora da tarefa | Plano aprovado, diff revisado, branches e permissões restritas. |

## 10. Decisões e perguntas ainda abertas

- **Fixadas nesta proposta:** nível B, repositório novo, turismo, monólito em camadas, Node.js 24 + TypeScript + Express + PostgreSQL, sem pagamento/auth.
- **A validar na Fase 1:** ambiente disponível para executar Docker e k6; nome/visibilidade do repositório; nome(s) em `CONTRIBUTORS.md`.
- **Gate de aprovação:** nenhuma implementação antes da aprovação explícita da Fase 0.
