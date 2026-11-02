import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import { HttpCommissionQuoteClient } from "../modules/commissionQuote";

// Covers the "vendor responses handling" table in docs/specs/plan.md,
// end to end through POST /api/commission-quotes with a fake vendor.

const quote = { quoteId: "001", commissionRate: 0.0275, totalCommission: 6875.5 };
const valid = { loanAmount: 250000, loanTermInMonths: 360, riskBand: "MEDIUM" };

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
const vendorError = (status: number) =>
  json(
    status,
    { status, message: "vendor says no", traceId: "error-id-001", errors: [] },
    status === 429 ? { "Retry-After": "0" } : {},
  );

/** GIVEN a vendor that answers with the queued responses, in order. */
function appWithVendor(...responses: Response[]) {
  const queue = [...responses];
  const vendor = vi.fn(async () => {
    const next = queue.shift();
    if (!next) throw new Error("unexpected extra vendor call");
    return next;
  });
  const app = createApp({
    commissionQuoteClient: new HttpCommissionQuoteClient({
      baseUrl: "http://vendor.test",
      apiKey: "secret-api-key",
      timeoutMs: 100,
      retryDelayMs: 1,
      fetch: vendor as unknown as typeof fetch,
    }),
  });
  return { app, vendor };
}

const post = (app: ReturnType<typeof createApp>) =>
  request(app).post("/api/commission-quotes").send(valid);

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("POST /api/commission-quotes vendor responses", () => {
  describe("GIVEN the vendor returns 201 with a quote", () => {
    describe("WHEN the client posts a valid request", () => {
      it("THEN the BFF responds 201 with the vendor body passed through", async () => {
        const { app } = appWithVendor(json(201, quote));

        const res = await post(app);

        expect(res.status).toBe(201);
        expect(res.body).toEqual(quote);
      });

      it("THEN the vendor is called once", async () => {
        const { app, vendor } = appWithVendor(json(201, quote));

        await post(app);

        expect(vendor).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe.each([400, 401])("GIVEN the vendor returns %i", (status) => {
    describe("WHEN the client posts a valid request", () => {
      it("THEN the BFF responds 502 UPSTREAM_UNAVAILABLE", async () => {
        const { app } = appWithVendor(vendorError(status), json(201, quote));

        const res = await post(app);

        expect(res.status).toBe(502);
        expect(res.body.code).toBe("UPSTREAM_UNAVAILABLE");
      });

      it("THEN the vendor is not retried", async () => {
        const { app, vendor } = appWithVendor(vendorError(status), json(201, quote));

        await post(app);

        expect(vendor).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe.each([
    [429, 429, "RATE_LIMITED"],
    [500, 502, "UPSTREAM_UNAVAILABLE"],
    [502, 502, "UPSTREAM_UNAVAILABLE"],
    [504, 502, "UPSTREAM_UNAVAILABLE"],
  ])("GIVEN the vendor returns %i twice", (status, bffStatus, code) => {
    describe("WHEN the client posts a valid request", () => {
      it(`THEN the BFF responds ${bffStatus} ${code}`, async () => {
        const { app } = appWithVendor(vendorError(status), vendorError(status), json(201, quote));

        const res = await post(app);

        expect(res.status).toBe(bffStatus);
        expect(res.body.code).toBe(code);
      });

      it("THEN the vendor is retried exactly once", async () => {
        const { app, vendor } = appWithVendor(
          vendorError(status),
          vendorError(status),
          json(201, quote),
        );

        await post(app);

        expect(vendor).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe.each([429, 500, 502, 504])("GIVEN the vendor returns %i then 201", (status) => {
    describe("WHEN the client posts a valid request", () => {
      it("THEN the BFF responds 201 with the quote after the retry", async () => {
        const { app, vendor } = appWithVendor(vendorError(status), json(201, quote));

        const res = await post(app);

        expect(res.status).toBe(201);
        expect(res.body).toEqual(quote);
        expect(vendor).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe.each([400, 401, 429, 500, 502, 504])(
    "GIVEN the vendor keeps failing with %i and details in its body",
    (status) => {
      describe("WHEN the client posts a valid request", () => {
        it("THEN the BFF body has only code, message and errors", async () => {
          const { app } = appWithVendor(vendorError(status), vendorError(status));

          const res = await post(app);

          expect(Object.keys(res.body).sort()).toEqual(["code", "errors", "message"]);
        });

        it("THEN the api-key and vendor details are not exposed", async () => {
          const { app } = appWithVendor(vendorError(status), vendorError(status));

          const res = await post(app);

          const text = JSON.stringify(res.body);
          expect(text).not.toContain("secret-api-key");
          expect(text).not.toContain("vendor says no");
          expect(text).not.toContain("error-id-001");
        });
      });
    },
  );
});
