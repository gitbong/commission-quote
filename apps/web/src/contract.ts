import type { RiskBand } from "@commission-quote/shared";
import { z } from "zod";
import { staticContent } from "./lib/staticContent";

// Web-only schemas. The request/response schemas shared with the BFF live in apps/shared.
export const apiErrorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
});

// Form schema: inputs are strings, output is the request the BFF expects.
export const quoteFormSchema = z.object({
  loanAmount: z
    .string()
    .trim()
    .regex(
      /^\d+(\.\d+)?$/,
      staticContent("COMMISSION_QUOTE_LOAN_AMOUNT_INVALID"),
    )
    .transform(Number)
    .pipe(
      z
        .number()
        .positive(staticContent("COMMISSION_QUOTE_LOAN_AMOUNT_NOT_POSITIVE")),
    ),
  loanTermInMonths: z
    .string()
    .trim()
    .regex(/^\d+$/, staticContent("COMMISSION_QUOTE_LOAN_TERM_INVALID"))
    .transform(Number)
    .pipe(
      z
        .number()
        .int()
        .positive(staticContent("COMMISSION_QUOTE_LOAN_TERM_NOT_POSITIVE")),
    ),
  riskBand: z.enum(["LOW", "MEDIUM", "HIGH"], {
    error: staticContent("COMMISSION_QUOTE_RISK_BAND_REQUIRED"),
  }),
});

export type QuoteFormInput = {
  loanAmount: string;
  loanTermInMonths: string;
  riskBand: RiskBand | "";
};
export type QuoteFormOutput = z.output<typeof quoteFormSchema>;
