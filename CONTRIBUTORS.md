# Contribuidores — TourFlow API

## Responsável humano

**Paulo Odilon Everton Rodrigues (@podilon)** — [github.com/podilon](https://github.com/podilon). Autor e único responsável humano pelo projeto.

| Área | Contribuições registradas |
| --- | --- |
| Produto e arquitetura | Definiu o escopo e aprovou o PRD, o ADR-0001, o `CLAUDE.md` e o roadmap no Gate G0 (2026-11-08). |
| Governança | Aprovou cada tarefa, dependência, download de imagem, migration, regra de permissão e publicação. Definiu o fluxo `develop` → `main` e as exceções de publicação delegada registradas em `docs/governanca.md`. |
| Revisão | Revisou os relatórios de tarefa e as auditorias de supervisão e decidiu sobre as ressalvas abertas. |
| Verificações pelo host | Executou as verificações HTTP no Windows que as regras de permissão negavam ao agente, como o `404` da F1-T1 e o ciclo `200` → `503` → `200` de `/health` na F1-T2. |
| Homologação | Decidiu delegar ao Claude Code o ensaio em clone limpo (F4-T5) e aprovou, durante o ensaio, a cópia do `.env` fictício e a verificação HTTP dentro do container. |
| Entrega | Aprovou a promoção de `develop` para `main` (PR #12) e é o responsável pela submissão no Moodle (F5-T3). |

## Ferramentas de IA (não são contribuidores humanos)

A IA foi usada como ferramenta, sob supervisão e aprovação humanas. O registro por fase, com prompts relevantes, intervenções humanas, revisões e validações, está em [docs/ia.md](docs/ia.md).

| Ferramenta | Uso |
| --- | --- |
| Claude Code (Anthropic) | Executor: planejamento, implementação, testes, documentação e, quando delegado, publicação das tarefas aprovadas |
| Codex | Supervisão: auditoria de arquitetura, qualidade, segurança e critérios de aceite; preparação de permissões e verificações somente leitura pelo host |
| ChatGPT | Supervisão técnica nos gates finais |
