# ROADMAP — TourFlow API | Projeto Final Full Cycle B

> Versão: 1.0 | Data: 2026-11-08 | Estado: **proposto, sem execução de código**
> Entrega oficial: **sexta-feira, 13/11/2026, pelo Moodle**. Apresentação opcional: **16/11/2026**.

## 1. Política de execução

- Fases em sequência, com tarefas pequenas, aprovação antes das mudanças e evidências reais.
- No início de toda tarefa: inspecionar `git status`, propor arquivos/comandos/testes/rollback; aguardar aprovação.
- Ao encerrar: apresentar diff, saída dos testes, riscos e atualizar rastreabilidade.
- Não usar branch, deploy, banco ou segredos de projetos preexistentes.
- Toda tarefa tem critérios de aceite binários e um **gate**; sem gate, não avançar.
- A fila de implementação começa **somente depois da aprovação explícita dos documentos da Fase 0**.

## 2. Sequência planejada

### F0 — Planejamento e aprovação (08/11) — status: DOCUMENTADO, AGUARDA APROVAÇÃO

| ID | Entrega | Critérios de aceite |
| --- | --- | --- |
| F0-T1 | `PRD.md` | Escopo, RF/RNF, regras, E2E, rubrica, riscos definidos. |
| F0-T2 | `docs/adr/0001-arquitetura.md` | Decisão, alternativas rejeitadas, consequências e evidências. |
| F0-T3 | `CLAUDE.md` | Permissões, gates, protocolo Plan→Approve→Execute→Verify e bloqueios. |
| F0-T4 | `ROADMAP.md` | Ordem, dependências, datas, critérios de aceite e contingência. |

**Gate G0:** responsável revisou e aprovou os quatro arquivos; escopo congelado; Claude Code autorizado a planejar F1-T1, **não a executar automaticamente**.

### F1 — Fundação, persistência e fluxo E2E (09/11)

| ID | Entrega | Critérios de aceite | Dependência |
| --- | --- | --- | --- |
| F1-T1 | Bootstrap e estrutura | TS/Express compila; scripts do `package.json`; ESLint; `.env.example`, `.gitignore`, README inicial. | G0 |
| F1-T2 | Banco e migrations | PostgreSQL local em Compose; tabelas e constraints; migrations/seed reproduzíveis com dados sintéticos; healthcheck. | F1-T1 |
| F1-T3 | Consultas | `GET /experiences` e `GET /departures` retornam registros do banco. | F1-T2 |
| F1-T4 | Reservas | `POST /reservations` transacional e `GET /reservations/:id`; validação e erros 400/404/409; concorrência protegida. | F1-T3 |
| F1-T5 | E2E manual documentado | Compose com um comando e fluxo listar→reservar→consultar reproduzível por curl. | F1-T4 |

**Gate G1:** ambiente inicia do zero, seed e migrations executam no **banco do projeto**, fluxo confirmado em PostgreSQL, não há sobre-reserva comprovada manualmente; saída de comandos e diffs anexados ao relatório de tarefa.

### F2 — Testes e CI (10/11)

| ID | Entrega | Critérios de aceite | Dependência |
| --- | --- | --- | --- |
| F2-T1 | Testes unitários | Regras de participantes válidos, capacidade, inexistência e erro de domínio testadas com asserções. | G1 |
| F2-T2 | Teste de integração | API real + PostgreSQL de teste isolado; caso feliz, consulta persistida, 409 e cenário concorrente. | F2-T1 |
| F2-T3 | Coverage | Vitest com limiar >=80% de linhas **e branches** nos arquivos de regras; comando falha se abaixo. | F2-T2 |
| F2-T4 | GitHub Actions | `npm ci`, lint, unitários, integração com PostgreSQL service e coverage; run verde com link. | F2-T3 |

**Gate G2:** pipeline finaliza verde; saídas e cobertura reais disponíveis; isolamento da base de teste comprovado.

### F3 — Observabilidade e contrato (11/11)

| ID | Entrega | Critérios de aceite | Dependência |
| --- | --- | --- | --- |
| F3-T1 | Logs | Pino JSON com request ID, código de resposta e duração; teste manual; nenhum e-mail em logs. | G2 |
| F3-T2 | Métrica e SLO | `tourflow_reservations_confirmed_total` exposta em `/metrics`; meta local 99% <500ms para `GET /departures` documentada com contexto. | F3-T1 |
| F3-T3 | OpenAPI 3.1 | `docs/openapi.yaml` com POST `/reservations`, respostas 201/400/404/409, schemas e exemplos válidos. | F3-T2 |
| F3-T4 | ADR e README | ADR coerente com implementação; README contém nível na **primeira linha**, requisitos, subir/testar e limitações. | F3-T3 |

**Gate G3:** logs/métrica inspecionáveis, contrato coerente com API executada, documentação permite reprodução, CI segue verde.

### F4 — Smoke k6 e homologação (12/11)

| ID | Entrega | Critérios de aceite | Dependência |
| --- | --- | --- | --- |
| F4-T1 | Smoke k6 | `performance/smoke.js`: cenário controlado 1 VU por 30s em GET `/departures`; threshold p95 <500ms, sem assumir sucesso. | G3 |
| F4-T2 | Resultado real | `docs/desempenho.md`: data, hardware/ambiente, script, comando, duração, VUs, amostra, p95 real, falhas, conclusão e limites. | F4-T1 |
| F4-T3 | Revisão de segurança | Sem segredos, `.env.example`, portas locais, lockfile, permissões, dependências; comandos revisados. | F4-T2 |
| F4-T4 | Revisão documental | `docs/ia.md` com prompts relevantes e revisão; `CONTRIBUTORS.md` com autoria e contribuições; README final. | F4-T3 |
| F4-T5 | Ensaio de clone limpo | Reproduzir exatamente comandos do README; CI verde; conferir todos os artefatos. | F4-T4 |

**Gate G4:** p95 real registrado (resultado positivo ou negativo, sem fabricação), checklist da rubrica completo e evidências acessíveis; fluxo em clone limpo funciona.

### F5 — Congelamento e entrega (13/11)

| ID | Entrega | Critérios de aceite | Dependência |
| --- | --- | --- | --- |
| F5-T1 | Revisar mudança final | `git status` limpo, SHA do commit, revisão de segredos e arquivos de entrega. | G4 |
| F5-T2 | Validar CI final | URL e SHA da última execução verde correspondem ao commit entregue. | F5-T1 |
| F5-T3 | Submissão pelo Moodle | URL repositório/convite, README, CI verde, `docs/desempenho.md`, `CONTRIBUTORS.md`; confirmação de envio. | F5-T2 |

**Gate G5:** evidência de submissão antes do prazo. Commits posteriores a 13/11 não serão avaliados. Não declarar 'entregue' sem confirmação humana do Moodle.

### F6 — Apresentação opcional (16/11)

Roteiro: 1 min problema/nível; 3 min demo Compose/API; 3 min ADR/alternativa descartada; 3 min p95 e aprendizados. Caso vídeo, enviar **até 13/11**.

## 3. Matriz de rastreabilidade da rubrica

| Exigência B | Peso | Tarefas | Evidência |
| --- | ---: | --- | --- |
| M1 Compose + SOLID + pattern | 35 | F1, F3-T4 | `docker-compose.yml`, código e ADR |
| M2 unitário + integração + cobertura | 20 | F2-T1..T3 | testes e relatório de coverage |
| M3 CI install/lint/test | 15 (M3 total) | F2-T4 | URL de run verde |
| M3 `.env.example` / segredos |  | F1-T1, F4-T3 | repositório limpo de segredos |
| M3 logs + métrica + SLO |  | F3-T1..T2 | stdout JSON, `/metrics`, README |
| M4 README + ADR + OpenAPI | 30 | F3-T3..T4 | arquivos versionados |
| M4 k6 smoke + p95 |  | F4-T1..T2 | script e `docs/desempenho.md` |
| Entrega e uso de IA | — | F4-T4, F5 | `CONTRIBUTORS.md`, `docs/ia.md`, Moodle |

**Nota:** pesos de M3/M4 são por módulo e não por linha. A pontuação individual depende da avaliação docente.

## 4. Evidências e checkpoints

Para cada gate, registrar em relatório curto: data, commit/branch, comandos e exit codes, cobertura quando aplicável, evidência de HTTP, resultado observado, decisão humana e pendências. Nunca escrever `PASSOU` sem ter executado a checagem correspondente. Não inventar link de CI, percentual de cobertura ou p95.

## 5. Contingência por prioridade

1. **Não cortar:** reservas com consistência, PostgreSQL/Compose, testes de domínio+integração, coverage mínimo, CI, `.env.example`, logs, uma métrica, SLO, ADR, OpenAPI, k6/p95, README e documentos de entrega.
2. **Pode simplificar:** campos do catálogo, formatação de logs, seed, estrutura de pastas e variedade de cenários de carga, sem perder o requisito mínimo.
3. **Cortar primeiro:** cancelamento, filtros extras, dashboard, deploy externo, qualquer funcionalidade adicional.
4. **Se p95 não atingir meta:** registrar a medição verdadeira, analisar gargalo e limitação; não falsificar nem esconder resultado.

## 6. Prompt de entrada para a Fase 1 (planejamento apenas)

```text
Você está no repositório TourFlow API, Projeto Final Full Cycle — Nível B.
Leia integralmente PRD.md, CLAUDE.md, ROADMAP.md e docs/adr/0001-arquitetura.md.
Verifique git status e inspecione apenas os arquivos existentes.
Estamos na tarefa F1-T1, mas ainda NÃO há autorização para modificar arquivos,
instalar dependências, executar migrations, criar commits ou acessar serviços remotos.
Entregue: diagnóstico inicial, plano mínimo para F1-T1, caminhos que pretende criar,
comandos planejados, testes, riscos, critérios de aceite e rollback.
Pare e solicite aprovação explícita para executar F1-T1.
```
