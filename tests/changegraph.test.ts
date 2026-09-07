import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  parseContractYaml,
  evaluatePredicate,
  diffContractScope,
  generateInputCases,
  validateInput,
  computeDigest,
} from '@changegraph/semantic-contract';
import { generateObligations } from '@changegraph/obligations';
import { runAnalysis, analyzeMergeInteraction } from '@changegraph/semantic-delta';
import { exportPassport, verifyPassport } from '@changegraph/attestations';
import { generateBoundaryCases } from '@changegraph/verifier-fuzz';
import { differentialTestIR } from '@changegraph/verifier-symbolic';
import { BehavioralMemoryStore } from '@changegraph/proof-memory';
import {
  baseCalculateDiscount,
  headCalculateDiscount,
  headAccidentalChange,
  headNoOp,
  headInvalidDiscount,
  mergeInteractionFixtures,
} from '@changegraph/fixtures';

const contractPath = resolve('.changegraph/contract.yml');
const contractContent = readFileSync(contractPath, 'utf8');

describe('Contract parsing', () => {
  it('parses the concrete pricing contract', () => {
    const result = parseContractYaml(contractContent);
    expect(result.valid).toBe(true);
    expect(result.contract?.obligations).toHaveLength(4);
    expect(result.definitionDigest).toMatch(/^sha256:/);
  });

  it('rejects invalid YAML', () => {
    const result = parseContractYaml('not: valid: yaml: [');
    expect(result.valid).toBe(false);
  });

  it('rejects duplicate obligation IDs', () => {
    const bad = contractContent.replace('discount-lower-bound', 'premium-discount-relation');
    const result = parseContractYaml(bad);
    expect(result.valid).toBe(false);
  });
});

describe('Predicate evaluation', () => {
  const result = parseContractYaml(contractContent);
  const contract = result.contract!;

  it('evaluates premium discount relation on valid change', () => {
    const obligation = contract.obligations.find((o) => o.id === 'premium-discount-relation')!;
    const input = { subtotalCents: 1000, tier: 'premium' };
    const base = { discountCents: 100 };
    const head = { discountCents: 200 };

    const evalResult = evaluatePredicate(obligation.assert, { input, base, head });
    expect(evalResult.satisfied).toBe(true);
  });

  it('evaluates preservation obligation', () => {
    const obligation = contract.obligations.find((o) => o.id === 'standard-discount-preserved')!;
    const input = { subtotalCents: 1000, tier: 'standard' };
    const base = { discountCents: 50 };
    const head = { discountCents: 50 };

    const evalResult = evaluatePredicate(obligation.assert, { input, base, head });
    expect(evalResult.satisfied).toBe(true);
  });

  it('detects preservation violation', () => {
    const obligation = contract.obligations.find((o) => o.id === 'standard-discount-preserved')!;
    const input = { subtotalCents: 1000, tier: 'standard' };
    const base = { discountCents: 50 };
    const head = { discountCents: 100 };

    const evalResult = evaluatePredicate(obligation.assert, { input, base, head });
    expect(evalResult.satisfied).toBe(false);
  });
});

describe('Scope firewall', () => {
  it('detects deleted preservation obligation', () => {
    const base = parseContractYaml(contractContent).contract!;
    const reduced = {
      ...base,
      obligations: base.obligations.filter((o) => o.id !== 'standard-discount-preserved'),
    };
    const diff = diffContractScope(base, reduced);
    expect(diff.weakeningDetected).toBe(true);
    expect(diff.changes.some((c) => c.kind === 'deleted-obligation')).toBe(true);
  });
});

describe('Obligation generation', () => {
  it('generates stable deterministic obligations', () => {
    const contract = parseContractYaml(contractContent).contract!;
    const obs1 = generateObligations(contract);
    const obs2 = generateObligations(contract);
    expect(obs1.map((o) => o.digest)).toEqual(obs2.map((o) => o.digest));
    expect(obs1).toHaveLength(4);
  });
});

describe('Semantic delta analysis', () => {
  const contract = parseContractYaml(contractContent).contract!;

  it('passes allowed premium discount change', async () => {
    const response = await runAnalysis({
      tenantId: 'test',
      repositoryId: 'fixtures',
      baseSha: 'base123',
      headSha: 'head456',
      contract,
      baseFn: baseCalculateDiscount,
      headFn: headCalculateDiscount,
      maxCases: 30,
    });

    const premiumResult = response.report.obligationResults.find(
      (r) => r.obligationId === 'premium-discount-relation',
    );
    expect(premiumResult?.state).toBe('supported');

    const preserveResult = response.report.obligationResults.find(
      (r) => r.obligationId === 'standard-discount-preserved',
    );
    expect(preserveResult?.state).toBe('supported');
  });

  it('falsifies accidental standard pricing change', async () => {
    const response = await runAnalysis({
      tenantId: 'test',
      repositoryId: 'fixtures',
      baseSha: 'base123',
      headSha: 'head789',
      contract,
      baseFn: baseCalculateDiscount,
      headFn: headAccidentalChange,
      maxCases: 30,
    });

    const preserveResult = response.report.obligationResults.find(
      (r) => r.obligationId === 'standard-discount-preserved',
    );
    expect(preserveResult?.state).toBe('falsified');
    expect(response.exitCode).toBe(1);
  });

  it('fails no-op change for required relation', async () => {
    const response = await runAnalysis({
      tenantId: 'test',
      repositoryId: 'fixtures',
      baseSha: 'base123',
      headSha: 'head000',
      contract,
      baseFn: baseCalculateDiscount,
      headFn: headNoOp,
      maxCases: 30,
    });

    const relationResult = response.report.obligationResults.find(
      (r) => r.obligationId === 'premium-discount-relation',
    );
    expect(relationResult?.state).toBe('falsified');
  });

  it('catches invalid discount via property', async () => {
    const response = await runAnalysis({
      tenantId: 'test',
      repositoryId: 'fixtures',
      baseSha: 'base123',
      headSha: 'headbad',
      contract,
      baseFn: baseCalculateDiscount,
      headFn: headInvalidDiscount,
      maxCases: 30,
    });

    const upperBound = response.report.obligationResults.find(
      (r) => r.obligationId === 'discount-upper-bound',
    );
    expect(upperBound?.state).toBe('falsified');
  });
});

describe('Merge interaction', () => {
  it('detects composition violation when individual PRs pass', () => {
    const result = analyzeMergeInteraction(mergeInteractionFixtures);
    expect(result.prAPasses).toBe(true);
    expect(result.prBPasses).toBe(true);
    expect(result.compositionViolated).toBe(true);
  });
});

describe('Evidence passport', () => {
  it('exports and verifies integrity', async () => {
    const contract = parseContractYaml(contractContent).contract!;
    const response = await runAnalysis({
      tenantId: 'test',
      repositoryId: 'fixtures',
      baseSha: 'base123',
      headSha: 'head456',
      contract,
      baseFn: baseCalculateDiscount,
      headFn: headCalculateDiscount,
      maxCases: 10,
    });

    const passport = exportPassport({
      binding: response.binding,
      contractDefinitionDigest: response.binding.contractDefinitionDigest,
      policyDigest: response.binding.policyDigest,
      executionConfigDigest: response.binding.executionConfigDigest,
      obligationResults: response.report.obligationResults,
      policyDecision: response.policyDecision,
      evidenceLeaves: [],
      completionStatus: 'complete',
    });

    const verification = verifyPassport(passport, 'integrity');
    expect(verification.valid).toBe(true);
  });

  it('detects tampered binding', async () => {
    const contract = parseContractYaml(contractContent).contract!;
    const response = await runAnalysis({
      tenantId: 'test',
      repositoryId: 'fixtures',
      baseSha: 'base123',
      headSha: 'head456',
      contract,
      baseFn: baseCalculateDiscount,
      headFn: headCalculateDiscount,
      maxCases: 5,
    });

    const passport = exportPassport({
      binding: response.binding,
      contractDefinitionDigest: response.binding.contractDefinitionDigest,
      policyDigest: response.binding.policyDigest,
      executionConfigDigest: response.binding.executionConfigDigest,
      obligationResults: response.report.obligationResults,
      policyDecision: response.policyDecision,
      evidenceLeaves: [],
      completionStatus: 'complete',
    });

    passport.binding.headSha = 'tampered';
    const verification = verifyPassport(passport, 'integrity');
    expect(verification.valid).toBe(false);
    expect(verification.errors.some((e) => e.includes('Binding digest'))).toBe(true);
  });
});

describe('Fuzz generation', () => {
  it('generates boundary cases', () => {
    const contract = parseContractYaml(contractContent).contract!;
    const cases = generateBoundaryCases(contract.inputDomain, {
      seed: 42,
      maxCases: 20,
      generatorVersion: 'v1',
    });
    expect(cases.length).toBeGreaterThan(0);
    for (const case_ of cases) {
      const validation = validateInput(case_.input, contract.inputDomain);
      expect(validation.valid).toBe(true);
    }
  });
});

describe('Symbolic IR', () => {
  it('interprets IR matching JavaScript', () => {
    const ir = {
      kind: 'binop' as const,
      op: 'mul' as const,
      left: { kind: 'var' as const, name: 'x' },
      right: { kind: 'int' as const, value: 2 },
    };

    const result = differentialTestIR(
      ir,
      (env: Record<string, number | boolean>) => (env.x as number) * 2,
      [{ x: 0 }, { x: 5 }, { x: 100 }],
    );
    expect(result.failed).toBe(0);
    expect(result.passed).toBe(3);
  });
});

describe('Proof memory', () => {
  it('prevents cross-tenant reuse', () => {
    const store = new BehavioralMemoryStore();
    store.addProof({
      id: 'proof-1',
      tenantId: 'tenant-a',
      repositoryId: 'repo-1',
      subjectDigest: computeDigest('subject') as import('@changegraph/semantic-contract').Digest,
      obligationShapeDigest: computeDigest('shape') as import('@changegraph/semantic-contract').Digest,
      inputDomainDigest: computeDigest('domain') as import('@changegraph/semantic-contract').Digest,
      observableDigest: computeDigest('obs') as import('@changegraph/semantic-contract').Digest,
      comparatorDigest: computeDigest('comp') as import('@changegraph/semantic-contract').Digest,
      normalizerDigest: computeDigest('norm') as import('@changegraph/semantic-contract').Digest,
      verifierVersion: '0.1.0',
      dependencyFingerprint: computeDigest('deps') as import('@changegraph/semantic-contract').Digest,
      state: 'proven',
      evidenceDigest: computeDigest('evidence') as import('@changegraph/semantic-contract').Digest,
      createdAt: new Date().toISOString(),
    });

    const result = store.lookupProofReuse({
      tenantId: 'tenant-b',
      repositoryId: 'repo-1',
      subjectDigest: computeDigest('subject') as import('@changegraph/semantic-contract').Digest,
      obligationShapeDigest: computeDigest('shape') as import('@changegraph/semantic-contract').Digest,
      inputDomainDigest: computeDigest('domain') as import('@changegraph/semantic-contract').Digest,
      observableDigest: computeDigest('obs') as import('@changegraph/semantic-contract').Digest,
      comparatorDigest: computeDigest('comp') as import('@changegraph/semantic-contract').Digest,
      normalizerDigest: computeDigest('norm') as import('@changegraph/semantic-contract').Digest,
      verifierVersion: '0.1.0',
      dependencyFingerprint: computeDigest('deps') as import('@changegraph/semantic-contract').Digest,
    });

    expect(result.eligible).toBe(false);
  });
});

describe('Input domain', () => {
  it('validates integer step alignment', () => {
    const contract = parseContractYaml(contractContent).contract!;
    const result = validateInput({ subtotalCents: 150, tier: 'premium' }, contract.inputDomain);
    expect(result.valid).toBe(false);
  });

  it('generates applicable input cases', () => {
    const contract = parseContractYaml(contractContent).contract!;
    const cases = generateInputCases(contract.inputDomain, { maxCases: 20 });
    expect(cases.length).toBeGreaterThan(0);
    const premiumCases = cases.filter((c) => c.tier === 'premium');
    expect(premiumCases.length).toBeGreaterThan(0);
  });
});
