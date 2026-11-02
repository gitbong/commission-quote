import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { App } from "../App";
import { createQueryWrapper } from "../testUtils";
import { theme } from "../theme/theme";

describe("App", () => {
  describe("GIVEN the query and theme providers", () => {
    const renderApp = () => {
      const QueryWrapper = createQueryWrapper();
      render(
        <QueryWrapper>
          <ThemeProvider theme={theme}>
            <App />
          </ThemeProvider>
        </QueryWrapper>,
      );
    };

    describe("WHEN the app is rendered", () => {
      it("THEN the quote page is shown with its heading and submit button", () => {
        renderApp();

        expect(screen.getByRole("main")).toBeInTheDocument();
        expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /quote/i }),
        ).toBeInTheDocument();
      });
    });
  });
});
