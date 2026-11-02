import en from "../../locales/en.json";
import { staticContent } from "../staticContent";

describe("staticContent", () => {
  describe("GIVEN a content key", () => {
    describe("WHEN the text is looked up", () => {
      it("THEN the text for that key is returned", () => {
        expect(staticContent("COMMISSION_QUOTE_PAGE_HEADER")).toBe(
          "Commission Quote",
        );
        expect(staticContent("COMMISSION_QUOTE_SUBMIT_BUTTON_LABEL")).toBe(
          "Generate Quote",
        );
      });
    });
  });

  describe("GIVEN the English content file", () => {
    describe("WHEN every entry is inspected", () => {
      it("THEN each has non-empty text and a COMMISSION_QUOTE_ upper-snake key", () => {
        for (const [key, value] of Object.entries(en)) {
          expect(key).toMatch(/^COMMISSION_QUOTE_[A-Z0-9_]+$/);
          expect(value.trim()).not.toBe("");
        }
      });
    });
  });
});
