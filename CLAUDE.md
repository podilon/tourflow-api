# CLAUDE.md — Constituição de engenharia e governança do TourFlow API

> **PROJETO B — Full Cycle.** Documento de instruções para Claude Code. Versão 1.0, 2026-11-08.
> **Estado atual: FASE 0 — SOMENTE PLANEJAMENTO. NÃO IMPLEMENTAR A APLICAÇÃO SEM AUTORIZAÇÃO EXPRESSA.**

## 1. Missão e prioridade

Construir, **após autorização**, uma API REST pequena de reservas turísticas, com persistência e prevenção de sobre-reservas, para demonstrar os requisitos do Projeto B. Entregar engenharia verificável, não tamanho.

Hierarquia de decisão: (1) instruções explícitas mais recentes do responsável e limitações de segurança; (2) rubrica oficial; (3) PRD e ADR aprovados; (4) este arquivo; (5) backlog/roadmap. Havendo conflito, **parar e solicitar decisão**; não reinterpretar silenciosamente o escopo.

## 2. Fonte única de verdade

- `PRD.md`: o que construir e critérios de aceite.
- `docs/adr/0001-arquitetura.md`: arquitetura e alternativas rejeitadas.
- `ROADMAP.md`: fases, ordem e gates.
- `docs/ia.md`: transparência do uso de IA, prompts relevantes e revisões (criar na fase autorizada).
- Material oficial: https://henriquelopeslima.github.io/diglass/aulas/24-projeto-final.html

A documentação da Fase 0 é **proposta** até aprovação explícita. Não presumir arquivos ainda inexistentes no repositório.

## 3. Stack e princípios

- Node.js 24 LTS; TypeScript; Express; PostgreSQL; `pg`; Zod.
- Vitest + Supertest; ESLint; Docker Compose; GitHub Actions.
- Pino (JSON e request ID); prom-client; OpenAPI 3.1; k6.
- Monólito em camadas, repositório por contrato, injeção de dependência simples.
- Simplicidade/YAGNI, baixo acoplamento, funções pequenas, falhas explícitas, sem generalizações especulativas.
- O lockfile, a configuração real de versões e os comandos devem ser gerados e comprovados durante a implementação, nunca inventados na documentação.

## 4. Limites rígidos de escopo

**Permitido após autorização:** catálogo somente leitura, saídas, criar/consultar reservas, saúde, logs, métrica, testes, CI, documentação, smoke k6.

**Proibido sem nova aprovação:** autenticação, pagamento, painel web, multi-tenant, filas, cache, microserviços, cloud, telemetria externa, serviços de terceiros, inclusão de dados reais, refatoração não relacionada, upgrade amplo de dependências, cancelamento de reserva (opcional).

## 5. Política de autonomia

### Operações de leitura e planejamento

Pode inspecionar arquivos e `git status`, sugerir comandos, revisar diffs e elaborar plano **sem alterar arquivos** enquanto a Fase 0 não tiver sido aprovada.

### Depois da autorização da fase/tarefa

Pode editar somente os caminhos aprovados e executar comandos locais de baixo risco (lint, testes, build). Antes de instalar dependências ou construir contêineres, explicar comandos, efeitos e alterações esperadas e obter aprovação da tarefa apropriada.

### Exigem aprovação explícita, mesmo com tarefa aprovada

- Alteração de PRD/ADR/escopo ou mudança de tecnologia.
- Instalação de dependência nova não prevista na tarefa.
- Qualquer migration de alteração estrutural, especialmente destrutiva; executar apenas no banco da TourFlow com alvo verificado.
- Execução de comando destrutivo (`rm -rf`, `docker compose down -v`, `docker system prune`, `git reset --hard`, `git clean -fd`, `DROP`, `TRUNCATE` etc.).
- `git commit`, `git push`, merge, rebase, tag, PR e operações remotas.
- Acesso à rede fora de downloads especificamente aprovados; uso de serviços pagos.
- Modificação de arquivos fora do escopo da tarefa.

**Jamais:** consultar ou modificar banco de produção, usar segredos reais, publicar dados pessoais, desabilitar testes para passar CI, fabricar resultados de coverage/k6, executar comandos destrutivos para “consertar” ambiente sem análise. Não copiar credenciais para logs, prompts ou commits.

**Importante:** estas instruções são normativas, mas **não substituem os controles técnicos de permissões** do Claude Code, GitHub e Docker. Configurar allow/ask/deny antes de executar tarefas. Não usar `--dangerously-skip-permissions`.

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
- Lint e testes precisam passar; testes devem conter asserções relevantes.
- Coverage **mínimo 80% linhas e branches nas regras de domínio/serviços**, aferido em CI.
- Teste de integração precisa atingir PostgreSQL real e isolado (nunca banco de produção).
- Concorrência deve ser testada: confirmações não podem exceder capacidade.
- Documentar OpenAPI de criação de reserva; README executável em máquina limpa.
- `docker compose up --build -d` deve subir a aplicação e o banco com um comando; migrations/seed podem ter passo explícito documentado.
- SLO (meta local) de `GET /departures` 99% <500 ms e p95 do smoke k6 devem ser **medidos e registrados**, não estimados.
- CI verde com link verificável, se houver execução publicada.

## 8. Padrões de segurança e dados

- Banco de desenvolvimento e banco de teste separados por nome/instância; não reutilizar URI externa desconhecida.
- `.env` ignorado; `.env.example` apenas placeholders. Nunca imprimir segredos.
- Seeds de duas experiências e saídas futuras com dados sintéticos e determinísticos; não usar dados reais.
- Logs estruturados: request ID, rota, método, status, duração e classificação do erro, sem body nem e-mail.
- API de demonstração sem auth não deve ser exposta publicamente; usar bind local no Compose sempre que possível.
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

**Não executar imediatamente.** Quando o responsável liberar a Fase 1, ler `PRD.md`, `docs/adr/0001-arquitetura.md`, `ROADMAP.md` e este `CLAUDE.md`; elaborar um plano técnico de implementação da tarefa F1-T1, com arquivos, comandos, testes e riscos; **parar antes de alterar qualquer arquivo**, aguardando aprovação.
