# Desempenho — smoke k6 e SLO educacional (F4-T1, F4-T2)

Resultado **real** de uma única execução oficial, sem repetição nem seleção de execuções. Os números abaixo vêm de [`performance/results/smoke-summary.json`](../performance/results/smoke-summary.json), gerado pelo próprio script, e da saída do k6 no terminal.

## Resumo

| Item | Resultado |
| --- | --- |
| Data da execução oficial | 2026-11-11, resumo gerado às 15:57:42 UTC |
| Amostra (requisições `GET /departures`) | **572** |
| p95 de `http_req_duration` | **1,913 ms**; threshold `p(95)<500` **aprovado** |
| SLO `slo_departures_ok` | **100,00%** (572/572); threshold `rate>=0.99` **aprovado** |
| Classificação do SLO | **ATINGIDO** (amostra ≥ 200) |
| Falhas | 0 requisições com falha (`http_req_failed` 0%), 0 checks reprovados |
| Código de saída do k6 | **0** |

## Ambiente

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

### Verificação da imagem k6 (2026-11-11)

1. `docker --context desktop-linux buildx imagetools inspect grafana/k6:1.0.0`: índice OCI com digest `sha256:f21270290d702cbf0a7d6ba5d7ed100b63bcb233b558b885ed787547b3488279`, com manifestos linux/amd64 e linux/arm64 e atestações. O digest foi conferido como `sha256:` seguido de 64 dígitos hexadecimais.
2. O pull foi feito **somente pela referência completa** `grafana/k6:1.0.0@sha256:f212…8279`.
3. `image inspect` → `RepoDigests` = `grafana/k6@sha256:f212…8279`, igual ao índice.
4. `run --rm grafana/k6:1.0.0@sha256:f212…8279 version` → `k6 v1.0.0`.
5. A mesma referência está fixada em `docker-compose.yml` (serviço `k6`, profile `perf`).

## Script e cenário

- Script: [`performance/smoke.js`](../performance/smoke.js).
- Executor `constant-vus`: **1 VU por 30 s**, apenas `GET /departures`, com intervalo de **50 ms** entre requisições (`sleep(0.05)`). O intervalo foi escolhido para produzir uma amostra acima de 200 requisições; com o intervalo de 1 s, típico de smoke, haveria cerca de 30 requisições e o SLO seria sempre inconclusivo.
- Avaliações **separadas**:
  - **Smoke (RNF-09):** threshold `http_req_duration: p(95)<500`.
  - **SLO (RNF-08):** métrica `Rate` `slo_departures_ok`, em que cada requisição só conta como sucesso com HTTP **200** **e** duração **< 500 ms**; threshold `rate>=0.99`.
- Classificação do SLO no `handleSummary`: **INCONCLUSIVO** se a amostra for menor que 200; caso contrário, **ATINGIDO** (taxa ≥ 99%) ou **NAO_ATINGIDO**.

## Comandos

```bash
docker --context desktop-linux compose -p tourflow up --build -d --wait api      # api + db saudáveis
docker --context desktop-linux compose -p tourflow --profile perf run --rm --no-deps k6 run smoke.js
```

Na documentação geral (README), sem o contexto explícito: `docker compose up --build -d --wait api` e `docker compose --profile perf run --rm --no-deps k6 run smoke.js`.

## Resultados detalhados

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

Saída final do k6:

```text
TourFlow smoke (k6)
  requests total ........ 572
  p95 (ms) .............. 1.913  threshold p(95)<500: OK
  slo_departures_ok ..... 100.00% (572/572)  threshold rate>=0.99: OK
  SLO classification .... ATINGIDO (min samples 200)
```

## Controles da medição

- **Somente leitura no banco de desenvolvimento:** a impressão digital do catálogo (contagens e `md5` de `departures` + `experiences`) foi lida antes e depois da execução, com resultado idêntico: 2 experiências, 1 reserva (a reserva E2E do Bloco 1), 4 saídas, fingerprint `141eee827dea643c94bb01d4471801f9`.
- `GET /health` → `200` antes da medição. A API gravou uma linha de log JSON por requisição (`route":"/departures","statusCode":200`).
- **Execuções oficiais:** uma única execução, a registrada acima. Nenhuma outra execução do smoke foi feita.

## Conclusão

No ambiente local descrito, `GET /departures` atendeu ao smoke (p95 de 1,913 ms, muito abaixo de 500 ms) e o SLO educacional foi **ATINGIDO** com 100% de 572 amostras, acima do mínimo de 200.

## Limites da medição

- Medição **local**, numa única VM do Docker Desktop e numa única rede Docker: sem latência de rede real, TLS, proxy ou balanceador.
- **1 VU**: não é teste de carga nem de concorrência; não indica capacidade nem comportamento sob contenção.
- Catálogo fictício e pequeno (4 saídas), sem crescimento de dados.
- Janela de 30 s: não captura variação ao longo do tempo, aquecimento prolongado nem coleta de lixo em escala.
- O SLO é **educacional**, não um SLO de produção. A janela é uma única execução, e o resultado não deve ser extrapolado.
- Os logs Pino da API (uma linha por requisição no stdout) fazem parte do custo medido.
