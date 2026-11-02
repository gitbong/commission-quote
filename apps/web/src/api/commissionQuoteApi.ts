import { config } from "../config";
import {
  commissionQuoteResponseSchema,
  type CommissionQuoteRequest,
  type CommissionQuoteResponse,
} from "@commission-quote/shared";
import { apiErrorBodySchema } from "../contract";
import { ApiError, networkError } from "./errors";

export async function createCommissionQuote(
  request: CommissionQuoteRequest,
  signal?: AbortSignal,
): Promise<CommissionQuoteResponse> {
  let res: Response;
  let body: unknown;
  try {
    res = await fetch(`${config.apiBaseUrl}${config.commissionQuotesPath}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
    body = await res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw networkError();
  }

  if (!res.ok) {
    const parsed = apiErrorBodySchema.safeParse(body);
    if (!parsed.success) throw networkError();
    throw new ApiError(parsed.data.code, parsed.data.message);
  }

  const parsed = commissionQuoteResponseSchema.safeParse(body);
  if (!parsed.success) throw networkError();
  return parsed.data;
}
