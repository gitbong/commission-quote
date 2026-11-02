# Analysis

This file is the "why": open questions, the stack decision, trade-offs and the evolution path. What is built is in [plan.md](plan.md).

## Open Questions:

- This is a stand-alone repo. How is it embedded in the Lending Platform?
  - iframe?
  - web component?

- What is the quote used for once the user has it?
  - Export it as PDF?
  - Link it to an existing loan application?
  - Just a quick commission check from loan amount, loan term and risk band?

- Do we need a record of who requested which quote, when, and with what inputs?

- Currency is AUD only ?

- Is Loan Term a free input box ? are there any fix Team options liks 12, 24, 36?

- How authentication is handled?
  - Assuming the user logs in to the Lending Platform first.

- How authorization is handled ?
  - commission quote is used for particular user group ?

- What is the road map of this app?
  - It will help decide on Java and GraphQL.

## Tech Stacks

### Decision

Node-only for now. No Java service and no GraphQL yet. Both are covered below as the evolution path.

```
Browser (React + TS, Vite)
   │  REST
Node.js BFF (TS)  ── owns api-key, vendor client, timeout, retry, error mapping
   │  REST + api-key header
Mock vendor API (Node/TS)  ── stateful, response set by PUT /mock/state
```

Why: the brief has one mutation (3 request fields, 3 response fields), no persistence, no audit, no workflow, and a 4-hour timebox. A Java service would only forward one request.

**Why not build for expandability now.** Expandability comes from clean seams, not from extra technology. Building Java or GraphQL now costs the full price and still guesses at needs we don't know yet (persistence, audit, aggregation). So we build only the cheap seams:

- `CommissionQuoteClient` interface with the HTTP version behind it. This is the seam for a Java service. The api-key, timeout, retry and error mapping live only there.
- Thin routes over a thick service layer. This is the seam for GraphQL.
- One frontend data-access module, so a data-layer change touches one place.
- Shared types and zod schemas, so the request shape is defined once.

### Stack

| Layer                    | Choice                                                                   | Why                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend                 | React + TypeScript (Vite), React Hook Form + zod                         | In the brief. The lightest way to ship a form with loading and error states.                                                                                                |
| BFF                      | Node.js + TypeScript + Express, REST                                     | In the brief. Keeps the api-key off the browser, the core security need.                                                                                                    |
| Mock vendor              | Node/TS + Express (same as the BFF, so one set of idioms and test tools) | Throwaway stand-in. State-driven, so any vendor response can be reproduced on demand (see plan.md).                                                                         |
| Contract                 | Shared types and zod schemas                                             | The request shape is defined once and used by UI, BFF and mock.                                                                                                             |
| Unit / integration tests | Vitest, React Testing Library, supertest                                 | Fast, run on every change.                                                                                                                                                  |
| E2E tests                | Playwright                                                               | Real browser, real BFF, mock vendor. Checks the wiring that unit tests mock out.                                                                                            |
| Run                      | npm workspaces, one-command startup, README                              | Three processes, one toolchain. npm ships with Node, so no extra install. pnpm is a possible switch later (needs `corepack enable`, a `packageManager` pin and CI changes). |

### E2E testing (Playwright)

Keep the suite small and deterministic. Unit and integration tests carry the detailed cases. Scenarios and setup are in [plan.md](plan.md). E2E does not cover a missing or invalid api-key, because the browser never sees the key. That is tested at the BFF level with supertest.

### CI/CD (GitHub Actions)

The CI jobs are in [plan.md](plan.md) (CI TODO). The workflow follows these rules:

- **Same commands as local.** CI runs the npm scripts from the README, so CI also checks the README steps.
- **Pinned and cached.** Pinned Node version, lockfile respected, dependency cache on.
- **Least privilege.** `permissions: contents: read`, and `concurrency` cancels superseded runs.
- **No real secrets.** The api-key is a dummy value in workflow `env`. A real vendor key would be a repository or environment secret and never printed.
- **Dependency hygiene.** Dependabot for npm and GitHub Actions, and `npm audit --omit=dev` as a non-blocking step.

**CD** is deferred. The brief has no deployment target, so the pipeline stops at a verified build. When a target exists, add a `deploy` job as described in Stage 3.

### Trade-off: no Java / Spring Boot now

|                   |                                                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Gains             | Fewer moving parts, one toolchain, no extra hop, one timeout/retry layer, easy for reviewers to run, more time for tests and the README.      |
| Costs             | No Java shown. The vendor credential sits in the page-facing tier. Less reuse across channels. No home yet for persistence, audit or Camunda. |
| Add it when       | Quotes must be stored or audited, an approval workflow appears, there are several vendors or channels, or the bank requires Java services.    |
| Cost to add later | About 1 to 2 days plus CI/CD and infrastructure. Mostly mechanical, since the client interface already exists.                                |

Node can do everything this brief needs. Java is an organisation and ecosystem choice (bank standard), not a capability gap.

### Trade-off: no GraphQL now

|                   |                                                                                                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gains             | REST with one mutation and three response fields. No schema, resolvers, codegen, client cache or complexity limits. Simpler errors and tests.                                                               |
| Costs             | Later page-level aggregation needs more endpoints or a new layer. The GraphQL skill is not shown.                                                                                                           |
| Add it when       | A page combines several sources (quote, loan application, customer), or several clients need different field sets.                                                                                          |
| Cost to add later | About 2 to 4 days: server, schema and resolvers, error mapping, auth context, DataLoader, depth/complexity limits, tests. The frontend is the bigger risk, and stays small if data access is in one module. |
| Risk of deferring | The brief lists GraphQL, so it may be expected. Covered by the evolution path and the optional stretch below.                                                                                               |
| Error-model note  | REST status codes make the key failures (invalid input, timeout, vendor 5xx, missing api-key) simple and visible. GraphQL returns HTTP 200 with an `errors` array, which is harder to get right.            |

### Evolution path

Each stage starts from a real need, and the UI contract stays stable where possible. The seams in the Decision section keep the later stages cheap.

**Optional stretch, only if the core is finished and tested:** a small read-only GraphQL query on the BFF is the cheapest way to show GraphQL. A Java service comes last, and only if the core is complete. The quote mutation stays on REST.

**Stage 0 (now)**

```
Browser → Node BFF (vendor client) → Vendor / Mock
```

**Stage 1: Java quote-service** (trigger: persistence/audit, workflow, several vendors or channels, or a platform mandate; about 1 to 2 days)

```
Browser → Node BFF → Spring Boot quote-service → Vendor
```

- Move `CommissionQuoteClient` and the domain logic into a Spring Boot service. It owns the api-key, timeout and retry (for example Resilience4j), persistence, audit and later Camunda.
- The BFF swaps its vendor client for an HTTP client to the quote-service. The UI doesn't change.
- Remove retry from the BFF, so only one layer retries.

**Stage 2: GraphQL** (trigger: a page combines several sources, or several clients need different data shapes; about 2 to 4 days)

```
Browser ──REST (quote mutation)──→ Node BFF ──→ quote-service
        └─GraphQL (page aggregation)─┘
```

- Add a GraphQL endpoint next to REST in the BFF. Resolvers call the same service layer.
- REST stays for the quote mutation.

**Stage 3: workflow and cloud** (trigger: approval rules appear, or production deployment on the bank's cloud)

- Camunda for approval flows, hosted in the Java service.
- AWS: Docker images (see plan.md, Docker TODO), Secrets Manager for the api-key, ALB, CloudWatch. The `deploy` job runs only on `main` after CI passes. It signs in to AWS with GitHub OIDC (no long-lived keys), pushes to ECR and deploys to ECS.
