import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { theme } from "../../theme/theme";
import { Page } from "../Page";

const renderPage = (children?: React.ReactNode) =>
  render(
    <ThemeProvider theme={theme}>
      <Page title="My Title" desc="My description">
        {children}
      </Page>
    </ThemeProvider>,
  );

describe("Page", () => {
  describe("GIVEN a title and a description", () => {
    describe("WHEN the page is rendered", () => {
      it("THEN the title is the h1 inside a main landmark", () => {
        renderPage();
        expect(screen.getByRole("main")).toBeInTheDocument();
        expect(
          screen.getByRole("heading", { level: 1, name: "My Title" }),
        ).toBeInTheDocument();
      });

      it("THEN the description is in a header", () => {
        renderPage();
        expect(screen.getByRole("banner")).toContainElement(
          screen.getByText("My description"),
        );
      });
    });
  });

  describe("GIVEN child content", () => {
    describe("WHEN the page is rendered", () => {
      it("THEN the children are shown inside the main landmark", () => {
        renderPage(<p>child content</p>);
        expect(screen.getByRole("main")).toContainElement(
          screen.getByText("child content"),
        );
      });
    });
  });
});
