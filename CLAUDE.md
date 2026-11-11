# CLAUDE.md — Constituição de engenharia e governança do TourFlow API

> **PROJETO B — Full Cycle.** Documento de instruções para Claude Code. Versão 1.1, 2026-11-08.
>
> **Estado atual: FASE 0 concluída — Gate G0 aprovado em 2026-11-08. Próxima tarefa: F1-T0, autorizável somente mediante planejamento e aprovação específicos. Implementação da aplicação não autorizada.**

## 1. Missão e prioridade

Construir, **após autorização**, uma API REST pequena de reservas turísticas, com persistência e prevenção de sobre-reservas, para demonstrar os requisitos do Projeto B. Entregar engenharia verificável, não tamanho.

Hierarquia de decisão: (1) instruções explícitas mais recentes do responsável e limitações de segurança; (2) rubrica oficial; (3) PRD e ADR aprovados; (4) este arquivo; (5) backlog/roadmap. Havendo conflito, **parar e solicitar decisão**; não reinterpretar silenciosamente o escopo.

## 2. Fonte única de verdade

- `PRD.md`: o que construir e critérios de aceite.
- `docs/adr/0001-arquitetura.md`: arquitetura e alternativas rejeitadas.
- `ROADMAP.md`: fases, ordem e gates.
- `docs/ia.md`: transparência do uso de IA, prompts relevantes e revisões (criar na fase autorizada).
- `docs/governanca.md`: regras deste arquivo × controles técnicos efetivamente aplicados (criar na F1-T0).
- Material oficial: https://henriquelopeslima.github.io/diglass/aulas/24-projeto-final.html

A documentação da Fase 0 é **proposta** até aprovação explícita. Não presumir arquivos ainda inexistentes no repositório.

## 3. Stack e princípios

- Aplicação: Node.js 24 LTS; TypeScript (ESM); Express 5; Zod; PostgreSQL 17 Alpine (sujeito a validação de compatibilidade) com `pg`.
- Qualidade e operação: Vitest + Supertest; ESLint; GitHub Actions; Pino (JSON e request ID); prom-client; OpenAPI 3.1; k6.
- **Ambiente Docker-first:** Node.js, npm, TypeScript, ESLint, Vitest, build e k6 executam somente em containers, definidos por um Dockerfile multi-stage (`base`, `deps`, `dev`, `build`, `runtime`) e um único `docker-compose.yml`. Git e Claude Code executam nativamente no Windows; não exigir Node.js no host.
- Monólito em camadas, repositório por contrato, injeção de dependência simples.
- Simplicidade/YAGNI, baixo acoplamento, funções pequenas, falhas explícitas, sem generalizações especulativas.
- Lockfile, versões e comandos devem ser gerados e comprovados durante a implementação, nunca inventados na documentação. O `package-lock.json` inicial é gerado uma única vez por container temporário Node 24; o Dockerfile apenas executa `npm ci`.

## 4. Limites rígidos de escopo

**Permitido após autorização:** catálogo somente leitura, saídas, criar/consultar reservas, saúde, logs, métrica, testes, CI, documentação, smoke k6.

**Proibido sem nova aprovação:** autenticação, pagamento, painel web, multi-tenant, filas, cache, microserviços, cloud, VPS, deploy ou Docker de produção, telemetria externa, serviços de terceiros, inclusão de dados reais, refatoração não relacionada, upgrade amplo de dependências, cancelamento de reserva (opcional).

## 5. Política de autonomia

### Operações de leitura e planejamento

Pode inspecionar arquivos e `git status`, sugerir comandos, revisar diffs e elaborar plano **sem alterar arquivos** enquanto a Fase 0 não tiver sido aprovada.

### Depois da autorização da fase/tarefa

Pode editar somente os caminhos aprovados e executar comandos locais de baixo risco (lint, typecheck, testes e build via `docker compose run --rm dev ...`). Antes de instalar dependências, baixar imagens ou construir contêineres, explicar comandos, efeitos e alterações esperadas e obter aprovação da tarefa apropriada.

### Exigem aprovação explícita, mesmo com tarefa aprovada

**Exceção aprovada para a publicação da F1-T1 (11/11/2026):** na branch
`feat/f1-t1-docker-foundation`, o responsável delegou ao Claude Code o stage
dos caminhos aprovados, commit, push da branch, criação e acompanhamento do
PR, e merge pelo GitHub somente após CI verde para o SHA atual e cumprimento
das proteções da `main`. A exceção se aplica aos comandos Bash enumerados
em `.claude/settings.json` e prevalece sobre as restrições gerais de Git
deste arquivo e do executor para essa entrega. Ver `docs/governanca.md` §11.
Push direto em `main`, force push, merge administrativo e deploy permanecem
fora do escopo. O CI desta publicação usa `ubuntu-latest`.

**Higienização pós-merge delegada:** para branches enumeradas na política do
projeto, o Claude Code pode atualizar a `main` por fast-forward e remover
branches mescladas conforme as verificações em `docs/governanca.md` §12.
A publicação dessa política ocorre em `chore/automate-post-merge` e segue
as proteções do GitHub e o CI hospedado.

**Cerimônia do curso (Moodle):** `main` e `develop` são permanentes.
Após o bootstrap da `develop`, branches de tarefa partem dela e voltam
para ela por PR. Entregas são promovidas de `develop` para `main` por PR.
O Claude Code pode executar os comandos enumerados para o bootstrap e
para o PR `chore/moodle-develop-ci`, conforme `docs/governanca.md` §13.

- Alteração de PRD/ADR/escopo ou mudança de tecnologia.
- Instalação de dependência nova não prevista na tarefa.
- Qualquer migration de alteração estrutural, especialmente destrutiva; executar apenas no banco da TourFlow com alvo verificado.
- Execução de comando destrutivo (`rm -rf`, `docker compose down -v`, `docker volume rm`, `docker system prune`, `git reset --hard`, `git clean -fd`, `DROP`, `TRUNCATE` etc.).
- `git commit`, `git push`, merge, rebase, tag, PR e operações remotas.
- Acesso à rede fora de downloads especificamente aprovados; uso de serviços pagos.
- Modificação de arquivos fora do escopo da tarefa.

**Jamais:** consultar ou modificar banco de produção, usar segredos reais, publicar dados pessoais, desabilitar testes para passar CI, fabricar resultados de coverage/k6, executar comandos destrutivos para “consertar” ambiente sem análise, usar runners self-hosted (compartilhados com outros projetos). Não copiar credenciais para logs, prompts ou commits.

**Importante:** estas instruções são normativas e **não substituem os controles técnicos de permissões** do Claude Code, GitHub e Docker. A tarefa F1-T0 configura allow/ask/deny em `.claude/settings.json` antes de qualquer implementação; `docs/governanca.md` indica quais regras são aplicadas tecnicamente e quais permanecem apenas documentais. A validação das permissões não executa operações remotas. Não usar `--dangerously-skip-permissions`.

## 6. Protocolo obrigatório por tarefa (Plan → Approve → Execute → Verify)

1. **Inspect:** informar branch, `git status`, arquivos relevantes, estado conhecido, impedimentos.
2. **Plan:** apresentar objetivo/critério de aceite, arquivos a criar/alterar, comandos a executar, riscos, validação e rollback. Não editar nesta etapa.
3. **Approval:** aguardar aprovação explícita do responsável para **uma tarefa delimitada**.
4. **Execute:** fazer alterações mínimas e rastreáveis; preferir commits pequenos, mas nunca commitar sem aprovação específica.
5. **Verify:** executar testes/lint/build correspondentes; apresentar saídas resumidas, status de exit code e diffs. Testes não executados devem ser marcados **NÃO EXECUTADOS**.
6. **Report:** listar realizado, decisões, desvios, riscos, evidências, próximo passo e ação que aguarda aprovação.

Formato do relatório:

```text
TAREFA: [ID]
STATUS: CONCLUÍDA | PARCIAL | BLOQUEADA
ALTERAÇÕES: [arquivos e motivo]
COMANDOS EXECUTADOS: [com exit codes]
TESTES: [passou/falhou/não executado]
CRITÉRIOS DE ACEITE: [checklist com evidências]
DIFF / RISCO: [resumo]
PRÓXIMA AÇÃO: [proposta aguardando aprovação]
```

## 7. Gates de qualidade

- Não declarar fase pronta sem código executável e todos os critérios da fase verificados.
- Lint, typecheck, build e testes executam via Docker Compose e precisam passar; testes devem conter asserções relevantes.
- Coverage **mínimo 80% de linhas e branches** em `src/domain/**/*.ts` e `src/services/**/*.ts`, aferido em CI.
- Teste de integração precisa atingir PostgreSQL real e isolado (`db-test`, nunca banco de produção).
- Concorrência deve ser testada: confirmações não podem exceder capacidade.
- CI no GitHub Actions em runner hospedado `ubuntu-latest`, executando as mesmas verificações via Docker Compose; run verde com link verificável.
- Documentar OpenAPI de criação de reserva; README executável em máquina limpa.
- `docker compose up --build -d` deve subir a aplicação e o banco com um comando; migrations/seed podem ter passo explícito documentado.
- SLO (meta local): ≥ 99% das requisições de `GET /departures` com status 200 e duração < 500 ms, verificado pela métrica k6 `slo_departures_ok` (threshold `rate>=0.99`) em amostra de no mínimo 200 requisições; abaixo disso, o resultado é **inconclusivo**.
- p95 do smoke k6 medido separadamente, com threshold próprio. SLO e p95 devem ser **medidos e registrados**, não estimados.

## 8. Padrões de segurança e dados

- Banco de desenvolvimento (`db`, volume persistente `tourflow_pgdata`) e banco de teste (`db-test`, tmpfs descartável) em instâncias e nomes separados; sem porta publicada no host; não reutilizar URI externa desconhecida. Não usar `docker compose down -v` no fluxo normal (apagaria `tourflow_pgdata`); dependências são reiniciadas apenas pelo volume `tourflow_dev_node_modules`.
- `.env` ignorado; `.env.example` apenas placeholders. Nunca imprimir segredos.
- Seeds de duas experiências e saídas futuras com dados sintéticos: IDs, nomes e capacidades fixos, datas relativas a `now()` e execução idempotente; não usar dados reais.
- Logs estruturados: request ID, rota, método, status, duração e classificação do erro, sem body nem e-mail.
- API de demonstração sem auth não deve ser exposta publicamente; portas do Compose publicadas somente em `127.0.0.1`.
- Evitar endpoints de administração, SQL dinâmico não parametrizado e exposição de stack traces.

## 9. Documentação de IA e autoria

Registrar em `docs/ia.md`: data, tarefa, finalidade, resumo do prompt, decisão humana, arquivos alterados e validação. Evitar copiar conteúdo sensível. Deixar claro o que a IA gerou e o que foi revisto. Não alegar testes que não foram executados. `CONTRIBUTORS.md` identifica responsáveis humanos reais; IA é ferramenta, não contribuidor humano.

## 10. Estratégia Git

- Branch principal estável; trabalhar em branch de funcionalidade curta quando aprovado.
- Não fazer push/merge/commit automático.
- Apresentar diff e checks antes de solicitar autorização para commit.
- Mensagens sugeridas: `docs: ...`, `feat: ...`, `test: ...`, `ci: ...`, `perf: ...`.
- Verificar `git status`, arquivos ignorados e presença acidental de segredos antes de qualquer commit.
- Registrar URL do CI verde e SHA do commit final; não alterar após o cutoff de 13/11/2026 para fins de avaliação.

## 11. Plano de contingência

Se houver atraso, remover opcionais e preservar: fluxo real, Compose, unitário + integração, coverage, CI, `.env.example`, logs, métrica, SLO, README, ADR, OpenAPI, k6/p95, `docs/desempenho.md`, `docs/ia.md` e `CONTRIBUTORS.md`. Não criar evidência fictícia para fechar prazo.

## 12. Primeira instrução a executar no Claude Code

**Não executar imediatamente.** Após a aprovação do Gate G0, ler `PRD.md`, `docs/adr/0001-arquitetura.md`, `ROADMAP.md` e este `CLAUDE.md` e elaborar o plano da tarefa **F1-T0** (permissões). O plano da **F1-T1** (fundação Docker-first) só é elaborado depois de F1-T0 concluída e aprovada. Em ambos os casos, apresentar arquivos, comandos, testes e riscos e **parar antes de alterar qualquer arquivo**, aguardando aprovação.

## 13. Histórico de alterações

| Versão | Data | Tarefa | Alteração |
| --- | --- | --- | --- |
| 1.0 | 2026-11-08 | F0-T3 | Versão inicial da governança (Fase 0, somente planejamento). |
| 1.1 | 2026-11-08 | F0-T5 | Ambiente Docker-first; Express 5, ESM e PostgreSQL 17 Alpine; tarefa F1-T0 e `docs/governanca.md`; proibição de runners self-hosted; CI em `ubuntu-latest` via Docker Compose; critério verificável do SLO (≥ 99%, mínimo de 200 requisições) separado do p95; globs de coverage; isolamento `db`/`db-test` sem porta no host; seed com datas relativas. |
