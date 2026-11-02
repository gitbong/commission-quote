import { z } from "zod";

export const riskBandSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

// Unknown fields are rejected (strict) so clients notice typos early.
export const commissionQuoteRequestSchema = z.strictObject({
  loanAmount: z.number().positive(),
  loanTermInMonths: z.number().int().positive(),
  riskBand: riskBandSchema,
});

export const commissionQuoteResponseSchema = z.object({
  quoteId: z.string(),
  commissionRate: z.number(),
  totalCommission: z.number(),
});

export type RiskBand = z.infer<typeof riskBandSchema>;
export type CommissionQuoteRequest = z.infer<typeof commissionQuoteRequestSchema>;
export type CommissionQuoteResponse = z.infer<typeof commissionQuoteResponseSchema>;
