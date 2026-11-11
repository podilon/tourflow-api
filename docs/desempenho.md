# Desempenho — smoke k6 e SLO educacional (F4-T1, F4-T2, F4-T5)

Este relatório registra resultados **reais**: uma única execução oficial, sem repetição nem seleção, e um ensaio de reprodutibilidade em clone limpo, mantido separado. Os números da execução oficial vêm de [`performance/results/smoke-summary.json`](../performance/results/smoke-summary.json), gerado pelo próprio script, e da saída do k6 no terminal. Os do ensaio vêm do registro da F4-T5 em [estado-execucao.md](estado-execucao.md).

## Resumo

| Item | Execução oficial | Ensaio em clone limpo |
| --- | --- | --- |
| Data | 2026-11-11, resumo às 15:57:42 UTC | 2026-11-11, resumo às 16:18:32 UTC |
| Ambiente Compose | projeto `tourflow` | projeto `tourflow_clean`, SHA `2820b89d03a1799fafdc46e1838a1c1391aa8142` |
| Amostra (`GET /departures`) | **572** | 571 |
| p95 de `http_req_duration` | **1,913 ms**; `p(95)<500` aprovado | 2,063 ms; `p(95)<500` aprovado |
| SLO `slo_departures_ok` | **100,00%** (572/572); `rate>=0.99` aprovado | 100,00% (571/571); `rate>=0.99` aprovado |
| Classificação do SLO | **ATINGIDO** (amostra ≥ 200) | ATINGIDO (amostra ≥ 200) |
| Falhas | 0 requisições com falha, 0 checks reprovados | — |
| Código de saída do k6 | **0** | 0 |
| Papel | Evidência oficial da entrega | Reprodutibilidade; **não substitui** a oficial |

## 1. Objetivo

- **Smoke (PRD RNF-09):** medir o p95 de `http_req_duration` em `GET /departures`, com threshold `p(95)<500`.
- **SLO educacional (PRD RNF-08):** verificar se ao menos 99% das requisições `GET /departures` terminam com HTTP 200 **e** em menos de 500 ms, com amostra mínima de 200 requisições. Abaixo disso, o resultado seria **inconclusivo**.

As duas avaliações são **independentes**. O p95 descreve a distribuição de latência. O SLO conta a proporção de requisições boas, ou seja, com status 200 e abaixo de 500 ms. Um p95 baixo não prova o SLO, porque não considera o status nem os 5% mais lentos, e o SLO não informa o p95.

## 2. Ambiente

| Item | Valor |
| --- | --- |
| Host | Windows 11 com Docker Desktop (contexto `desktop-linux`) |
| Docker Engine | 29.9.2, linux/amd64 |
| Docker Compose | v5.6.1 |
| Recursos da VM do Docker | 4 CPUs, 4.107.522.048 bytes de memória (~3,8 GiB), x86_64 (`docker info`) |
| API | imagem `tourflow-api:local` (estágio `runtime`, Node.js 24.22.2 / Alpine 3.24), `NODE_ENV=production` |
| Banco | `postgres:17.11-alpine` (serviço `db`, volume `tourflow_pgdata`), catálogo fictício do seed: 2 experiências e 4 saídas |
| k6 | `grafana/k6:1.0.0@sha256:f21270290d702cbf0a7d6ba5d7ed100b63bcb233b558b885ed787547b3488279`; `k6 v1.0.0 (commit/41b4984b75-dirty, go1.24.2, linux/amd64)` |
| Rede | k6 → `http://api:3000` pela rede interna do Compose; nenhuma porta publicada para o k6 |

O ensaio em clone limpo usou o mesmo host e a mesma VM, com imagens `:clean` construídas a partir do clone, volumes próprios (`tourflow_clean_pgdata`, `tourflow_clean_dev_node_modules`) e a API publicada em `127.0.0.1:3100`.

### Verificação da imagem k6 (2026-11-11)

1. `docker --context desktop-linux buildx imagetools inspect grafana/k6:1.0.0`: índice OCI com digest `sha256:f21270290d702cbf0a7d6ba5d7ed100b63bcb233b558b885ed787547b3488279`, com manifestos linux/amd64 e linux/arm64 e atestações. O digest foi conferido como `sha256:` seguido de 64 dígitos hexadecimais.
2. O pull foi feito **somente pela referência completa** `grafana/k6:1.0.0@sha256:f212…8279`.
3. `image inspect` → `RepoDigests` = `grafana/k6@sha256:f212…8279`, igual ao índice.
4. `run --rm grafana/k6:1.0.0@sha256:f212…8279 version` → `k6 v1.0.0`.
5. A mesma referência está fixada em `docker-compose.yml` (serviço `k6`, profile `perf`).

## 3. Método

### Script e cenário

- Script: [`performance/smoke.js`](../performance/smoke.js).
- Executor `constant-vus`: **1 VU por 30 s**, apenas `GET /departures`, com intervalo de **50 ms** entre requisições (`sleep(0.05)`). O intervalo foi escolhido para produzir uma amostra acima de 200 requisições. Com o intervalo de 1 s, típico de smoke, haveria cerca de 30 requisições e o SLO seria sempre inconclusivo.
- Avaliações **separadas**:
  - **Smoke (RNF-09):** threshold `http_req_duration: p(95)<500`.
  - **SLO (RNF-08):** métrica `Rate` `slo_departures_ok`, em que cada requisição só conta como sucesso com HTTP **200** **e** duração **< 500 ms**; threshold `rate>=0.99`.
- Classificação do SLO no `handleSummary`: **INCONCLUSIVO** se a amostra for menor que 200; caso contrário, **ATINGIDO** (taxa ≥ 99%) ou **NAO_ATINGIDO**.
- Um threshold reprovado faz o k6 terminar com código 99. Esse código é resultado da medição e deve ser registrado.

### Comandos da execução oficial

```bash
docker --context desktop-linux compose -p tourflow up --build -d --wait api      # api + db saudáveis
docker --context desktop-linux compose -p tourflow --profile perf run --rm --no-deps k6 run smoke.js
```

Na documentação geral ([README](../README.md#64-slo-p95-e-smoke-k6)), sem o contexto explícito: `docker compose up --build -d --wait api` e `docker compose --profile perf run --rm --no-deps k6 run smoke.js`. Executar o smoke de novo **sobrescreve** `performance/results/smoke-summary.json`; a evidência oficial é a versão no Git.

### Comando do ensaio em clone limpo

No clone, com o `.env` isolado (projeto `tourflow_clean`) e a pasta `performance/results/clone-rehearsal` criada vazia antes da execução:

```bash
docker --context desktop-linux compose -p tourflow_clean --profile perf run --rm --no-deps k6 run -e RESULTS_DIR=../results/clone-rehearsal smoke.js
```

O resumo do ensaio foi gravado em `performance/results/clone-rehearsal/smoke-summary.json`, **dentro do clone**, e não é versionado.

### Controles da medição

- **Somente leitura no banco de desenvolvimento:** a impressão digital do catálogo (contagens e `md5` de `departures` + `experiences`) foi lida antes e depois da execução oficial, com resultado idêntico: 2 experiências, 1 reserva (a reserva E2E do Bloco 1), 4 saídas, fingerprint `141eee827dea643c94bb01d4471801f9`.
- `GET /health` → `200` antes da medição. A API gravou uma linha de log JSON por requisição (`route":"/departures","statusCode":200`).
- **Execuções oficiais:** uma única execução, a registrada abaixo. Nenhuma outra execução do smoke foi feita no ambiente `tourflow`.
- **Ensaio:** o SHA-256 do JSON oficial versionado (`2d54237b…a231e555`) foi conferido antes e depois do smoke do clone e permaneceu idêntico, no clone e no repositório principal.

## 4. Resultado oficial

| Métrica | Valor |
| --- | --- |
| Requisições | 572 (19,06 req/s) |
| Latência média | 1,522 ms |
| Mediana | 1,447 ms |
| p90 | 1,772 ms |
| **p95** | **1,913 ms** |
| Máximo | 13,565 ms |
| Checks `status 200` | 572 aprovados, 0 reprovados |
| `http_req_failed` | 0 |
| `slo_departures_ok` | 572 sucessos, 0 falhas, taxa 1,0 |

Saída final do k6 (resumo bruto, sem edição):

```text
TourFlow smoke (k6)
  requests total ........ 572
  p95 (ms) .............. 1.913  threshold p(95)<500: OK
  slo_departures_ok ..... 100.00% (572/572)  threshold rate>=0.99: OK
  SLO classification .... ATINGIDO (min samples 200)
```

Resumo JSON versionado ([`performance/results/smoke-summary.json`](../performance/results/smoke-summary.json), sem edição):

```json
{
  "generatedAt": "2026-11-11T15:57:42.398Z",
  "scenario": {
    "executor": "constant-vus",
    "vus": 1,
    "duration": "30s",
    "endpoint": "GET /departures",
    "pacingSeconds": 0.05
  },
  "requests": {
    "total": 572,
    "ratePerSecond": 19.062975893435425,
    "failedRate": 0
  },
  "checks": {
    "passes": 572,
    "fails": 0
  },
  "latencyMs": {
    "avg": 1.5224757132867117,
    "med": 1.4469105,
    "p90": 1.7724532999999998,
    "p95": 1.9130067499999994,
    "max": 13.565077
  },
  "p95Threshold": {
    "expression": "p(95)<500",
    "ok": true
  },
  "slo": {
    "sli": "GET /departures com HTTP 200 e duração < 500 ms",
    "target": 0.99,
    "minSamples": 200,
    "samples": 572,
    "successes": 572,
    "failures": 0,
    "rate": 1,
    "thresholdOk": true,
    "classification": "ATINGIDO"
  }
}
```

## 5. Ensaio em clone limpo (F4-T5)

| Item | Valor |
| --- | --- |
| Requisições | 571 |
| p95 | 2,063 ms (`p(95)<500` OK) |
| `slo_departures_ok` | 100,00% (571/571), `rate>=0.99` OK |
| Classificação | ATINGIDO (mínimo de 200) |
| Código de saída | 0 |
| Resumo | `performance/results/clone-rehearsal/smoke-summary.json` no clone, novo (`generatedAt` `2026-11-11T16:18:32.446Z`), 816 bytes, não versionado |

**Ressalva do ensaio:** no clone, o HTTP 200 de `/health` e `/departures` foi verificado **dentro do contêiner** `api`, com `fetch` na porta interna. O bind `127.0.0.1:3100→3000` foi conferido pelo Compose (`config` e `port api 3000`). A requisição pelo host foi bloqueada pela regra `deny` `Bash(curl *)` e **não foi executada**. O k6 acessa a API pela rede interna do Compose em ambos os casos, então a medição não depende do bind do host.

## 6. Interpretação

- No ambiente local descrito, `GET /departures` atendeu ao smoke (p95 de 1,913 ms, muito abaixo de 500 ms), e o SLO educacional foi **ATINGIDO** com 100% de 572 amostras, acima do mínimo de 200.
- O ensaio em clone limpo, a partir do SHA publicado, chegou a valores da mesma ordem (571 amostras, p95 de 2,063 ms, SLO 100%). Isso indica que o resultado oficial é reproduzível a partir do repositório, sem depender do estado do ambiente de desenvolvimento.
- A diferença de 0,15 ms no p95 e de 1 requisição na amostra está dentro da variação esperada entre duas execuções curtas e não deve ser lida como tendência.
- O máximo de 13,565 ms na execução oficial é um valor isolado e não afeta o p95 nem o SLO.

## 7. Limitações

- Medição **local**, numa única VM do Docker Desktop e numa única rede Docker: sem latência de rede real, TLS, proxy ou balanceador.
- **1 VU**: não é teste de carga nem de concorrência. Não indica capacidade nem comportamento sob contenção. A concorrência de reservas é comprovada pelos testes de integração, não pelo k6.
- Apenas `GET /departures`, sobre um catálogo fictício e pequeno (4 saídas), sem crescimento de dados. `POST /reservations` não foi medido.
- Janela de 30 s: não captura variação ao longo do tempo, aquecimento prolongado nem coleta de lixo em escala.
- O SLO é **educacional**, não um SLO de produção. A janela é uma única execução, e o resultado não deve ser extrapolado.
- Os logs Pino da API (uma linha por requisição no stdout) fazem parte do custo medido.
