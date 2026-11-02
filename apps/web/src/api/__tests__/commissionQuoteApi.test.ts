import { createCommissionQuote } from "../commissionQuoteApi";
import { ApiError, NETWORK_ERROR_CODE } from "../errors";

const req = {
  loanAmount: 1000,
  loanTermInMonths: 12,
  riskBand: "LOW",
} as const;

const quote = {
  quoteId: "001",
  commissionRate: 0.0275,
  totalCommission: 27.5,
};

const json = (status: number, body: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );

describe("createCommissionQuote", () => {
  afterEach(() => vi.unstubAllGlobals());

  describe("GIVEN the BFF responds 201 with a valid quote", () => {
    const fetchMock = vi.fn(() => json(201, quote));

    beforeEach(() => vi.stubGlobal("fetch", fetchMock));

    describe("WHEN a quote is requested", () => {
      it("THEN it posts the request as JSON to the BFF", async () => {
        await createCommissionQuote(req);

        expect(fetchMock).toHaveBeenCalledWith(
          "/api/commission-quotes",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify(req),
          }),
        );
      });

      it("THEN it resolves with the quote", async () => {
        await expect(createCommissionQuote(req)).resolves.toEqual(quote);
      });
    });
  });

  describe("GIVEN the BFF responds with an error body", () => {
    beforeEach(() =>
      vi.stubGlobal("fetch", () =>
        json(504, {
          code: "UPSTREAM_TIMEOUT",
          message: "Too slow.",
          errors: [],
        }),
      ),
    );

    describe("WHEN a quote is requested", () => {
      it("THEN it rejects with an ApiError carrying the BFF code and message", async () => {
        await expect(createCommissionQuote(req)).rejects.toMatchObject({
          name: "ApiError",
          code: "UPSTREAM_TIMEOUT",
          message: "Too slow.",
        });
      });
    });
  });

  describe("GIVEN the BFF responds 201 with the wrong shape", () => {
    beforeEach(() => vi.stubGlobal("fetch", () => json(201, { quoteId: 1 })));

    describe("WHEN a quote is requested", () => {
      it("THEN it rejects with the client network error", async () => {
        await expect(createCommissionQuote(req)).rejects.toMatchObject({
          code: NETWORK_ERROR_CODE,
        });
      });
    });
  });

  describe("GIVEN the network request fails", () => {
    beforeEach(() =>
      vi.stubGlobal("fetch", () => Promise.reject(new TypeError("fail"))),
    );

    describe("WHEN a quote is requested", () => {
      it("THEN it rejects with an ApiError", async () => {
        await expect(createCommissionQuote(req)).rejects.toBeInstanceOf(
          ApiError,
        );
      });
    });
  });

  describe("GIVEN the BFF responds with a non-JSON body", () => {
    beforeEach(() =>
      vi.stubGlobal("fetch", () =>
        Promise.resolve(new Response("<html>", { status: 502 })),
      ),
    );

    describe("WHEN a quote is requested", () => {
      it("THEN it rejects with the client network error", async () => {
        await expect(createCommissionQuote(req)).rejects.toMatchObject({
          code: NETWORK_ERROR_CODE,
        });
      });
    });
  });

  describe.each([
    ["an empty object", {}],
    ["a body without a message", { code: "X" }],
    ["a body without a code", { message: "Boom" }],
    ["a non-object body", "oops"],
  ])("GIVEN the BFF responds 500 with %s", (_label, body) => {
    beforeEach(() => vi.stubGlobal("fetch", () => json(500, body)));

    describe("WHEN a quote is requested", () => {
      it("THEN it rejects with the client network error", async () => {
        await expect(createCommissionQuote(req)).rejects.toMatchObject({
          code: NETWORK_ERROR_CODE,
        });
      });
    });
  });
});
