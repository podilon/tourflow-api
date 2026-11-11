// Smoke k6 do TourFlow API (F4-T1; PRD RNF-08 e RNF-09).
// Execução: docker compose --profile perf run --rm --no-deps k6 run smoke.js
// p95 e SLO são avaliados separadamente. O SLO só é classificado com pelo
// menos 200 amostras; abaixo disso é INCONCLUSIVO.
import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://api:3000';
const RESULTS_DIR = __ENV.RESULTS_DIR || '/results';
const SLO_LATENCY_MS = 500;
const SLO_TARGET = 0.99;
const SLO_MIN_SAMPLES = 200;
const PACING_SECONDS = 0.05;

/** SLI: GET /departures com HTTP 200 e duração abaixo de 500 ms. */
const sloDeparturesOk = new Rate('slo_departures_ok');

export const options = {
  scenarios: {
    smoke: { executor: 'constant-vus', vus: 1, duration: '30s' },
  },
  thresholds: {
    http_req_duration: [`p(95)<${SLO_LATENCY_MS}`],
    slo_departures_ok: [`rate>=${SLO_TARGET}`],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/departures`, { tags: { endpoint: 'GET /departures' } });
  check(res, { 'status 200': (r) => r.status === 200 });
  sloDeparturesOk.add(res.status === 200 && res.timings.duration < SLO_LATENCY_MS);
  sleep(PACING_SECONDS);
}

function thresholdOk(metric, expression) {
  return Boolean(metric && metric.thresholds && metric.thresholds[expression] && metric.thresholds[expression].ok);
}

function classifySlo(samples, rate) {
  if (samples < SLO_MIN_SAMPLES) return 'INCONCLUSIVO';
  return rate >= SLO_TARGET ? 'ATINGIDO' : 'NAO_ATINGIDO';
}

export function handleSummary(data) {
  const duration = data.metrics.http_req_duration;
  const slo = data.metrics.slo_departures_ok;
  const reqs = data.metrics.http_reqs;
  const failed = data.metrics.http_req_failed;
  const checks = data.metrics.checks;
  const sloSamples = slo.values.passes + slo.values.fails;

  const result = {
    generatedAt: new Date().toISOString(),
    scenario: { executor: 'constant-vus', vus: 1, duration: '30s', endpoint: 'GET /departures', pacingSeconds: PACING_SECONDS },
    requests: { total: reqs.values.count, ratePerSecond: reqs.values.rate, failedRate: failed ? failed.values.rate : null },
    checks: checks ? { passes: checks.values.passes, fails: checks.values.fails } : null,
    latencyMs: {
      avg: duration.values.avg,
      med: duration.values.med,
      p90: duration.values['p(90)'],
      p95: duration.values['p(95)'],
      max: duration.values.max,
    },
    p95Threshold: { expression: `p(95)<${SLO_LATENCY_MS}`, ok: thresholdOk(duration, `p(95)<${SLO_LATENCY_MS}`) },
    slo: {
      sli: `GET /departures com HTTP 200 e duração < ${SLO_LATENCY_MS} ms`,
      target: SLO_TARGET,
      minSamples: SLO_MIN_SAMPLES,
      samples: sloSamples,
      successes: slo.values.passes,
      failures: slo.values.fails,
      rate: slo.values.rate,
      thresholdOk: thresholdOk(slo, `rate>=${SLO_TARGET}`),
      classification: classifySlo(sloSamples, slo.values.rate),
    },
  };

  const text = [
    'TourFlow smoke (k6)',
    `  requests total ........ ${result.requests.total}`,
    `  p95 (ms) .............. ${result.latencyMs.p95.toFixed(3)}  threshold p(95)<${SLO_LATENCY_MS}: ${result.p95Threshold.ok ? 'OK' : 'FAIL'}`,
    `  slo_departures_ok ..... ${(result.slo.rate * 100).toFixed(2)}% (${result.slo.successes}/${result.slo.samples})  threshold rate>=${SLO_TARGET}: ${result.slo.thresholdOk ? 'OK' : 'FAIL'}`,
    `  SLO classification .... ${result.slo.classification} (min samples ${SLO_MIN_SAMPLES})`,
    '',
  ].join('\n');

  return {
    stdout: text,
    [`${RESULTS_DIR}/smoke-summary.json`]: `${JSON.stringify(result, null, 2)}\n`,
  };
}
