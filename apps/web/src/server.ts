import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseContractYaml } from '@changegraph/semantic-contract';
import { runAnalysis } from '@changegraph/semantic-delta';
import { exportPassport, verifyPassport } from '@changegraph/attestations';
import { BehavioralMemoryStore } from '@changegraph/proof-memory';
import {
  baseCalculateDiscount,
  headCalculateDiscount,
} from '@changegraph/fixtures';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const memoryStore = new BehavioralMemoryStore();

interface RunRecord {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  binding?: unknown;
  report?: unknown;
  policyDecision?: string;
  createdAt: string;
}

const runs = new Map<string, RunRecord>();

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const path = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (path === '/api/health') {
      json(res, 200, { status: 'ok', version: '0.1.0' });
      return;
    }

    if (path === '/semantic/contracts/validate' && req.method === 'POST') {
      const body = await readBody(req);
      const { content } = JSON.parse(body);
      const result = parseContractYaml(content);
      json(res, result.valid ? 200 : 400, result);
      return;
    }

    if (path === '/semantic/runs' && req.method === 'POST') {
      const body = await readBody(req);
      const { baseSha, headSha } = JSON.parse(body);
      const runId = randomUUID();
      const record: RunRecord = { id: runId, status: 'queued', createdAt: new Date().toISOString() };
      runs.set(runId, record);

      const contractPath = resolve('.changegraph/contract.yml');
      const contract = parseContractYaml(readFileSync(contractPath, 'utf8')).contract!;

      record.status = 'running';
      const response = await runAnalysis({
        tenantId: 'local',
        repositoryId: 'changegraph',
        baseSha,
        headSha,
        contract,
        baseFn: baseCalculateDiscount,
        headFn: headCalculateDiscount,
        maxCases: 30,
      });

      record.status = 'completed';
      record.binding = response.binding;
      record.report = response.report;
      record.policyDecision = response.policyDecision;

      json(res, 201, { runId, status: record.status, policyDecision: response.policyDecision });
      return;
    }

    if (path.startsWith('/semantic/runs/') && req.method === 'GET') {
      const runId = path.split('/')[3];
      const record = runs.get(runId);
      if (!record) {
        json(res, 404, { error: 'Run not found' });
        return;
      }
      json(res, 200, record);
      return;
    }

    if (path.startsWith('/semantic/runs/') && path.endsWith('/passport') && req.method === 'GET') {
      const runId = path.split('/')[3];
      const record = runs.get(runId);
      if (!record || !record.binding || !record.report) {
        json(res, 404, { error: 'Run not found or incomplete' });
        return;
      }
      const report = record.report as { obligationResults: import('@changegraph/semantic-contract').ObligationResult[] };
      const binding = record.binding as import('@changegraph/semantic-contract').RunBinding;
      const passport = exportPassport({
        binding,
        contractDefinitionDigest: binding.contractDefinitionDigest,
        policyDigest: binding.policyDigest,
        executionConfigDigest: binding.executionConfigDigest,
        obligationResults: report.obligationResults,
        policyDecision: (record.policyDecision ?? 'needs-review') as import('@changegraph/semantic-contract').PolicyDecision,
        evidenceLeaves: [],
        completionStatus: 'complete',
      });
      json(res, 200, passport);
      return;
    }

    if (path === '/semantic/passports/verify' && req.method === 'POST') {
      const body = await readBody(req);
      const { manifest, mode = 'integrity' } = JSON.parse(body);
      const result = verifyPassport(manifest, mode);
      json(res, result.valid ? 200 : 400, result);
      return;
    }

    if (path === '/semantic/memory' && req.method === 'GET') {
      const tenantId = url.searchParams.get('tenantId') ?? 'local';
      const repositoryId = url.searchParams.get('repositoryId') ?? 'changegraph';
      json(res, 200, {
        cases: memoryStore.getCases(tenantId, repositoryId),
        proofs: memoryStore.getProofs(tenantId, repositoryId),
      });
      return;
    }

    if (path === '/' || path === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(getIndexHtml());
      return;
    }

    json(res, 404, { error: 'Not found' });
  } catch (err) {
    json(res, 500, { error: (err as Error).message });
  }
}

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

function getIndexHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ChangeGraph</title>
  <style>
    :root { --bg: #0f1419; --surface: #1a2332; --text: #e7ecf3; --accent: #3b82f6; --success: #22c55e; --error: #ef4444; --warn: #f59e0b; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
    header { padding: 2rem; border-bottom: 1px solid #2a3544; }
    h1 { font-size: 1.5rem; }
    .tagline { color: #8899aa; margin-top: 0.25rem; }
    main { max-width: 960px; margin: 0 auto; padding: 2rem; }
    .card { background: var(--surface); border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; }
    button { background: var(--accent); color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
    button:hover { opacity: 0.9; }
    .status { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.85rem; }
    .status.permit { background: var(--success); color: #000; }
    .status.block { background: var(--error); }
    .status.needs-review { background: var(--warn); color: #000; }
    pre { background: #0a0e14; padding: 1rem; border-radius: 4px; overflow-x: auto; font-size: 0.85rem; }
    #results { margin-top: 1rem; }
  </style>
</head>
<body>
  <header>
    <h1>ChangeGraph</h1>
    <p class="tagline">Know when a change has enough evidence to ship.</p>
  </header>
  <main>
    <div class="card">
      <h2>Semantic Delta Analysis</h2>
      <p>Run behavioral verification against the pricing fixture contract.</p>
      <button id="runBtn">Run Analysis</button>
      <div id="results"></div>
    </div>
    <div class="card">
      <h2>API Endpoints</h2>
      <pre>POST /semantic/contracts/validate
POST /semantic/runs
GET  /semantic/runs/:runId
GET  /semantic/runs/:runId/passport
POST /semantic/passports/verify
GET  /semantic/memory</pre>
    </div>
  </main>
  <script>
    document.getElementById('runBtn').addEventListener('click', async () => {
      const results = document.getElementById('results');
      results.innerHTML = '<p>Running analysis...</p>';
      try {
        const res = await fetch('/semantic/runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseSha: 'abc123', headSha: 'def456' }),
        });
        const data = await res.json();
        const runRes = await fetch('/semantic/runs/' + data.runId);
        const run = await runRes.json();
        const policy = run.policyDecision || 'unknown';
        results.innerHTML = '<p>Policy: <span class="status ' + policy + '">' + policy + '</span></p><pre>' + JSON.stringify(run.report?.summary || run, null, 2) + '</pre>';
      } catch (err) {
        results.innerHTML = '<p style="color:var(--error)">Error: ' + err.message + '</p>';
      }
    });
  </script>
</body>
</html>`;
}

const server = createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`ChangeGraph web server running at http://localhost:${PORT}`);
});
