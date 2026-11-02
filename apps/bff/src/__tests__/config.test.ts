import { describe, expect, it } from "vitest";
import { loadConfig } from "../config";

describe("loadConfig", () => {
  describe.each([
    ["missing", {}],
    ["empty", { VENDOR_API_KEY: "" }],
  ])("GIVEN VENDOR_API_KEY is %s", (_label, env) => {
    describe("WHEN the config is loaded", () => {
      it("THEN it throws", () => {
        expect(() => loadConfig(env)).toThrow("VENDOR_API_KEY is required");
      });
    });
  });

  describe("GIVEN only VENDOR_API_KEY is set", () => {
    describe("WHEN the config is loaded", () => {
      it("THEN defaults are applied", () => {
        expect(loadConfig({ VENDOR_API_KEY: "k" })).toEqual({
          port: 3000,
          vendorBaseUrl: "http://localhost:5001",
          vendorApiKey: "k",
          vendorTimeoutMs: 5000,
        });
      });
    });
  });

  describe.each([
    ["PORT", "abc"],
    ["PORT", "0"],
    ["PORT", "70000"],
    ["PORT", "30.5"],
    ["VENDOR_BASE_URL", "not a url"],
    ["VENDOR_TIMEOUT_MS", "abc"],
    ["VENDOR_TIMEOUT_MS", "0"],
    ["VENDOR_TIMEOUT_MS", "-5"],
    ["VENDOR_TIMEOUT_MS", "1.5"],
  ])("GIVEN %s is %s", (name, value) => {
    describe("WHEN the config is loaded", () => {
      it("THEN it throws and names the variable", () => {
        expect(() => loadConfig({ VENDOR_API_KEY: "k", [name]: value })).toThrow(
          `Invalid configuration: ${name} must be`,
        );
      });
    });
  });

  describe("GIVEN several variables are invalid", () => {
    describe("WHEN the config is loaded", () => {
      it("THEN every problem is listed and no value is echoed", () => {
        const call = () => loadConfig({ PORT: "abc", VENDOR_API_KEY: "" });

        expect(call).toThrow("VENDOR_API_KEY is required");
        expect(call).toThrow("PORT must be");
      });
    });
  });

  describe("GIVEN every variable is set", () => {
    describe("WHEN the config is loaded", () => {
      it("THEN the environment values are used", () => {
        expect(
          loadConfig({
            PORT: "4000",
            VENDOR_BASE_URL: "http://vendor.test",
            VENDOR_API_KEY: "secret",
            VENDOR_TIMEOUT_MS: "1500",
          }),
        ).toEqual({
          port: 4000,
          vendorBaseUrl: "http://vendor.test",
          vendorApiKey: "secret",
          vendorTimeoutMs: 1500,
        });
      });
    });
  });
});
