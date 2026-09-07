import type { InputDomainSchema, Json } from '@changegraph/semantic-contract';
import { validateInput } from '@changegraph/semantic-contract';

export interface ChallengeCase {
  id: string;
  input: Record<string, Json>;
  source: 'explicit' | 'boundary' | 'regression' | 'generated' | 'mutation';
  generatorVersion: string;
  seed: number;
  domainDigest: string;
  split: 'development' | 'regression' | 'holdout';
  disclosed: boolean;
}

export interface FuzzConfig {
  seed: number;
  maxCases: number;
  generatorVersion: string;
}

export function generateBoundaryCases(
  domain: InputDomainSchema,
  config: FuzzConfig,
): ChallengeCase[] {
  const cases: ChallengeCase[] = [];
  let id = 0;

  for (const [name, field] of Object.entries(domain.fields)) {
    if (field.type === 'integer') {
      const base: Record<string, Json> = {};
      for (const [n, f] of Object.entries(domain.fields)) {
        if (f.type === 'integer') base[n] = f.min ?? 0;
        else if (f.type === 'enum') base[n] = f.values![0];
        else if (f.type === 'boolean') base[n] = false;
      }

      if (field.min !== undefined) {
        cases.push(makeCase(++id, { ...base, [name]: field.min }, 'boundary', config));
      }
      if (field.max !== undefined) {
        cases.push(makeCase(++id, { ...base, [name]: field.max }, 'boundary', config));
      }
      if (field.min !== undefined && field.min > 0) {
        cases.push(makeCase(++id, { ...base, [name]: 0 }, 'boundary', config));
      }
    }
    if (field.type === 'enum' && field.values) {
      for (const value of field.values) {
        const base: Record<string, Json> = {};
        for (const [n, f] of Object.entries(domain.fields)) {
          if (f.type === 'enum') base[n] = n === name ? value : f.values![0];
          else if (f.type === 'integer') base[n] = f.min ?? 0;
        }
        cases.push(makeCase(++id, base, 'boundary', config));
      }
    }
  }

  return cases.slice(0, config.maxCases);
}

function makeCase(
  id: number,
  input: Record<string, Json>,
  source: ChallengeCase['source'],
  config: FuzzConfig,
): ChallengeCase {
  return {
    id: `challenge-${id}`,
    input,
    source,
    generatorVersion: config.generatorVersion,
    seed: config.seed,
    domainDigest: JSON.stringify(input),
    split: 'development',
    disclosed: false,
  };
}

export function generateSeededCases(
  domain: InputDomainSchema,
  config: FuzzConfig,
): ChallengeCase[] {
  const cases: ChallengeCase[] = [];
  const rng = seededRandom(config.seed);

  for (let i = 0; i < config.maxCases; i++) {
    const input: Record<string, Json> = {};
    for (const [name, field] of Object.entries(domain.fields)) {
      switch (field.type) {
        case 'integer': {
          const min = field.min ?? 0;
          const max = field.max ?? min + 1000;
          const step = field.step ?? 1;
          const range = Math.floor((max - min) / step);
          input[name] = min + Math.floor(rng() * (range + 1)) * step;
          break;
        }
        case 'enum':
          input[name] = field.values![Math.floor(rng() * field.values!.length)];
          break;
        case 'boolean':
          input[name] = rng() > 0.5;
          break;
      }
    }

    const validation = validateInput(input, domain);
    if (validation.valid) {
      cases.push(makeCase(i + 1, input, 'generated', config));
    }
  }

  return cases;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export class ChallengeCorpus {
  private cases: ChallengeCase[] = [];

  add(case_: ChallengeCase): void {
    this.cases.push(case_);
  }

  getUndisclosed(split: ChallengeCase['split']): ChallengeCase[] {
    return this.cases.filter((c) => c.split === split && !c.disclosed);
  }

  disclose(caseId: string): void {
    const case_ = this.cases.find((c) => c.id === caseId);
    if (case_) {
      case_.disclosed = true;
      case_.split = 'regression';
    }
  }

  all(): ChallengeCase[] {
    return [...this.cases];
  }
}
