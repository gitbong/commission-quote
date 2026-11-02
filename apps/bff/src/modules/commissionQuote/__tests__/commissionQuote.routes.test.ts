import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../../app";
import type { CommissionQuoteClient } from "..";

const quote = { quoteId: "001", commissionRate: 0.0275, totalCommission: 6875.5 };
const valid = { loanAmount: 250000, loanTermInMonths: 60, riskBand: "LOW" };

const okClient = () => ({ getQuote: vi.fn(async () => quote) });
const appWith = (client: CommissionQuoteClient) =>
  createApp({ commissionQuoteClient: client });

describe("commissionQuoteRoutes", () => {
  describe("GIVEN a valid request body", () => {
    describe("WHEN the client posts to /api/commission-quotes", () => {
      it("THEN the response is 201 with the quote", async () => {
        const res = await request(appWith(okClient()))
          .post("/api/commission-quotes")
          .send(valid);

        expect(res.status).toBe(201);
        expect(res.body).toEqual(quote);
      });

      it("THEN the service receives the validated request", async () => {
        const client = okClient();

        await request(appWith(client)).post("/api/commission-quotes").send(valid);

        expect(client.getQuote).toHaveBeenCalledWith(valid);
      });
    });
  });

  describe.each([
    ["loanAmount", { ...valid, loanAmount: 0 }],
    ["loanAmount", { ...valid, loanAmount: "100" }],
    ["loanAmount", { ...valid, loanAmount: -5 }],
    ["loanTermInMonths", { ...valid, loanTermInMonths: 1.5 }],
    ["loanTermInMonths", { ...valid, loanTermInMonths: 0 }],
    ["riskBand", { ...valid, riskBand: "EXTREME" }],
    ["riskBand", { loanAmount: 1, loanTermInMonths: 1 }],
  ])("GIVEN an invalid %s", (field, body) => {
    describe("WHEN the client posts to /api/commission-quotes", () => {
      it("THEN the response is 400 VALIDATION_ERROR naming the field", async () => {
        const res = await request(appWith(okClient()))
          .post("/api/commission-quotes")
          .send(body);

        expect(res.status).toBe(400);
        expect(res.body.code).toBe("VALIDATION_ERROR");
        expect(res.body.errors.map((e: { field: string }) => e.field)).toContain(field);
      });

      it("THEN the vendor client is not called", async () => {
        const client = okClient();

        await request(appWith(client)).post("/api/commission-quotes").send(body);

        expect(client.getQuote).not.toHaveBeenCalled();
      });
    });
  });

  describe("GIVEN a body with an unknown field", () => {
    describe("WHEN the client posts to /api/commission-quotes", () => {
      it("THEN the response is 400 VALIDATION_ERROR", async () => {
        const res = await request(appWith(okClient()))
          .post("/api/commission-quotes")
          .send({ ...valid, extra: 1 });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe("VALIDATION_ERROR");
      });
    });
  });
});
