import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app";
import { AppError } from "../../errors";
import type { CommissionQuoteClient } from "../../modules/commissionQuote";

const valid = { loanAmount: 1000, loanTermInMonths: 12, riskBand: "LOW" };
const unusedClient: CommissionQuoteClient = {
  getQuote: async () => {
    throw new Error("should not be called");
  },
};
const appWith = (client: CommissionQuoteClient) =>
  createApp({ commissionQuoteClient: client });

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("errorHandler", () => {
  describe("GIVEN the client throws an AppError", () => {
    describe("WHEN the client posts a valid request", () => {
      it("THEN the response uses the error's status and fixed message", async () => {
        const client: CommissionQuoteClient = {
          getQuote: async () => {
            throw new AppError("UPSTREAM_TIMEOUT");
          },
        };

        const res = await request(appWith(client))
          .post("/api/commission-quotes")
          .send(valid);

        expect(res.status).toBe(504);
        expect(res.body).toEqual({
          code: "UPSTREAM_TIMEOUT",
          message: "The quote service took too long. Please try again.",
          errors: [],
        });
      });
    });
  });

  describe.each([
    ["an Error", new Error("secret detail"), "secret detail"],
    ["a non-Error value", "boom", "boom"],
  ])("GIVEN the client throws %s", (_label, thrown, secret) => {
    describe("WHEN the client posts a valid request", () => {
      it("THEN the response is 500 INTERNAL_ERROR without the details", async () => {
        const client: CommissionQuoteClient = {
          getQuote: async () => {
            throw thrown;
          },
        };

        const res = await request(appWith(client))
          .post("/api/commission-quotes")
          .send(valid);

        expect(res.status).toBe(500);
        expect(res.body.code).toBe("INTERNAL_ERROR");
        expect(JSON.stringify(res.body)).not.toContain(secret);
      });
    });
  });

  describe("GIVEN a request body that is not valid JSON", () => {
    describe("WHEN the client posts it", () => {
      it("THEN the response is 400 with a body field error", async () => {
        const res = await request(appWith(unusedClient))
          .post("/api/commission-quotes")
          .set("content-type", "application/json")
          .send("{bad");

        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual([
          { field: "body", message: "Invalid JSON" },
        ]);
      });
    });
  });

  describe("GIVEN a request body that is not an object", () => {
    describe("WHEN the client posts it", () => {
      it("THEN the response is 400 VALIDATION_ERROR on the body field", async () => {
        const res = await request(appWith(unusedClient))
          .post("/api/commission-quotes")
          .set("content-type", "application/json")
          .send("[]");

        expect(res.status).toBe(400);
        expect(res.body.code).toBe("VALIDATION_ERROR");
        expect(res.body.errors[0].field).toBe("body");
      });
    });
  });

  describe.each([
    ["GET", "/api/commission-quotes"],
    ["GET", "/nope"],
  ])("GIVEN an unknown route (%s %s)", (method, path) => {
    describe("WHEN the client calls it", () => {
      it("THEN the response is 404 NOT_FOUND in the error shape", async () => {
        const res = await request(appWith(unusedClient))[
          method.toLowerCase() as "get"
        ](path);

        expect(res.status).toBe(404);
        expect(res.body.code).toBe("NOT_FOUND");
        expect(res.body.errors).toEqual([]);
      });
    });
  });
});
