# Local Verification Guide

## Prerequisites

- Node.js >= 20
- pnpm 9.x

## Setup

```bash
cd changegraph
pnpm install
cp .env.example .env
```

## Run Tests

```bash
pnpm test
```

## CLI Usage

```bash
# Validate contract
pnpm cli contract validate --file .changegraph/contract.yml

# Run semantic delta analysis
pnpm cli semantic-delta analyze --base abc123 --head def456 --contract .changegraph/contract.yml

# JSON output
pnpm cli semantic-delta analyze --base abc123 --head def456 --contract .changegraph/contract.yml --json

# Test accidental change (should exit 1)
pnpm cli semantic-delta analyze --base abc --head def --contract .changegraph/contract.yml --fixture pricing-accidental

# Verify evidence passport
pnpm cli passport verify --file passport.json --mode integrity

# Merge interaction test
pnpm cli interaction analyze
```

## Web Server

```bash
pnpm dev:web
# Open http://localhost:3000
```

## Worker

```bash
pnpm dev:worker
```

## Exit Codes

- 0: Requirements satisfied
- 1: Required falsification
- 2: Invalid input/configuration
- 3: Incomplete/needs review
- 4: Infrastructure error
