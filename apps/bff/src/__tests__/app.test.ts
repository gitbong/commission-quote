import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";

const app = createApp({
  commissionQuoteClient: {
    getQuote: async () => {
      throw new Error("should not be called");
    },
  },
});

describe("GET /healthz", () => {
  describe("GIVEN the app is running", () => {
    describe("WHEN a probe calls it", () => {
      it("THEN it responds 200 ok without calling the vendor", async () => {
        const res = await request(app).get("/healthz");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: "ok" });
      });
    });
  });
});

describe("security headers", () => {
  describe("GIVEN any response", () => {
    describe("WHEN the client calls the API", () => {
      it("THEN helmet headers are set and X-Powered-By is not", async () => {
        const res = await request(app).get("/nope");

        expect(res.headers["x-powered-by"]).toBeUndefined();
        expect(res.headers["x-content-type-options"]).toBe("nosniff");
        expect(res.headers["strict-transport-security"]).toBeDefined();
      });
    });
  });
});
