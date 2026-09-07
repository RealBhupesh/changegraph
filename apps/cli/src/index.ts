#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  parseContractYaml,
  diffContractScope,
  evaluateApprovalRequirements,
} from '@changegraph/semantic-contract';
import { runAnalysis } from '@changegraph/semantic-delta';
import { verifyPassport, parsePassport } from '@changegraph/attestations';
import { BehavioralMemoryStore } from '@changegraph/proof-memory';
import type { Json } from '@changegraph/semantic-contract';

type FunctionFixture = (input: Record<string, Json>) => unknown;

const args = process.argv.slice(2);

async function main(): Promise<void> {
  const command = args[0];

  try {
    switch (command) {
      case 'contract':
        await handleContract(args.slice(1));
        break;
      case 'semantic-delta':
        await handleSemanticDelta(args.slice(1));
        break;
      case 'passport':
        await handlePassport(args.slice(1));
        break;
      case 'memory':
        await handleMemory(args.slice(1));
        break;
      case 'interaction':
        await handleInteraction(args.slice(1));
        break;
      case '--help':
      case '-h':
      case undefined:
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(2);
    }
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(4);
  }
}

function printHelp(): void {
  console.error(`changegraph — semantic-delta verification

Commands:
  contract validate --file <path>
  contract diff --base-contract <file> --head-contract <file>
  semantic-delta analyze --base <sha> --head <sha> --contract <file> [--json]
  passport export --run <id> --out <path>
  passport verify --file <path> --mode <integrity|replay|proof>
  memory explain --entry <id>
  interaction analyze --fixture <name>

Exit codes:
  0 = requirements satisfied
  1 = required falsification
  2 = invalid input/configuration
  3 = incomplete/needs review
  4 = infrastructure error`);
}

async function handleContract(subArgs: string[]): Promise<void> {
  const subcommand = subArgs[0];

  if (subcommand === 'validate') {
    const fileIdx = subArgs.indexOf('--file');
    if (fileIdx === -1) {
      console.error('Missing --file');
      process.exit(2);
    }
    const filePath = resolve(subArgs[fileIdx + 1]);
    const content = readFileSync(filePath, 'utf8');
    const result = parseContractYaml(content);

    if (result.valid) {
      console.error(`Contract valid. Definition digest: ${result.definitionDigest}`);
      process.exit(0);
    } else {
      console.error('Contract validation failed:');
      for (const err of result.errors) {
        console.error(`  - ${err}`);
      }
      process.exit(2);
    }
  }

  if (subcommand === 'diff') {
    const baseIdx = subArgs.indexOf('--base-contract');
    const headIdx = subArgs.indexOf('--head-contract');
    if (baseIdx === -1 || headIdx === -1) {
      console.error('Missing --base-contract or --head-contract');
      process.exit(2);
    }

    const baseResult = parseContractYaml(readFileSync(resolve(subArgs[baseIdx + 1]), 'utf8'));
    const headResult = parseContractYaml(readFileSync(resolve(subArgs[headIdx + 1]), 'utf8'));

    if (!baseResult.valid || !headResult.valid) {
      console.error('Invalid contract file');
      process.exit(2);
    }

    const diff = diffContractScope(baseResult.contract!, headResult.contract!);
    const approval = evaluateApprovalRequirements(diff, { requireApprovalForCriticalChanges: true });

    console.error(JSON.stringify({ diff, approval }, null, 2));
    process.exit(diff.weakeningDetected ? 3 : 0);
  }

  console.error(`Unknown contract subcommand: ${subcommand}`);
  process.exit(2);
}

async function handleSemanticDelta(subArgs: string[]): Promise<void> {
  if (subArgs[0] !== 'analyze') {
    console.error('Usage: semantic-delta analyze --base <sha> --head <sha> --contract <file>');
    process.exit(2);
  }

  const baseIdx = subArgs.indexOf('--base');
  const headIdx = subArgs.indexOf('--head');
  const contractIdx = subArgs.indexOf('--contract');
  const jsonMode = subArgs.includes('--json');
  const fixtureIdx = subArgs.indexOf('--fixture');

  if (baseIdx === -1 || headIdx === -1 || contractIdx === -1) {
    console.error('Missing required arguments');
    process.exit(2);
  }

  const baseSha = subArgs[baseIdx + 1];
  const headSha = subArgs[headIdx + 1];
  const contractPath = resolve(subArgs[contractIdx + 1]);
  const content = readFileSync(contractPath, 'utf8');
  const parseResult = parseContractYaml(content);

  if (!parseResult.valid || !parseResult.contract) {
    console.error('Invalid contract');
    process.exit(2);
  }

  const fixtureName = fixtureIdx !== -1 ? subArgs[fixtureIdx + 1] : 'pricing';
  const { baseFn, headFn } = await loadFixture(fixtureName);

  const response = await runAnalysis({
    tenantId: 'local',
    repositoryId: 'changegraph-fixtures',
    baseSha,
    headSha,
    contract: parseResult.contract,
    baseFn,
    headFn,
    maxCases: 50,
  });

  if (jsonMode) {
    console.log(JSON.stringify({
      binding: response.binding,
      policyDecision: response.policyDecision,
      policyReasons: response.policyReasons,
      summary: response.report.summary,
      obligationResults: response.report.obligationResults,
      divergences: response.report.divergences.length,
    }, null, 2));
  } else {
    console.error(`Policy: ${response.policyDecision}`);
    for (const reason of response.policyReasons) {
      console.error(`  ${reason}`);
    }
    console.error(`Allowed relations: ${JSON.stringify(response.report.summary.allowedRelations)}`);
    console.error(`Preserved: ${JSON.stringify(response.report.summary.preserved)}`);
    console.error(`Properties: ${JSON.stringify(response.report.summary.properties)}`);
    console.error(`Unexpected divergences: ${response.report.summary.unexpectedDivergences}`);
  }

  process.exit(response.exitCode);
}

async function handlePassport(subArgs: string[]): Promise<void> {
  const subcommand = subArgs[0];

  if (subcommand === 'verify') {
    const fileIdx = subArgs.indexOf('--file');
    const modeIdx = subArgs.indexOf('--mode');
    if (fileIdx === -1 || modeIdx === -1) {
      console.error('Missing --file or --mode');
      process.exit(2);
    }

    const content = readFileSync(resolve(subArgs[fileIdx + 1]), 'utf8');
    const manifest = parsePassport(content);
    const result = verifyPassport(manifest, subArgs[modeIdx + 1] as 'integrity' | 'replay' | 'proof');

    console.error(JSON.stringify(result, null, 2));
    process.exit(result.valid ? 0 : 1);
  }

  console.error(`Unknown passport subcommand: ${subcommand}`);
  process.exit(2);
}

async function handleMemory(subArgs: string[]): Promise<void> {
  if (subArgs[0] === 'explain') {
    const entryIdx = subArgs.indexOf('--entry');
    if (entryIdx === -1) {
      console.error('Missing --entry');
      process.exit(2);
    }
    const store = new BehavioralMemoryStore();
    const reasons = store.explainInvalidation(subArgs[entryIdx + 1]);
    console.error(JSON.stringify({ entryId: subArgs[entryIdx + 1], reasons }, null, 2));
    process.exit(0);
  }
  process.exit(2);
}

async function handleInteraction(_subArgs: string[]): Promise<void> {
  const { analyzeMergeInteraction } = await import('@changegraph/semantic-delta');
  const { mergeInteractionFixtures } = await import('@changegraph/fixtures');

  const result = analyzeMergeInteraction(mergeInteractionFixtures);
  console.error(JSON.stringify(result, null, 2));
  process.exit(result.compositionViolated ? 1 : 0);
}

async function loadFixture(name: string): Promise<{ baseFn: FunctionFixture; headFn: FunctionFixture }> {
  const fixtures = await import('@changegraph/fixtures');
  switch (name) {
    case 'pricing':
      return { baseFn: fixtures.baseCalculateDiscount, headFn: fixtures.headCalculateDiscount };
    case 'pricing-accidental':
      return { baseFn: fixtures.baseCalculateDiscount, headFn: fixtures.headAccidentalChange };
    case 'pricing-noop':
      return { baseFn: fixtures.baseCalculateDiscount, headFn: fixtures.headNoOp };
    default:
      throw new Error(`Unknown fixture: ${name}`);
  }
}

main();
