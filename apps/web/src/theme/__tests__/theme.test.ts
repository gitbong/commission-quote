import { createAppTheme } from "../theme";

describe("createAppTheme", () => {
  describe("GIVEN two different source colours", () => {
    describe("WHEN a theme is created from each", () => {
      it("THEN the whole primary palette is derived from the colour", () => {
        const a = createAppTheme("#ff0000").palette.primary;
        const b = createAppTheme("#00aa00").palette.primary;
        expect(a.main).not.toBe(b.main);
        expect(a.dark).not.toBe(b.dark);
        expect(a.contrastText).toBeTruthy();
      });
    });
  });
});
