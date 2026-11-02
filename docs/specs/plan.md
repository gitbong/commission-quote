# web

## Behaviour

### Page

- One page (`QuotePage`), no router. A form card with a result card below it.
- The UI never calculates commission. It only formats the numbers the vendor sends (`en-AU`, `AUD`, rate as a percent with up to 2 decimals).

### States

| State   | UI                                                                                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| idle    | Form only. The result area is empty, but the `aria-live="polite"` region stays mounted.                                                                                         |
| loading | Fields and submit button are disabled. The button says "Generating…" with a spinner. The result card shows a skeleton and `aria-busy`.                                          |
| success | Result card shows total commission, commission rate and quote ID. The copy button copies the quote ID and briefly shows "Copied". If the clipboard is blocked, nothing happens. |
| error   | Result card shows an error alert with the message and **Try again**.                                                                                                            |

### Flow

1. Fields start empty and no risk band is selected. Validation runs on blur, then on every change.
2. Submitting invalid values shows inline errors and moves focus to the first invalid field. No request is sent. Rules and messages are in "Form validation".
3. Submitting valid values sends one `POST /api/commission-quotes` with `{loanAmount, loanTermInMonths, riskBand}` (numbers and the enum). The dev server proxies `/api` to the BFF on port `3000`.
4. A second submit while a request is running is ignored.
5. Leaving the page aborts a pending request and nothing is updated.
6. **Try again** sends the same form values again (validated first).
7. A new failure replaces a shown quote. A new success replaces an error.

### Error mapping

- For a BFF error `{code, message}`, the alert shows `message` as it is.
- These all become the client-only code `NETWORK_ERROR` with the fixed message "We could not reach the server. Check your connection and try again.": a network failure, a non-JSON body, an error body without `{code, message}`, or a `2xx` body that fails the response schema.
- The web never retries. The BFF retries once for a timeout, a network error, 429, 500, 502 and 504 (see "Responses handling").
- Not done yet: inline field errors for a BFF `400 VALIDATION_ERROR`, and hiding **Try again** for it. Today it shows as a generic alert.

## Form validation

| Field              | Validation rule                                                                                                                                                 | Error message                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `loanAmount`       | 1. After trim, digits with an optional decimal part (`/^\d+(\.\d+)?$/`). Rejects empty, `abc`, `1e5` and negatives.<br>2. Must be greater than 0 (rejects `0`). | 1. Enter a valid amount, for example 250000<br>2. Amount must be greater than 0 |
| `loanTermInMonths` | 1. After trim, whole digits only (`/^\d+$/`). Rejects empty, decimals, negatives and text.<br>2. Must be greater than 0 (rejects `0`).                          | 1. Enter a whole number of months<br>2. Term must be greater than 0             |
| `riskBand`         | Required. One of `LOW`, `MEDIUM`, `HIGH`. Nothing is selected by default.                                                                                       | Select a risk band                                                              |

# Responses handling

## Vendor > Bff > UI

| Vendor response | BFF response                                  | UI behaviour                                                                       |
| --------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| `201`           | `201`, vendor body passed through             | Shows the quote (rate and total commission)                                        |
| `400`           | `502` `UPSTREAM_UNAVAILABLE` (not retried)    | Alert: "The quote service is unavailable. Please try again later." + **Try again** |
| `401`           | `502` `UPSTREAM_UNAVAILABLE` (not retried)    | Alert: "The quote service is unavailable. Please try again later." + **Try again** |
| `429`           | Retry once, then `429` `RATE_LIMITED`         | Alert: "Too many requests. Please wait a moment and try again." + **Try again**    |
| `500`           | Retry once, then `502` `UPSTREAM_UNAVAILABLE` | Alert: "The quote service is unavailable. Please try again later." + **Try again** |
| `502`           | Retry once, then `502` `UPSTREAM_UNAVAILABLE` | Alert: "The quote service is unavailable. Please try again later." + **Try again** |
| `504`           | Retry once, then `502` `UPSTREAM_UNAVAILABLE` | Alert: "The quote service is unavailable. Please try again later." + **Try again** |

## BFF > UI

| Source                                               | BFF response                        | UI behaviour                                                                                                                           |
| ---------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Vendor does not respond within the BFF timeout       | `504` `UPSTREAM_TIMEOUT`            | Alert: "The quote service took too long. Please try again." + **Try again**                                                            |
| Unexpected BFF failure                               | `500` `INTERNAL_ERROR`              | Alert: "Something went wrong. Please try again later." + **Try again**                                                                 |
| TODO: Invalid request body                           | `400` `VALIDATION_ERROR` + `errors` | Field errors shown inline; other errors in an alert: "The request is invalid. Please check the highlighted fields." (no **Try again**) |
| Unknown route                                        | `404` `NOT_FOUND`                   | Alert: "The requested resource was not found." + **Try again**                                                                         |
| TODO: No response, non-JSON body, or malformed `201` | none                                | Alert: "We could not reach the server. Check your connection and try again." + **Try again**                                           |

# BFF

## Behaviour

- Express service on `PORT` (default `3000`). One endpoint: `POST /api/commission-quotes`. There is also `GET /healthz` for the platform, which returns `200 {"status":"ok"}` and does not call the vendor. Any other route returns `404 NOT_FOUND`. `helmet` sets the security headers.
- The BFF validates the input, calls the vendor, and turns vendor failures into its own error codes.

### Config (env)

| Variable            | Default                 | Notes                                                             |
| ------------------- | ----------------------- | ----------------------------------------------------------------- |
| `PORT`              | `3000`                  |                                                                   |
| `VENDOR_BASE_URL`   | `http://localhost:5001` | The mock vendor locally                                           |
| `VENDOR_API_KEY`    | none                    | Required. Startup fails without it. Sent as the `api-key` header. |
| `VENDOR_TIMEOUT_MS` | `5000`                  | Per vendor attempt                                                |

Config is checked at startup with zod. `PORT` must be an integer from 1 to 65535, `VENDOR_BASE_URL` a URL, and `VENDOR_TIMEOUT_MS` a positive integer. If anything is wrong, startup fails with a message that lists every bad variable. It never prints a value.

### Flow

1. Parse the JSON body. Invalid JSON returns `400 VALIDATION_ERROR` with `errors: [{field: "body", message: "Invalid JSON"}]`.
2. Validate with the strict schema: `loanAmount` > 0, `loanTermInMonths` a positive integer, `riskBand` one of `LOW|MEDIUM|HIGH`. Unknown fields are rejected. A failure returns `400 VALIDATION_ERROR` with one `{field, message}` per issue, and the vendor is not called.
3. Call the vendor `POST /api/commission-quotes` with the validated body and the `api-key` header.
4. If the vendor sends a `201` body that matches `{quoteId, commissionRate, totalCommission}`, return it as `201` unchanged.

### Vendor call

- One retry (two attempts at most) for a timeout, a network failure, `429`, `500`, `502` and `504`. `400`, `401` and a malformed `201` are not retried.
- Wait before the retry: the `Retry-After` seconds for `429` (capped at 2s), otherwise 200ms.
- Uses the built-in `fetch` with `AbortSignal.timeout(VENDOR_TIMEOUT_MS)`. The vendor response is checked with the zod schema, and a mismatch counts as a vendor failure.
- Vendor errors are logged on the server (status and `traceId`). Never put a vendor `message`, `traceId` or body in a response, and never log the api-key.

### Error body

`{code, message, errors[]}`. `message` is a fixed text per code, and the UI shows it as it is. `errors` holds field errors for `VALIDATION_ERROR` and is empty for everything else.

| Code                   | Status | Cause                                                                   |
| ---------------------- | ------ | ----------------------------------------------------------------------- |
| `VALIDATION_ERROR`     | `400`  | Invalid JSON or request body                                            |
| `NOT_FOUND`            | `404`  | Unknown route                                                           |
| `RATE_LIMITED`         | `429`  | Vendor `429` after the retry                                            |
| `INTERNAL_ERROR`       | `500`  | Any unexpected error                                                    |
| `UPSTREAM_UNAVAILABLE` | `502`  | Vendor `4xx`/`5xx` (other than `429`), network failure, malformed `201` |
| `UPSTREAM_TIMEOUT`     | `504`  | Vendor timeout after the retry                                          |

If the vendor itself sends a status (even `504`), the BFF returns `502`. The BFF `504 UPSTREAM_TIMEOUT` is only for when the vendor does not answer within the BFF timeout.

# mock vendor

A stateful mock server for local development and e2e tests.

## Switch response for local development or e2e testing

Pick the next response with `PUT /mock/state` (default port `5001`, optional `delay` in ms). The state stays until you change it. Then call `POST /api/commission-quotes`.

| Status | Mock vendor response                                                                                          | Shell command to switch the response                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `201`  | `{"quoteId":"001","commissionRate":0.0275,"totalCommission":6875.5}`                                          | `curl -X PUT localhost:5001/mock/state -H 'Content-Type: application/json' -d '{"stateId":"201"}'` |
| `400`  | `{"status":400,"message":"Invalid request payload","traceId":"error-id-001","errors":[]}`                     | `curl -X PUT localhost:5001/mock/state -H 'Content-Type: application/json' -d '{"stateId":"400"}'` |
| `401`  | `{"status":401,"message":"Missing or invalid credentials","traceId":"error-id-002","errors":[]}`              | `curl -X PUT localhost:5001/mock/state -H 'Content-Type: application/json' -d '{"stateId":"401"}'` |
| `429`  | `{"status":429,"message":"Too many requests","traceId":"error-id-003","errors":[]}` + header `Retry-After: 1` | `curl -X PUT localhost:5001/mock/state -H 'Content-Type: application/json' -d '{"stateId":"429"}'` |
| `500`  | `{"status":500,"message":"Unexpected error","traceId":"error-id-004","errors":[]}`                            | `curl -X PUT localhost:5001/mock/state -H 'Content-Type: application/json' -d '{"stateId":"500"}'` |
| `502`  | `{"status":502,"message":"Invalid response from upstream","traceId":"error-id-005","errors":[]}`              | `curl -X PUT localhost:5001/mock/state -H 'Content-Type: application/json' -d '{"stateId":"502"}'` |
| `504`  | `{"status":504,"message":"Upstream did not respond in time","traceId":"error-id-006","errors":[]}`            | `curl -X PUT localhost:5001/mock/state -H 'Content-Type: application/json' -d '{"stateId":"504"}'` |

# Playwright

## Setup

- Runs against the three real processes (`npm start`: mock vendor `5001`, BFF `3000`, web `5173`). Base URL is `http://localhost:5173`. The browser network is not mocked.
- Before each test, reset the vendor: `PUT localhost:5001/mock/state` with `{"stateId":"201"}`.
- Find elements by role or label, using the text in `apps/web/src/locales/en.json`: fields "Loan amount", "Loan term", "Risk band", button "Generate Quote", copy button "Copy quote ID".
- Result checks use a longer timeout (10s), because the BFF may wait for a retry.

## Scenarios

### 1. Happy path: quote is generated

- GIVEN the vendor is in state `201`
- WHEN the user fills Loan amount `250000`, Loan term `360`, Risk band `Medium`, and clicks **Generate Quote**
- THEN the button shows "Generating…" and the fields are disabled while the request runs
- AND the "Quote details" card shows Total Commission `$6,875.50`, Commission Rate `2.75%` and Quote ID `001`
- AND no error alert is shown.

### 2. Vendor keeps failing with `500`, then recovers

- GIVEN the vendor is in state `500`
- WHEN the user submits valid values
- THEN after the BFF retry an error alert shows "The quote service is unavailable. Please try again later." with **Try again**, no quote is shown, and no vendor detail (`Unexpected error`, `error-id-004`) is visible
- WHEN the vendor is switched to `201` and the user clicks **Try again**
- THEN the quote from scenario 1 is shown and the alert is gone.

## TODOs

### Authentication and Authorization

Not implemented yet. Need more tech details to make decisions.

### Logging

Not implemented yet. Decisions so far:

- Both apps get a small `Logger` wrapper of their own (`trace`, `debug`, `info`, `warn`, `error`, `child`). No logging library for now, so a backend such as pino can be swapped in one file later.
- Levels: TRACE < DEBUG < INFO < WARN < ERROR. Production allows ERROR, WARN and INFO.
- Correlation header `x-correlation-id`: the web creates one per submit. The BFF accepts a valid one or makes its own, logs it, returns it in the response and forwards it to the vendor.
- Never log the api-key, request or response bodies, form values or the quote.

### CI

Not implemented yet. The plan is a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs on push to `main` and on pull requests (Node 24, `npm ci` with npm cache):

- `test` job: `npm run typecheck`, `npm test`, `npm run build -w apps/web`, `npm audit --omit=dev`.
- `e2e` job (after `test`): `npx playwright install --with-deps chromium`, then `npm run test:e2e` with a dummy `VENDOR_API_KEY` (the mock vendor does not check it). Upload `playwright-report` if it fails.
- `SATST` job: placeholder
- `SCA` job: placeholder
- `docker` job (after all checks pass): build each image target

### Docker

Not implemented yet. The plan is a root `Dockerfile` with two targets.

- `bff`: runs as non-root, built with `apps/shared` included, with a `HEALTHCHECK` on `GET /healthz`. Settings come from env (`VENDOR_BASE_URL`, `VENDOR_API_KEY`).
- `web`: `vite build` served by nginx. nginx also routes `/api/` to the BFF, so the browser sees one origin and the BFF needs no CORS. nginx sets a CSP and security headers.

### CD

Not implemented yet. There is no deployment target in the brief, so this is an outline. A `deploy` job runs only on `main`, after the CI jobs and the `docker` job pass:

- Push the `bff` and `web` images to ECR, then deploy them to ECS.
- The BFF gets `VENDOR_API_KEY` from Secrets Manager. It is never baked into an image.

### Clean up code

Not done yet. The 4-hour timebox was enough to meet the requirements and review, but not to refactor the code as well. A clean-up pass is still needed.
