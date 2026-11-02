import { zodResolver } from "@hookform/resolvers/zod";
import { ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, type Resolver } from "react-hook-form";
import {
  quoteFormSchema,
  type QuoteFormInput,
  type QuoteFormOutput,
} from "../../contract";
import { theme } from "../../theme/theme";
import { QuoteForm } from "../QuoteForm";

function Harness({
  loading = false,
  onValid,
}: {
  loading?: boolean;
  onValid: (v: QuoteFormOutput) => void;
}) {
  const { control, handleSubmit } = useForm<
    QuoteFormInput,
    unknown,
    QuoteFormOutput
  >({
    resolver: zodResolver(quoteFormSchema) as Resolver<
      QuoteFormInput,
      unknown,
      QuoteFormOutput
    >,
    defaultValues: { loanAmount: "", loanTermInMonths: "", riskBand: "" },
    mode: "onTouched",
  });
  return (
    <QuoteForm
      control={control}
      onSubmit={handleSubmit(onValid)}
      loading={loading}
    />
  );
}

const setup = (props: Partial<Parameters<typeof Harness>[0]> = {}) => {
  const onValid = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <Harness onValid={onValid} {...props} />
    </ThemeProvider>,
  );
  return { user: userEvent.setup(), onValid };
};

describe("QuoteForm", () => {
  describe("GIVEN an empty form", () => {
    describe("WHEN the form is rendered", () => {
      it("THEN it shows labelled fields and an enabled submit button", () => {
        setup();
        expect(screen.getByLabelText(/loan amount/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/loan term/i)).toBeInTheDocument();
        expect(
          screen.getByRole("combobox", { name: /risk band/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Generate Quote" }),
        ).toBeEnabled();
      });
    });

    describe("WHEN the user types an invalid amount and leaves the field", () => {
      it("THEN the field shows an error and is marked invalid", async () => {
        const { user } = setup();
        await user.type(screen.getByLabelText(/loan amount/i), "abc");
        await user.tab();
        expect(
          await screen.findByText(/enter a valid amount/i),
        ).toBeInTheDocument();
        expect(screen.getByLabelText(/loan amount/i)).toHaveAttribute(
          "aria-invalid",
          "true",
        );
      });
    });

    describe("WHEN the user submits without filling anything", () => {
      it("THEN validation errors are shown and nothing is submitted", async () => {
        const { user, onValid } = setup();
        await user.click(screen.getByRole("button", { name: "Generate Quote" }));
        expect(
          await screen.findByText(/select a risk band/i),
        ).toBeInTheDocument();
        expect(onValid).not.toHaveBeenCalled();
      });
    });

    describe("WHEN the user fills in valid values and submits", () => {
      it("THEN the parsed numbers and risk band are submitted", async () => {
        const { user, onValid } = setup();
        await user.type(screen.getByLabelText(/loan amount/i), "250000.50");
        await user.type(screen.getByLabelText(/loan term/i), "360");
        await user.click(screen.getByRole("combobox", { name: /risk band/i }));
        await user.click(await screen.findByRole("option", { name: "High" }));
        await user.click(screen.getByRole("button", { name: "Generate Quote" }));
        expect(onValid).toHaveBeenCalledOnce();
        expect(onValid.mock.calls[0]![0]).toEqual({
          loanAmount: 250000.5,
          loanTermInMonths: 360,
          riskBand: "HIGH",
        });
      });
    });
  });

  describe("GIVEN the form is loading", () => {
    describe("WHEN the form is rendered", () => {
      it("THEN the fields and the button are disabled", () => {
        setup({ loading: true });
        expect(screen.getByLabelText(/loan amount/i)).toBeDisabled();
        expect(screen.getByLabelText(/loan term/i)).toBeDisabled();
        expect(
          screen.getByRole("button", { name: "Generating…" }),
        ).toBeDisabled();
      });
    });
  });
});
