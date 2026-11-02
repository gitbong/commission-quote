import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../../errors";
import { HttpCommissionQuoteClient } from "..";

const API_KEY = "test-api-key-123";
const quote = { quoteId: "001", commissionRate: 0.0275, totalCommission: 6875.5 };
const req = { loanAmount: 1000, loanTermInMonths: 12, riskBand: "LOW" as const };

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
const vendorError = (status: number, headers?: Record<string, string>) =>
  json(status, { status, message: "vendor says no", traceId: "trace-xyz", errors: [] }, headers);

const makeClient = (fetchFn: typeof fetch, overrides = {}) =>
  new HttpCommissionQuoteClient({
    baseUrl: "http://vendor.test",
    apiKey: API_KEY,
    timeoutMs: 50,
    retryDelayMs: 1,
    fetch: fetchFn,
    ...overrides,
  });

/** GIVEN a vendor that answers with the queued responses (or errors), in order. */
const sequence = (...responses: Array<Response | Error>) =>
  vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error("unexpected extra call");
    if (next instanceof Error) throw next;
    return next;
  });

const rejection = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (err) {
    return err as AppError;
  }
  throw new Error("expected rejection");
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("HttpCommissionQuoteClient", () => {
  describe("GIVEN the vendor returns 201 with a quote", () => {
    describe("WHEN getQuote is called", () => {
      it("THEN it returns the quote", async () => {
        const fetchFn = sequence(json(201, quote));

        await expect(makeClient(fetchFn as never).getQuote(req)).resolves.toEqual(quote);
      });

      it("THEN it sends the api-key header and the JSON body to the vendor", async () => {
        const fetchFn = sequence(json(201, quote));

        await makeClient(fetchFn as never).getQuote(req);

        const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe("http://vendor.test/api/commission-quotes");
        expect((init.headers as Record<string, string>)["api-key"]).toBe(API_KEY);
        expect(JSON.parse(init.body as string)).toEqual(req);
      });
    });
  });

  describe.each([500, 502, 504])("GIVEN the vendor returns %i then 201", (status) => {
    describe("WHEN getQuote is called", () => {
      it("THEN it retries once and returns the quote", async () => {
        const fetchFn = sequence(vendorError(status), json(201, quote));

        await expect(makeClient(fetchFn as never).getQuote(req)).resolves.toEqual(quote);
        expect(fetchFn).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("GIVEN the vendor keeps returning 502", () => {
    describe("WHEN getQuote is called", () => {
      it("THEN it makes two attempts and rejects with UPSTREAM_UNAVAILABLE", async () => {
        const fetchFn = sequence(vendorError(502), vendorError(502), vendorError(502));

        const err = await rejection(makeClient(fetchFn as never).getQuote(req));

        expect(err.code).toBe("UPSTREAM_UNAVAILABLE");
        expect(fetchFn).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe.each([400, 401])("GIVEN the vendor returns %i", (status) => {
    describe("WHEN getQuote is called", () => {
      it("THEN it does not retry and rejects with 502 UPSTREAM_UNAVAILABLE", async () => {
        const fetchFn = sequence(vendorError(status), json(201, quote));

        const err = await rejection(makeClient(fetchFn as never).getQuote(req));

        expect(err.code).toBe("UPSTREAM_UNAVAILABLE");
        expect(err.status).toBe(502);
        expect(fetchFn).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("GIVEN the vendor returns 429 with a Retry-After above the cap, twice", () => {
    describe("WHEN getQuote is called", () => {
      it("THEN it waits the capped time, retries once and rejects with RATE_LIMITED", async () => {
        vi.useFakeTimers();
        const fetchFn = sequence(
          vendorError(429, { "Retry-After": "30" }),
          vendorError(429, { "Retry-After": "30" }),
        );

        const pending = rejection(makeClient(fetchFn as never).getQuote(req));
        await vi.advanceTimersByTimeAsync(1999);
        expect(fetchFn).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        const err = await pending;

        expect(fetchFn).toHaveBeenCalledTimes(2);
        expect(err.code).toBe("RATE_LIMITED");
        expect(err.status).toBe(429);
      });
    });
  });

  describe("GIVEN the vendor returns 429 with Retry-After: 1 then 201", () => {
    describe("WHEN getQuote is called", () => {
      it("THEN it waits one second before retrying", async () => {
        vi.useFakeTimers();
        const fetchFn = sequence(vendorError(429, { "Retry-After": "1" }), json(201, quote));

        const pending = makeClient(fetchFn as never).getQuote(req);
        await vi.advanceTimersByTimeAsync(999);
        expect(fetchFn).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);

        await expect(pending).resolves.toEqual(quote);
      });
    });
  });

  describe.each([
    ["non-numeric", { "Retry-After": "soon" }],
    ["negative", { "Retry-After": "-5" }],
  ])("GIVEN the vendor returns 429 with a %s Retry-After then 201", (_label, headers) => {
    describe("WHEN getQuote is called", () => {
      it("THEN it waits retryDelayMs before retrying", async () => {
        vi.useFakeTimers();
        const fetchFn = sequence(vendorError(429, headers), json(201, quote));

        const pending = makeClient(fetchFn as never, { retryDelayMs: 500 }).getQuote(req);
        await vi.advanceTimersByTimeAsync(499);
        expect(fetchFn).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);

        await expect(pending).resolves.toEqual(quote);
        expect(fetchFn).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("GIVEN the vendor returns 429 without a Retry-After header then 201", () => {
    describe("WHEN getQuote is called", () => {
      it("THEN it waits retryDelayMs before retrying", async () => {
        vi.useFakeTimers();
        const fetchFn = sequence(vendorError(429), json(201, quote));

        const pending = makeClient(fetchFn as never, { retryDelayMs: 500 }).getQuote(req);
        await vi.advanceTimersByTimeAsync(499);
        expect(fetchFn).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);

        await expect(pending).resolves.toEqual(quote);
        expect(fetchFn).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("GIVEN the vendor returns 503 with a Retry-After header", () => {
    describe("WHEN getQuote is called", () => {
      it("THEN it ignores the header and does not retry", async () => {
        const fetchFn = sequence(vendorError(503, { "Retry-After": "2" }));

        const err = await rejection(makeClient(fetchFn as never).getQuote(req));

        expect(err.code).toBe("UPSTREAM_UNAVAILABLE");
        expect(fetchFn).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("GIVEN the vendor times out on both attempts", () => {
    describe("WHEN getQuote is called", () => {
      it("THEN it retries once and rejects with 504 UPSTREAM_TIMEOUT", async () => {
        const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
        const fetchFn = sequence(timeout, timeout);

        const err = await rejection(makeClient(fetchFn as never).getQuote(req));

        expect(err.code).toBe("UPSTREAM_TIMEOUT");
        expect(err.status).toBe(504);
        expect(fetchFn).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("GIVEN a vendor that never answers", () => {
    describe("WHEN getQuote is called with a short timeout", () => {
      it("THEN it rejects with UPSTREAM_TIMEOUT", async () => {
        const hang = ((_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
          })) as unknown as typeof fetch;

        const err = await rejection(makeClient(hang, { timeoutMs: 10 }).getQuote(req));

        expect(err.code).toBe("UPSTREAM_TIMEOUT");
      });
    });
  });

  describe("GIVEN the network fails on both attempts", () => {
    describe("WHEN getQuote is called", () => {
      it("THEN it retries once and rejects with UPSTREAM_UNAVAILABLE", async () => {
        const fetchFn = sequence(new TypeError("fetch failed"), new TypeError("fetch failed"));

        const err = await rejection(makeClient(fetchFn as never).getQuote(req));

        expect(err.code).toBe("UPSTREAM_UNAVAILABLE");
        expect(fetchFn).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe.each([
    ["a body with the wrong shape", () => json(201, { quoteId: 1 })],
    ["a non-JSON body", () => new Response("<html>", { status: 201 })],
  ])("GIVEN the vendor returns 201 with %s", (_label, makeResponse) => {
    describe("WHEN getQuote is called", () => {
      it("THEN it does not retry and rejects with UPSTREAM_UNAVAILABLE", async () => {
        const fetchFn = sequence(makeResponse(), json(201, quote));

        const err = await rejection(makeClient(fetchFn as never).getQuote(req));

        expect(err.code).toBe("UPSTREAM_UNAVAILABLE");
        expect(fetchFn).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("GIVEN the vendor returns 500 with a non-JSON body then 201", () => {
    describe("WHEN getQuote is called", () => {
      it("THEN it still retries and returns the quote", async () => {
        const fetchFn = sequence(new Response("oops", { status: 500 }), json(201, quote));

        await expect(makeClient(fetchFn as never).getQuote(req)).resolves.toEqual(quote);
        expect(fetchFn).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe.each([
    ["has a traceId", vendorError(401), "trace-xyz"],
    ["has no traceId", json(400, { message: "x" }), undefined],
  ])("GIVEN the vendor error body %s", (_label, response, traceId) => {
    describe("WHEN getQuote is called", () => {
      it("THEN the status and traceId are logged", async () => {
        const fetchFn = sequence(response);

        await rejection(makeClient(fetchFn as never).getQuote(req));

        expect(console.error).toHaveBeenCalledWith(
          `vendor responded with status ${response.status}`,
          { traceId },
        );
      });
    });
  });

  describe("GIVEN the vendor returns 401 with details in its body", () => {
    describe("WHEN getQuote is called", () => {
      it("THEN the rejected error body hides the api-key and vendor details", async () => {
        const fetchFn = sequence(vendorError(401));

        const err = await rejection(makeClient(fetchFn as never).getQuote(req));

        const body = JSON.stringify(err.toBody());
        expect(body).not.toContain(API_KEY);
        expect(body).not.toContain("trace-xyz");
        expect(body).not.toContain("vendor says no");
      });
    });
  });
});
