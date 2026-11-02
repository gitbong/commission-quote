import type { CommissionQuoteRequest, CommissionQuoteResponse } from "@commission-quote/shared";
import type { CommissionQuoteClient } from "./commissionQuote.client";

export const createCommissionQuoteService = (client: CommissionQuoteClient) => ({
  getQuote: (request: CommissionQuoteRequest): Promise<CommissionQuoteResponse> =>
    client.getQuote(request),
});

export type CommissionQuoteService = ReturnType<typeof createCommissionQuoteService>;
