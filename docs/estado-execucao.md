\# TourFlow API — Estado de Execução



\## Identificação



\- Projeto: TourFlow API

\- Curso: Full Cycle — Projeto Final B

\- Prazo de entrega: 13/11/2026

\- Repositório: https://github.com/podilon/tourflow-api



\## Arquitetura de trabalho



\- Codex: supervisão de arquitetura, qualidade e requisitos.

\- Claude Code: implementação, testes e correções.

\- Responsável humano: aprovações, commits e publicação.



\## Último checkpoint confirmado



\- Fase 0: concluída.

\- Gate G0: aprovado.

\- F1-T0: concluída, com limitações documentadas.

\- Commit: 1b8bd05

\- Branch: chore/f1-t0-permissions

\- Working tree: possui alterações não versionadas da configuração de automação.



\## Tarefa atual



\- Identificador: PREP-AUTO

\- Descrição: preparação da automação do Claude Code.

\- Status: em andamento.

\- Próxima tarefa de implementação: F1-T1 — Fundação Docker-first.



\## Recursos de automação



\- Claude Code 2.1.319.

\- Ralph Loop 1.0.1 instalado no escopo local.

\- Skill tourflow-executor reconhecida pelo Claude Code.

\- Hooks adicionais: não configurados.



\## Governança



\- Consultar CLAUDE.md, PRD.md e ROADMAP.md.

\- Consultar docs/adr/0001-arquitetura.md.

\- Consultar docs/governanca.md.

\- Não iniciar tarefa sem autorização.

\- Git de escrita permanece sob controle humano.

\- Não acessar produção, VPS ou bancos externos.

\- Não excluir volumes PostgreSQL.

\- Não utilizar permissões irrestritas.



\## Limitações conhecidas



\- ASK Bash(mkdir \*) foi comprovado.

\- ASK PowerShell(New-Item \*) não foi comprovado.

\- Demais limitações estão em docs/governanca.md.



\## Próximo checkpoint



Concluir a preparação da automação, validar a skill e registrar um commit específico.



Depois, iniciar o planejamento da F1-T1 sob supervisão do Codex.



\## Regra de atualização



Atualizar este documento somente após um marco verificável.



Cada atualização deverá informar:



\- Data.

\- Tarefa.

\- Commit e branch confirmados.

\- Testes realmente executados.

\- Pendências.

\- Próxima ação.



Não declarar tarefas concluídas sem evidências.
