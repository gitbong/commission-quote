import type { CommissionQuoteRequest, CommissionQuoteResponse } from "@commission-quote/shared";

export interface CommissionQuoteClient {
  getQuote(request: CommissionQuoteRequest): Promise<CommissionQuoteResponse>;
}
