import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseContractYaml } from '@changegraph/semantic-contract';
import { runAnalysis } from '@changegraph/semantic-delta';
import {
  baseCalculateDiscount,
  headCalculateDiscount,
} from '@changegraph/fixtures';

export interface WorkerJob {
  id: string;
  tenantId: string;
  repositoryId: string;
  baseSha: string;
  headSha: string;
  status: 'queued' | 'preparing' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  leaseExpiresAt?: string;
}

const jobQueue: WorkerJob[] = [];
let processing = false;

export function enqueueJob(job: Omit<WorkerJob, 'status' | 'createdAt'>): WorkerJob {
  const fullJob: WorkerJob = {
    ...job,
    status: 'queued',
    createdAt: new Date().toISOString(),
  };
  jobQueue.push(fullJob);
  processQueue();
  return fullJob;
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;

  while (jobQueue.length > 0) {
    const job = jobQueue.find((j) => j.status === 'queued');
    if (!job) break;

    job.status = 'preparing';
    job.leaseExpiresAt = new Date(Date.now() + 300000).toISOString();

    try {
      job.status = 'running';
      const contractPath = resolve('.changegraph/contract.yml');
      const contract = parseContractYaml(readFileSync(contractPath, 'utf8')).contract!;

      const response = await runAnalysis({
        tenantId: job.tenantId,
        repositoryId: job.repositoryId,
        baseSha: job.baseSha,
        headSha: job.headSha,
        contract,
        baseFn: baseCalculateDiscount,
        headFn: headCalculateDiscount,
        maxCases: 30,
      });

      console.log(`Job ${job.id} completed: policy=${response.policyDecision}`);
      job.status = 'completed';
    } catch (err) {
      console.error(`Job ${job.id} failed:`, (err as Error).message);
      job.status = 'failed';
    }
  }

  processing = false;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('ChangeGraph worker started');
  enqueueJob({
    id: 'demo-1',
    tenantId: 'local',
    repositoryId: 'changegraph',
    baseSha: 'base-demo',
    headSha: 'head-demo',
  });
}
