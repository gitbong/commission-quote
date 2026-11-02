# AGENT.md

Guidance for AI coding agents working in this repository.

## Project

Commission Quote: a web app where bank lending staff enter loan details and get a commission quote from a third-party vendor API, plus a mock of that vendor API. Built as the foundation of a real app within a 4-hour timebox.

- Requirements: `docs/specs/commission-quote-raw-requirement.md`. **Do not modify this file.**
- Stack decisions, trade-offs and evolution path: `docs/specs/analysis.md`. Read it before making architectural choices, and update it with my permission when a decision changes.
- Specs: `docs/specs/plan.md` is the source of truth for web, BFF and mock vendor behaviour (one section per app, plus Playwright). **Read the spec before working on an app.** Its in-scope and out-of-scope lists are binding; ask before going beyond them. If code and spec disagree, stop and ask which is right.

## Repo layout

npm workspaces (`apps/*`). There is no `packages/` folder.

| Path                | What it is                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `apps/web`          | React 19, Vite, MUI, react-query, react-hook-form. Vitest config lives in `vite.config.ts`. |
| `apps/bff`          | Express 5 + helmet. Config in `src/config.ts`, error types in `src/errors.ts`.              |
| `apps/mock-vendor`  | Express 5 stateful fake of the vendor API.                                                  |
| `apps/shared`       | `@commission-quote/shared`: zod contract (`src/contract.ts`). No build step.                |
| `e2e/`              | Playwright specs. Config: `playwright.config.ts` (starts `npm start`, 1 worker).            |
| `eslint.config.mjs` | Single flat ESLint config at the root. No Prettier.                                         |

Each app has its own `tsconfig.json` (strict, `noUncheckedIndexedAccess`). `e2e/` is outside every tsconfig.

## Architecture (current decision: Node-only)

```
Browser (React + TS, Vite) → Node BFF (Express, TS) → Mock vendor (Express, TS)
```

- BFF layering: routes (transport, validation) → service → `CommissionQuoteClient` interface → `HttpCommissionQuoteClient`. These are in `apps/bff/src/modules/commissionQuote/` (`commissionQuote.routes.ts`, `.service.ts`, `.client.ts`, `httpCommissionQuoteClient.ts`).
- The vendor api-key, timeout, retry and error mapping live **only** in the HTTP client implementation.
- Keep these seams: the `CommissionQuoteClient` interface, thin routes over a thick service layer, one frontend data-access module (`apps/web/src/api/`), shared contract types and zod schemas (`apps/shared`).

## Contract

- Request: `loanAmount`, `loanTermInMonths`, `riskBand` (`LOW` | `MEDIUM` | `HIGH`).
- Response: `quoteId`, `commissionRate`, `totalCommission`.
- Define the schema once (zod) in `apps/shared` and reuse it in the UI, BFF and mock. Web-only schemas (form, API error body) live in `apps/web/src/contract.ts`.

## Rules

- **Security:** the api-key never reaches the browser, logs, error responses or committed files. Read it from environment variables. Commit only `.env.example` files with dummy values.
- **Errors:** map vendor failures (401, 5xx, timeout, network) to safe, user-friendly responses with stable error codes. Never leak vendor details. Only one layer retries.
- **Validation:** validate on both client and BFF with the shared schema. The BFF is authoritative.
- **Mock vendor:** stateful. `PUT /mock/state` with `{ stateId, delay }` picks the response (201, 400, 401, 429, 500, 502, 504) and stays until changed, so tests are deterministic. It does not check the `api-key` header. See the mock vendor section of `docs/specs/plan.md`.
- **BFF errors:** the BFF returns `{ code, message, errors }` with stable codes, defined in `docs/specs/plan.md` (# bff). The web app consumes these codes and must not invent its own.
- **Money:** do not rely on floating-point results for display or comparison without a clear rounding rule.
- **Scope:** do not add features beyond the brief (no persistence, audit, auth or PDF export) without an explicit request.

## Tests

- **Before writing or changing tests, read this section.**
- Unit and integration: Vitest, React Testing Library, supertest.
- E2E: Playwright, small and deterministic, against the real three processes with a controlled mock.
- Put tests in a `__tests__` folder next to the code they cover, for example `src/pages/__tests__/QuotePage.test.tsx`.
- Write titles in GIVEN / WHEN / THEN form: `describe("GIVEN …")` for the setup, a nested `describe("WHEN …")` for the action, and `it("THEN …")` for the expected result.
- Use exactly one root `describe` in each test file, named for the unit under test. Put the GIVEN / WHEN / THEN blocks inside it.
- Table-driven cases use `describe.each("GIVEN … %s")`. One `it("THEN …")` may hold several related expects.
- Module tests go in that module's `__tests__/`. App-level integration tests (through `createApp`) and config tests go in `src/__tests__/`.
- Example:

  ```ts
  describe("HttpCommissionQuoteClient", () => {
    describe.each([400, 401])("GIVEN the vendor returns %i", (status) => {
      describe("WHEN getQuote is called", () => {
        it("THEN it does not retry and rejects with UPSTREAM_UNAVAILABLE", async () => {
          // arrange, act, assert
        });
      });
    });
  });
  ```

- Follow TDD for every behavior change. Write the test first need human review before implementation. run it to confirm it fails for the right reason. Then write the minimum implementation to make it pass, and refactor with the tests green.
- A change is not done until its tests pass. Report failures as they are.
- `web` and `bff` have Vitest suites (`vitest run --coverage`). `mock-vendor` and `shared` have no tests yet.

## Ports and env

| App         | Port | Note                                            |
| ----------- | ---- | ----------------------------------------------- |
| mock-vendor | 5001 | 5000 is taken by macOS AirPlay                  |
| bff         | 3000 |                                                 |
| web         | 5173 | Vite default; proxies `/api` to the BFF on 3000 |

- First run: copy `apps/bff/.env.example` to `apps/bff/.env` (`PORT`, `VENDOR_BASE_URL`, `VENDOR_API_KEY`, `VENDOR_TIMEOUT_MS`). `apps/web/.env.example` has an empty `VITE_API_BASE_URL`.
- `.env` and `.env.*` are gitignored; `.env.example` is the only env file to commit.

## Commands

Run from the repo root. Package manager is **npm**; do not introduce pnpm or yarn.

```
npm ci
npm start             # mock vendor + BFF + web
npm run dev           # same, with watch
npm run lint          # web and bff only
npm run typecheck     # all workspaces
npm test              # all workspaces that define a test script
npm run test:e2e      # also :headed, :ui, :debug, :report
```

## Conventions

- TypeScript strict mode. Match the style of the surrounding code.
- Layout differs per app; follow the app you are in:
  - `mock-vendor`: `src/modules/<name>/<name>.routes.ts`, `.controller.ts`, `.types.ts` and an `index.ts` barrel per module, plus `state/`, `fixtures/`, `utils/`.
  - `bff`: `src/modules/commissionQuote/` as described under Architecture, plus `middleware/`, `config.ts`, `errors.ts`.
  - `web`: `api/`, `hooks/`, `pages/`, `components/`, `lib/`, `locales/`, `theme/`. No barrels.
- Keep the README run instructions accurate whenever scripts or setup change.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<optional scope>): <description>`.
  - Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `build`, `perf`, `style`.
  - Scope is the area changed, for example `web`, `bff`, `mock-vendor`, `contract`, `e2e`, `docs`.
  - Description is imperative, lower case, no trailing period, about 72 characters or fewer. Add a body for the why when it is not obvious.
  - Mark breaking changes with `!` after the type or scope, or a `BREAKING CHANGE:` footer.
  - Examples: `feat(bff): map vendor timeouts to a 504 error`, `test(e2e): cover vendor failure and retry`, `docs: add tech stack analysis`.
