import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "../../api/errors";
import type { QuoteState } from "../../hooks/useCommissionQuote";
import { theme } from "../../theme/theme";
import { QuoteResult } from "../QuoteResult/QuoteResult";

const renderResult = (state: QuoteState, onRetry = vi.fn()) => {
  const view = render(
    <ThemeProvider theme={theme}>
      <QuoteResult state={state} onRetry={onRetry} />
    </ThemeProvider>,
  );
  return { ...view, onRetry };
};

describe("QuoteResult", () => {
  describe("GIVEN the state is idle", () => {
    describe("WHEN the result is rendered", () => {
      it("THEN no card is shown", () => {
        const { container } = renderResult({ status: "idle" });
        expect(
          container.querySelector("[aria-live='polite']"),
        ).toBeEmptyDOMElement();
      });
    });
  });

  describe("GIVEN the state is loading", () => {
    describe("WHEN the result is rendered", () => {
      it("THEN the region is marked busy", () => {
        const { container } = renderResult({ status: "loading" });
        expect(container.querySelector("[aria-live='polite']")).toHaveAttribute(
          "aria-busy",
          "true",
        );
      });
    });
  });

  describe("GIVEN the state is success with a quote", () => {
    const quote = {
      quoteId: "Q-9",
      commissionRate: 0.0275,
      totalCommission: 6875.5,
    };

    describe("WHEN the result is rendered", () => {
      it("THEN the formatted quote is shown", () => {
        renderResult({ status: "success", quote });
        expect(screen.getByText("Total Commission")).toBeInTheDocument();
        expect(screen.getByText("$6,875.50")).toBeInTheDocument();
        expect(screen.getByText("2.75%")).toBeInTheDocument();
        expect(screen.getByText("Q-9")).toBeInTheDocument();
      });
    });

    describe("WHEN the user clicks Copy quote ID", () => {
      it("THEN the quote ID is written to the clipboard", async () => {
        const user = userEvent.setup();
        const writeText = vi
          .spyOn(navigator.clipboard, "writeText")
          .mockResolvedValue();
        renderResult({ status: "success", quote });
        await user.click(
          screen.getByRole("button", { name: /copy quote id/i }),
        );
        expect(writeText).toHaveBeenCalledWith("Q-9");
      });

      it("THEN the tooltip briefly shows Copied", async () => {
        const user = userEvent.setup();
        vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
        renderResult({ status: "success", quote });
        await user.click(
          screen.getByRole("button", { name: /copy quote id/i }),
        );
        expect(await screen.findByRole("tooltip")).toHaveTextContent("Copied");
      });
    });

    describe("WHEN the user clicks Copy quote ID and the clipboard is blocked", () => {
      it("THEN nothing changes and no error is raised", async () => {
        const user = userEvent.setup();
        const writeText = vi
          .spyOn(navigator.clipboard, "writeText")
          .mockRejectedValue(new Error("blocked"));
        renderResult({ status: "success", quote });
        await user.click(
          screen.getByRole("button", { name: /copy quote id/i }),
        );
        expect(writeText).toHaveBeenCalledWith("Q-9");
        expect(screen.queryByText("Copied")).not.toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(screen.getByText("Q-9")).toBeInTheDocument();
      });
    });
  });

  describe("GIVEN the state is an error", () => {
    const error = new ApiError("RATE_LIMITED", "Too many requests.");

    describe("WHEN the result is rendered", () => {
      it("THEN the error message is shown in an alert", () => {
        renderResult({ status: "error", error });
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Too many requests.",
        );
      });
    });

    describe("WHEN the user clicks Try again", () => {
      it("THEN the retry callback is called once", async () => {
        const user = userEvent.setup();
        const { onRetry } = renderResult({ status: "error", error });
        await user.click(screen.getByRole("button", { name: /try again/i }));
        expect(onRetry).toHaveBeenCalledOnce();
      });
    });
  });
});
