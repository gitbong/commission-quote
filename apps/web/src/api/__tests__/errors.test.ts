import { ApiError, NETWORK_ERROR_CODE, networkError } from "../errors";

describe("errors", () => {
  describe("GIVEN a code and a message", () => {
    describe("WHEN an ApiError is constructed", () => {
      const err = new ApiError("RATE_LIMITED", "Slow down.");

      it("THEN it is an Error", () => {
        expect(err).toBeInstanceOf(Error);
      });

      it("THEN it keeps the name, code and message", () => {
        expect(err).toMatchObject({
          name: "ApiError",
          code: "RATE_LIMITED",
          message: "Slow down.",
        });
      });
    });
  });

  describe("GIVEN the server cannot be reached", () => {
    describe("WHEN a network error is built", () => {
      const err = networkError();

      it("THEN it carries the client-side network error code", () => {
        expect(err.code).toBe(NETWORK_ERROR_CODE);
      });

      it("THEN its message is static, user-friendly content", () => {
        expect(err.message).toMatch(/could not reach the server/i);
      });
    });
  });
});
