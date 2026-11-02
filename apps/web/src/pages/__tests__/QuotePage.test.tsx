import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuotePage } from "../QuotePage";
import { createQueryWrapper } from "../../testUtils";
import { theme } from "../../theme/theme";

type User = ReturnType<typeof userEvent.setup>;

const quote = {
  quoteId: "001",
  commissionRate: 0.0275,
  totalCommission: 6875.5,
};

const respond = (status: number, body: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
const errorBody = (
  code: string,
  message: string,
  errors: { field: string; message: string }[] = [],
) => ({ code, message, errors });

const BFF_ERRORS = [
  [
    "502 UPSTREAM_UNAVAILABLE",
    502,
    "UPSTREAM_UNAVAILABLE",
    "The quote service is unavailable. Please try again later.",
  ],
  [
    "429 RATE_LIMITED",
    429,
    "RATE_LIMITED",
    "Too many requests. Please wait a moment and try again.",
  ],
  [
    "504 UPSTREAM_TIMEOUT",
    504,
    "UPSTREAM_TIMEOUT",
    "The quote service took too long. Please try again.",
  ],
  [
    "500 INTERNAL_ERROR",
    500,
    "INTERNAL_ERROR",
    "Something went wrong. Please try again later.",
  ],
] as const;

function renderPage(): User {
  const Wrapper = createQueryWrapper();
  render(
    <Wrapper>
      <ThemeProvider theme={theme}>
        <QuotePage />
      </ThemeProvider>
    </Wrapper>,
  );
  return userEvent.setup();
}

async function fillValidForm(user: User) {
  await user.type(screen.getByLabelText(/loan amount/i), "250000");
  await user.type(screen.getByLabelText(/loan term/i), "360");
  await user.click(screen.getByRole("combobox", { name: /risk band/i }));
  await user.click(await screen.findByRole("option", { name: "Medium" }));
}

const clickGenerate = (user: User) =>
  user.click(screen.getByRole("button", { name: /generate quote/i }));

async function submitValidForm(user: User) {
  await fillValidForm(user);
  await clickGenerate(user);
}

const tryAgain = () => screen.getByRole("button", { name: /try again/i });

const requestBody = (fetchMock: ReturnType<typeof vi.fn>, call = 0) =>
  (fetchMock.mock.calls[call] as unknown as [string, RequestInit])[1].body;

afterEach(() => vi.unstubAllGlobals());

describe("QuotePage", () => {
  describe("GIVEN an invalid form", () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
    });

    describe("WHEN the user submits an empty form", () => {
      it("THEN inline errors are shown, the amount is focused and no request is sent", async () => {
        const user = renderPage();
        await clickGenerate(user);

        expect(
          await screen.findByText(/enter a valid amount, for example 250000/i),
        ).toBeInTheDocument();
        expect(screen.getByText(/whole number of months/i)).toBeInTheDocument();
        expect(screen.getByText(/select a risk band/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/loan amount/i)).toHaveFocus();
        expect(fetchMock).not.toHaveBeenCalled();
      });
    });

    describe.each([
      ["loan amount", "0", /amount must be greater than 0/i],
      ["loan amount", "-5", /enter a valid amount, for example 250000/i],
      ["loan amount", "abc", /enter a valid amount, for example 250000/i],
      ["loan amount", "1e5", /enter a valid amount, for example 250000/i],
      ["loan term", "12.5", /whole number/i],
      ["loan term", "0", /term must be greater than 0/i],
    ])("WHEN the user submits %s %j", (label, value, message) => {
      it("THEN the field error is shown and no request is sent", async () => {
        const user = renderPage();
        await user.type(screen.getByLabelText(new RegExp(label, "i")), value);
        await clickGenerate(user);

        expect(await screen.findByText(message)).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
      });
    });
  });

  describe("GIVEN the BFF responds 201 with a quote", () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      fetchMock = vi.fn(() => respond(201, quote));
      vi.stubGlobal("fetch", fetchMock);
    });

    describe("WHEN the user submits a valid form", () => {
      it("THEN the request carries numbers and the risk band", async () => {
        const user = renderPage();
        await submitValidForm(user);
        await screen.findByText("$6,875.50");

        expect(JSON.parse(requestBody(fetchMock) as string)).toEqual({
          loanAmount: 250000,
          loanTermInMonths: 360,
          riskBand: "MEDIUM",
        });
      });

      it("THEN the formatted quote is shown without an alert", async () => {
        const user = renderPage();
        await submitValidForm(user);

        expect(await screen.findByText("$6,875.50")).toBeInTheDocument();
        expect(screen.getByText("2.75%")).toBeInTheDocument();
        expect(screen.getByText("001")).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });
  });

  describe("GIVEN a form whose values have surrounding whitespace", () => {
    describe("WHEN the user submits it", () => {
      it("THEN the values are trimmed and the request carries numbers", async () => {
        const fetchMock = vi.fn(() => respond(201, quote));
        vi.stubGlobal("fetch", fetchMock);
        const user = renderPage();
        await user.type(screen.getByLabelText(/loan amount/i), "  250000  ");
        await user.type(screen.getByLabelText(/loan term/i), " 360 ");
        await user.click(screen.getByRole("combobox", { name: /risk band/i }));
        await user.click(await screen.findByRole("option", { name: "Medium" }));
        await clickGenerate(user);

        expect(await screen.findByText("$6,875.50")).toBeInTheDocument();
        expect(JSON.parse(requestBody(fetchMock) as string)).toEqual({
          loanAmount: 250000,
          loanTermInMonths: 360,
          riskBand: "MEDIUM",
        });
      });
    });
  });

  describe("GIVEN the BFF has not responded yet", () => {
    let respondLater!: (r: Response) => void;
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      fetchMock = vi.fn(
        () => new Promise<Response>((resolve) => (respondLater = resolve)),
      );
      vi.stubGlobal("fetch", fetchMock);
    });

    describe("WHEN the user has submitted a valid form", () => {
      it("THEN the form is disabled and only one request is sent", async () => {
        const user = renderPage();
        await submitValidForm(user);

        expect(
          await screen.findByRole("button", { name: /generating/i }),
        ).toBeDisabled();
        expect(screen.getByLabelText(/loan amount/i)).toBeDisabled();
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      it("THEN the quote is shown once the BFF responds", async () => {
        const user = renderPage();
        await submitValidForm(user);
        await screen.findByRole("button", { name: /generating/i });

        respondLater(new Response(JSON.stringify(quote), { status: 201 }));

        expect(await screen.findByText("$6,875.50")).toBeInTheDocument();
      });
    });
  });

  describe.each(BFF_ERRORS)(
    "GIVEN the BFF responds %s",
    (_name, status, code, message) => {
      const failingResponse = () => respond(status, errorBody(code, message));

      beforeEach(() => {
        vi.stubGlobal("fetch", failingResponse);
      });

      describe("WHEN the user submits a valid form", () => {
        it("THEN an alert shows the BFF message with a Try again button and no quote", async () => {
          const user = renderPage();
          await submitValidForm(user);

          expect(await screen.findByRole("alert")).toHaveTextContent(message);
          expect(tryAgain()).toBeInTheDocument();
          expect(screen.queryByText("$6,875.50")).not.toBeInTheDocument();
        });
      });

      describe("WHEN the user clicks Try again and the BFF then responds 201", () => {
        it("THEN the same values are sent again and the quote replaces the alert", async () => {
          const fetchMock = vi
            .fn()
            .mockImplementationOnce(failingResponse)
            .mockImplementationOnce(() => respond(201, quote));
          vi.stubGlobal("fetch", fetchMock);
          const user = renderPage();
          await submitValidForm(user);
          await screen.findByRole("alert");

          await user.click(tryAgain());

          expect(await screen.findByText("$6,875.50")).toBeInTheDocument();
          expect(screen.queryByRole("alert")).not.toBeInTheDocument();
          expect(fetchMock).toHaveBeenCalledTimes(2);
          expect(requestBody(fetchMock, 1)).toBe(requestBody(fetchMock, 0));
        });
      });
    },
  );

  describe("GIVEN a quote is shown and the server then becomes unreachable", () => {
    beforeEach(() => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockImplementationOnce(() => respond(201, quote))
          .mockImplementationOnce(() => Promise.reject(new TypeError("fail"))),
      );
    });

    describe("WHEN the user submits again", () => {
      it("THEN the client message is shown and the stale quote is cleared", async () => {
        const user = renderPage();
        await submitValidForm(user);
        await screen.findByText("$6,875.50");

        await clickGenerate(user);

        expect(
          await screen.findByText(/could not reach the server/i),
        ).toBeInTheDocument();
        expect(screen.queryByText("$6,875.50")).not.toBeInTheDocument();
      });
    });
  });
});
