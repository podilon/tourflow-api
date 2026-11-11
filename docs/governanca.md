# Governança de permissões — TourFlow API

> Tarefa F1-T0 | Data: 2026-11-08 | Branch: `chore/f1-t0-permissions` | Base: `d9b59b3`
> Ambiente: Windows 11, Claude Code 2.1.319 (native), ferramentas Bash (Git Bash) e PowerShell.

## 1. Objetivo e escopo

Registrar quais regras do `CLAUDE.md` são aplicadas tecnicamente pelo Claude Code (`.claude/settings.json`), quais dependem de processo ou revisão humana e quais permanecem apenas documentais, com o nível de evidência obtido em testes reais e inofensivos.

Estas permissões **não oferecem isolamento absoluto**. Regras por padrão de texto podem ser contornadas, e nada aqui substitui revisão humana, proteção de branch no GitHub ou sandbox.

## 2. Camadas de controle

| Camada | Instrumento | Natureza |
| --- | --- | --- |
| Normativa | `CLAUDE.md`, `ROADMAP.md`, `PRD.md`, ADR-0001 | Instruções seguidas pelo agente; não impedem tecnicamente |
| Técnica | `.claude/settings.json` (versionado) | Avaliado pelo Claude Code antes de cada ferramenta |
| Processo | Aprovação humana por tarefa, revisão de diff, Git operado pelo responsável no Git Bash | Depende do responsável |
| Remota (recomendação) | Proteção da branch `main` no GitHub | Fora do repositório; configuração do responsável |

## 3. Configuração aplicada

- `defaultMode: "default"`: edições e comandos fora do allow pedem aprovação.
- `disableBypassPermissionsMode: "disable"`: rejeita `--dangerously-skip-permissions` e o modo bypass.
- `blockWritesOutsideWorkingDirectories: true`: Write, Edit e NotebookEdit recusam caminhos fora do projeto e arquivos de configuração do Claude Code. Não limita comandos de shell. Requer v2.1.314 ou superior.
- **allow (22):** somente Git de leitura (`status`, `diff`, `log`, `show`, `branch --show-current`, `rev-parse`, `ls-files`, `check-ignore`, `remote -v`), em Bash e PowerShell. Nenhum padrão amplo (`Bash(*)`, `git *`, `docker *`, `npm *`).
- **ask (17):** todo `docker *`; comandos de arquivo via shell (`cp`, `mv`, `rm`, `tee`, `mkdir`; `Set-Content`, `Add-Content`, `Out-File`, `New-Item`, `Copy-Item`, `Move-Item`, `Rename-Item`); WebFetch para `henriquelopeslima.github.io` e `code.claude.com`; WebSearch.
- **deny (160):** Git de escrita, de histórico e remoto; `gh`; Docker destrutivo, remoto ou de publicação; Node/npm no host; remoções recursivas; shells intermediários; rede via shell; `psql` no host; leitura de segredos; todas as ferramentas MCP (`mcp__*`).

Origem das sintaxes: documentação oficial em code.claude.com (páginas `permissions` e `settings`), consultada em 2026-11-08.

## 4. Legenda de evidência

| Nível | Significado |
| --- | --- |
| **COMPROVADO** | Testado com comando inofensivo; recusa ou prompt demonstrados pelo resultado da ferramenta |
| **OBSERVADO** | Efeito do mecanismo visto em operação real, fora de um teste planejado |
| **NÃO COMPROVADO** | Testado, mas o comportamento esperado não ocorreu ou não pôde ser demonstrado |
| **CONFIGURADO, NÃO TESTADO** | Regra carregada; não exercitada por ser destrutiva, remota ou fora do escopo |
| **DOCUMENTAL** | Sem controle técnico; depende de instrução e revisão |

Critério de distinção, nesta sessão: uma recusa pelo mecanismo de permissões devolve "Permission to use … has been denied" ou "denied by your permission settings". Uma recusa humana em prompt devolve "The user doesn't want to proceed with this tool use".

## 5. Evidências dos testes (2026-11-08)

### 5.1 Sintaxe e carregamento

| Verificação | Resultado | Nível |
| --- | --- | --- |
| JSON estrito (`ConvertFrom-Json`) | válido; 22 allow, 17 ask, 160 deny; 0 duplicatas exatas (comparação ordinal); 0 padrões amplos no allow | COMPROVADO |
| `claude doctor` | 2.1.319; "No installation issues found"; nenhuma entrada de settings rejeitada reportada | COMPROVADO |
| `/permissions` (executado pelo responsável) | `PowerShell(New-Item *)` listada em Ask com origem "From shared project settings" | COMPROVADO |
| Recarga automática | Após a gravação, as ferramentas MCP saíram do contexto da sessão (efeito documentado de `mcp__*` em deny) | OBSERVADO |

### 5.2 Testes de permissão

| Regra | Comando de teste (inofensivo) | Resultado da ferramenta | Nível |
| --- | --- | --- | --- |
| allow `git status` (PowerShell) | `git status --short` | executou | Executado; ausência de prompt não demonstrável pela saída |
| allow `git log` (Bash) | `git log -1 --oneline` | executou | Executado; ausência de prompt não demonstrável pela saída |
| deny `Bash(git tag *)` | `git tag --list` | "Permission to use Bash … has been denied." | COMPROVADO |
| deny `PowerShell(git config *)` | `git config --get core.autocrlf` | "Permission to use PowerShell … has been denied." | COMPROVADO |
| deny `Bash(git add *)` | `git add --dry-run .` | "Permission to use Bash … has been denied." | COMPROVADO |
| deny `PowerShell(npm *)` | `npm --version` | "Permission to use PowerShell … has been denied." | COMPROVADO |
| deny `Bash(node *)` | `node --version` | "Permission to use Bash … has been denied." | COMPROVADO |
| deny `Bash(sh *)` | `sh -c "git status --short"` | "Permission to use Bash … has been denied." | COMPROVADO |
| deny `Read(./.env)` | Read de `./.env` | "File is in a directory that is denied by your permission settings." | COMPROVADO (pela mensagem de permissão, não pela inexistência do arquivo) |
| deny de Read aplicado ao shell | `cat .env` | "Permission to use Bash … has been denied." | COMPROVADO |
| ask `Bash(mkdir *)` | `mkdir -p docs/adr` (diretório existente; sem efeito) | prompt exibido e recusado: "The user doesn't want to proceed…" | COMPROVADO (somente esta regra) |
| ask `PowerShell(New-Item *)` | `New-Item -ItemType Directory -Path .\__teste_ask_ficticio__ -WhatIf` (2 execuções) | executou sem prompt; `-WhatIf` não criou nada (`Test-Path` = False) | **NÃO COMPROVADO**: falha observada |
| Proteção do `.claude/settings.json` | Edit para acrescentar uma regra (etapa B) | "Writes to Claude Code settings files are blocked while `permissions.blockWritesOutsideWorkingDirectories` is on…" | OBSERVADO (bloqueio pelo mecanismo, sem prompt) |
| `.json` comum com a chave ligada | Write de `f1t0-json-probe.json` (`{ "probe": "f1-t0" }`) | arquivo criado; removido depois pelo responsável | Permitido; existência de prompt não demonstrável pela saída |

O resultado do ask no Bash **não** se estende ao PowerShell. Cada ferramenta exige evidência própria.

### 5.3 Configuradas, não testadas

Não exercitadas por serem destrutivas, remotas ou exigirem Docker:

- **Git e GitHub:** `git push`, `pull`, `fetch`, `clone`, `merge`, `rebase`, `cherry-pick`, `revert`, `reset`, `restore`, `checkout`, `switch`, `stash`, `clean`, `rm`, `mv`, `commit`, `branch -d/-D/-m/-M`, `remote add/set-url/remove/rename`, `git -C`, `git -c`, `gh`.
- **Docker:** `compose down -v`/`--volumes`, `volume rm`/`prune`, `system prune`, `image prune`, `push`, `login`, `context`, `-H`/`--host`; todas as regras ask de `docker *`.
- **Shell e rede:** `rm -rf`/`-fr`/`-r`, `Remove-Item`, `Clear-Content`, `Invoke-Expression`, `Invoke-Command`, `Start-Process`, PSSession, `Set-ExecutionPolicy`, `Invoke-WebRequest`, `Invoke-RestMethod`, BITS, `ssh`, `scp`, `sftp`, `rsync`, `curl`, `wget`, `psql`, os demais shells intermediários, `npx`, `pnpm`, `yarn`.
- **Leitura de segredos:** `.env.local`, `.env.*.local`, `*.pem`, `*.key`, `~/.ssh`, `~/.aws`, `~/.docker/config.json`, `~/.config/gh`.
- **Demais:** ask de `cp`, `mv`, `rm`, `tee` e dos cmdlets de escrita; WebFetch e WebSearch; `disableBypassPermissionsMode`; `blockWritesOutsideWorkingDirectories` para caminhos fora do projeto.

## 6. Matriz: regras do CLAUDE.md × controle × evidência

| Regra (CLAUDE.md) | Controle técnico | Evidência |
| --- | --- | --- |
| §3 Docker-first: Node/npm só em containers | deny `npm`, `npx`, `node`, `pnpm`, `yarn` no host; `docker *` em ask | npm/node: COMPROVADO; demais: CONFIGURADO, NÃO TESTADO |
| §5 Alteração de PRD/ADR/escopo exige aprovação | prompt de edição do `defaultMode: default` | DOCUMENTAL + prompt padrão (não testado isoladamente) |
| §5 Instalação de dependência exige aprovação | deny de npm no host; `docker *` em ask | npm: COMPROVADO; Docker: CONFIGURADO, NÃO TESTADO |
| §5 Migration estrutural exige aprovação | `docker *` em ask; `psql` no host em deny | CONFIGURADO, NÃO TESTADO; aprovação de conteúdo: DOCUMENTAL |
| §5 Comandos destrutivos exigem aprovação | deny `rm -r*`, `Remove-Item`, `down -v`, `volume rm`, prune, `git reset`, `git clean` | CONFIGURADO, NÃO TESTADO |
| §5 Commit, push, merge, rebase, tag, PR, remoto | deny de Git de escrita e remoto; deny `gh` | `git add`, `git tag`, `git config`: COMPROVADO; demais: CONFIGURADO, NÃO TESTADO |
| §5 Rede só com aprovação | WebFetch em ask (2 domínios); deny `curl`, `wget`, `ssh`, `Invoke-WebRequest`; deny `mcp__*` | MCP: OBSERVADO; demais: CONFIGURADO, NÃO TESTADO |
| §5 Arquivos fora do escopo | `blockWritesOutsideWorkingDirectories` (fora do projeto); prompt de edição (dentro) | settings: OBSERVADO; escopo interno: DOCUMENTAL + revisão de diff |
| §5 Jamais: banco de produção ou externo | deny `psql` no host | CONFIGURADO, NÃO TESTADO; restante DOCUMENTAL |
| §5 Jamais: segredos reais | deny `Read` de `.env` e de credenciais; `.gitignore` | `.env`: COMPROVADO; demais: CONFIGURADO, NÃO TESTADO |
| §5 Jamais: dados pessoais, testes desabilitados, coverage/k6 fabricados | — | DOCUMENTAL |
| §5 Jamais: runners self-hosted | deny `gh`; revisão do workflow (`runs-on: ubuntu-latest`) na F2-T4 | CONFIGURADO, NÃO TESTADO + DOCUMENTAL |
| §5 Não usar `--dangerously-skip-permissions` | `disableBypassPermissionsMode: "disable"` | CONFIGURADO, NÃO TESTADO |
| §5 Controles técnicos configurados antes das tarefas | este arquivo + `.claude/settings.json` | F1-T0 |
| §8 `.env` ignorado; `.env.example` versionado | `.gitignore` (`.env`, `.env.*`, `!.env.example`) | COMPROVADO por `git check-ignore -v` |
| §8 `.claude/settings.local.json` fora do Git | `.gitignore` | COMPROVADO por `git check-ignore -v` |
| §8 Bancos dev/test isolados; portas locais; logs sem dados pessoais; SQL parametrizado | — (definidos em F1-T1/F1-T2/F3-T1) | DOCUMENTAL |
| §10 Git operado pelo responsável | deny de escrita Git ao agente | parcialmente COMPROVADO (ver §5) |

## 7. Limitações conhecidas

1. **Ask do PowerShell não comprovado.** `PowerShell(New-Item *)` está carregada, mas `New-Item … -WhatIf` executou sem prompt. Causa não confirmada: pode ser tratamento de `-WhatIf` como somente leitura ou divergência de casamento para cmdlets. Até nova evidência, as regras ask dos cmdlets PowerShell de escrita não são consideradas efetivas.
2. **Escrita no settings via shell.** `blockWritesOutsideWorkingDirectories` protege o `.claude/settings.json` só contra Write, Edit e NotebookEdit. Por shell (`Set-Content`, `Out-File`), a barreira restante é o ask do PowerShell, que não está comprovado (item 1). A regra `Edit(./.claude/settings.json)`, que segundo a documentação também alcança redirecionamentos do Bash, ainda não está aplicada (seção 9).
3. **Regras por padrão de texto são contornáveis:** caminho absoluto do executável (`/usr/bin/git`, `& "C:\…\git.exe"`), variações de sintaxe, scripts. A documentação oficial recomenda sandbox ou hooks `PreToolUse` para garantias reais; ambos não foram adotados (YAGNI).
4. **Dentro dos containers, as regras não alcançam nada.** O que roda após um `docker compose run` aprovado não é filtrado. Mitigação: todo Docker em ask e revisão de Dockerfile, Compose e scripts npm na F1-T1.
5. **Leitura de segredos por subprocesso** (Node ou Python dentro ou fora de container) não passa pelas regras de `Read`. Mitigação: `.env` só com valores locais e fictícios.
6. **Maiúsculas no PowerShell:** as regras `PowerShell(...)` não diferenciam maiúsculas de minúsculas. Os pares `git -C`/`-c`, `branch -d`/`-D` e `-m`/`-M` equivalem a regras repetidas ali, sem efeito prático porque são todos deny.
7. **WebSearch** não tem sintaxe por domínio documentada; fica com prompt geral.
8. **Allow não comprovado formalmente:** a execução de `git status`/`git log` não demonstra, pela saída, a ausência de prompt.
9. **Settings global e local se somam ao do projeto.** O deny do projeto prevalece; um allow global poderia liberar algo que aqui está em ask. O `~/.claude/settings.json` não tem bloco `permissions` (verificado em 2026-11-08) e não foi alterado (hash SHA-256 idêntico antes e depois).
10. **Modo da sessão:** o modo "accept edits" escolhido durante uma sessão pode liberar edições sem prompt, independentemente do `defaultMode`. Os testes foram feitos em modo default, conforme confirmado pelo responsável.

## 8. Divergências documentais

| Documento | Divergência | Encaminhamento |
| --- | --- | --- |
| ROADMAP F1-T0 | Lista só `.claude/settings.json` e `docs/governanca.md`; o `.gitignore` foi incluído na F1-T0 por decisão humana (D5) | Emenda autorizada futura; a F1-T1 passa a **complementar** o `.gitignore` em vez de criá-lo |
| ROADMAP F1-T0 | Previa autoproteção pela regra `Edit(./.claude/settings.json)`; a proteção observada vem de `blockWritesOutsideWorkingDirectories` | Inclusão manual da regra `Edit` pelo responsável (seção 9) |
| CLAUDE §9 | `docs/ia.md` ainda não existe; o uso de IA na F0 e na F1-T0 não está registrado | Registrar na F1-T1, quando o arquivo for criado |

## 9. Procedimento de alteração das permissões

- O agente está impedido de alterar o `.claude/settings.json` pelas ferramentas de edição (comportamento OBSERVADO). Alterações são feitas pelo responsável, revisadas por diff e versionadas.
- Recomendado ao responsável: acrescentar `"Edit(./.claude/settings.json)"` ao deny, para cobrir também redirecionamentos do Bash.
- Não usar "Sim, não perguntar novamente" para operações de risco. Regras locais ficam em `.claude/settings.local.json`, ignorado pelo Git.
- Toda mudança de regra deve atualizar este documento, incluindo o nível de evidência.

## 10. Pendências

| Pendência | Bloqueia a F1-T1? |
| --- | --- |
| Investigar ou aceitar formalmente a limitação do ask no PowerShell | Não (registrada como limitação; Docker continua em ask também no Bash) |
| Inclusão manual da regra `Edit(./.claude/settings.json)` | Não |
| Emenda do ROADMAP sobre `.gitignore` e autoproteção | Não |
| Registro do uso de IA em `docs/ia.md` | Não (previsto para a F1-T1) |

## 11. Publicação automatizada da F1-T1 (2026-11-11)

O responsável autorizou delegar ao Claude Code a publicação da F1-T1 no
repositório `podilon/tourflow-api`, pela branch
`feat/f1-t1-docker-foundation`. As seções anteriores preservam as evidências
históricas da F1-T0.

- O Bash tem permissões explícitas para a leitura remota necessária, o stage
  dos caminhos enumerados, os commits desta entrega, o push da branch e as
  operações previstas de PR e CI. As regras de Git de escrita em PowerShell
  permanecem como estavam. Os comandos Bash fora da lista não ganham permissão
  automática.
- Antes de cada operação de publicação, confira o diretório, o `origin`, a
  branch, o conteúdo do stage e o escopo do PR. Para o merge, confirme o CI
  verde no SHA atual e envie esse SHA a `--match-head-commit`. Preserve todas
  as proteções do GitHub.
- O primeiro CI usa `ubuntu-latest` e executa lint, typecheck, testes e build
  no Docker Compose. O runner Windows permanece fora deste workflow público.
  Sua adoção exige uma decisão própria sobre isolamento e governança.
- A lista de permissões reduz prompts para comandos correspondentes. Ela não
  valida a branch ou o SHA por conta própria e não substitui as proteções do
  GitHub. O carregamento e a correspondência no Claude Code devem ser
  confirmados na nova sessão. Não use bypass se uma regra não corresponder.

## 12. Higienização após merge (2026-11-11)

O responsável delegou a limpeza de branches ao Claude Code. Publique a
política por PR separado, a partir de `origin/main`, com CI em
`ubuntu-latest`. A tarefa de produto seguinte continua com aprovação própria.

Após o GitHub confirmar o merge, confira repositório, árvore limpa e
worktrees. Atualize as referências e a `main` local apenas por fast-forward.
Antes de excluir, confirme que o último commit de cada branch local e remota
que ainda existir está contido em `origin/main`. Se uma ponta divergir,
preserve a branch e reporte. Use `git branch -d` para exclusão local e
restrinja a exclusão remota a branches enumeradas na política.

O GitHub pode excluir automaticamente a branch de origem após merge pela
opção `delete_branch_on_merge`. Essa opção está autorizada neste repositório.
Se uma branch remota já não existir, trate a etapa remota como concluída.
Depois de limpar, confira as referências remotas, o status e o HEAD local.
Nunca force a exclusão de uma branch local.

O bootstrap permite limpar `feat/f1-t1-docker-foundation` e
`chore/f1-t0-permissions` a partir da branch de manutenção. A branch de
manutenção só pode ser limpa após seu próprio merge. Para outras tarefas,
inclua a branch específica ao aprovar os comandos de publicação e limpeza.
O CI continua assíncrono: se estiver pendente, registre o PR e encerre a
sessão. Retome após a conclusão do CI para verificar o merge e limpar.

## 13. Cerimônia de branches do Moodle (2026-11-11)

O responsável informou que a cerimônia do curso exige `develop`. Crie essa
branch a partir da `main` pós-PR #2, em `40f3f30`, se ela ainda não existir.
O push desse SHA para criar a referência é uma exceção pontual de bootstrap.

- `main` e `develop` são permanentes. Tarefas partem de `develop` e retornam
  a ela por PR. A entrega promove `develop` para `main` por PR.
- Aplique e confirme as regras de exclusão e de non-fast-forward nas duas
  branches antes de promover `develop` para `main`. O payload revisado fica
  em `.github/rulesets/permanent-branches.json`. Consulte as regras
  existentes antes de criar um ruleset e preserve proteções preexistentes.
- Adapte o CI hospedado em `chore/moodle-develop-ci`, com PR para `develop`.
  Valide os PRs e pushes para `main` e `develop` via Docker Compose.
- Habilite check obrigatório e auto-merge em checkpoint posterior, após
  comprovar que o workflow dispara para as bases pretendidas. A limpeza
  automática se aplica apenas a branches curtas.

## 14. Check obrigatório e publicação assíncrona (2026-11-11)

- O CI hospedado executa para PRs dirigidos a `main` e `develop` e para
  pushes nas duas branches. Evidências: PR #2 para `main`, PR #3 para
  `develop` e run 43016767280 após o merge do PR #3 em `develop`.
- O ruleset `Require TourFlow CI before merge` exige PR e o check
  `Foundation (Compose lint, typecheck, test, build)` nas duas branches.
  A proposta não exige um número mínimo de aprovações adicionais nem
  sincronização estrita com a base. Outras regras existentes continuam
  valendo. O ruleset de branches permanentes mantém a proteção contra
  exclusão e non-fast-forward.
- Verifique as regras efetivas e só então habilite auto-merge no repositório.
  Confira o repositório, a base e o HEAD atual do PR antes de usar
  `--match-head-commit`. GitHub aguarda o CI; Claude retorna os links e encerra
  quando o merge estiver pendente. Retome para confirmar o merge, sincronizar
  as referências e limpar apenas a branch curta.
- A primeira promoção para `main` parte de `develop`. Confirme as proteções
  de exclusão nas duas branches antes do merge e a presença de `develop`
  depois. Esta configuração não inicia a F1-T2.
