import {
  commissionQuoteResponseSchema,
  type CommissionQuoteRequest,
  type CommissionQuoteResponse,
} from "@commission-quote/shared";
import { AppError } from "../../errors";
import type { CommissionQuoteClient } from "./commissionQuote.client";

export interface HttpClientOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  /** Delay before the retry when the vendor sends no Retry-After. */
  retryDelayMs?: number;
  /** Upper bound for a Retry-After wait. */
  maxRetryAfterMs?: number;
  fetch?: typeof fetch;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 504]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class HttpCommissionQuoteClient implements CommissionQuoteClient {
  private readonly fetchFn: typeof fetch;
  private readonly retryDelayMs: number;
  private readonly maxRetryAfterMs: number;

  constructor(private readonly options: HttpClientOptions) {
    this.fetchFn = options.fetch ?? fetch;
    this.retryDelayMs = options.retryDelayMs ?? 200;
    this.maxRetryAfterMs = options.maxRetryAfterMs ?? 2000;
  }

  async getQuote(request: CommissionQuoteRequest): Promise<CommissionQuoteResponse> {
    const first = await this.attempt(request);
    if (first.kind === "ok") return first.quote;
    if (!first.retryable) throw first.error;

    await sleep(first.waitMs ?? this.retryDelayMs);

    const second = await this.attempt(request);
    if (second.kind === "ok") return second.quote;
    throw second.error;
  }

  private async attempt(request: CommissionQuoteRequest): Promise<Attempt> {
    let response: Response;
    try {
      response = await this.fetchFn(`${this.options.baseUrl}/api/commission-quotes`, {
        method: "POST",
        headers: { "content-type": "application/json", "api-key": this.options.apiKey },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (err) {
      const timedOut = err instanceof Error && err.name === "TimeoutError";
      console.error("vendor call failed", timedOut ? "timeout" : "network error");
      return fail(new AppError(timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE"), true);
    }

    if (response.status === 201) {
      try {
        const parsed = commissionQuoteResponseSchema.safeParse(await response.json());
        if (parsed.success) return { kind: "ok", quote: parsed.data };
      } catch {
        // fall through: unreadable body is a bad response shape
      }
      console.error("vendor returned an unexpected response shape");
      return fail(new AppError("UPSTREAM_UNAVAILABLE"), false);
    }

    const traceId = await readTraceId(response);
    console.error(`vendor responded with status ${response.status}`, { traceId });

    const retryable = RETRYABLE_STATUS.has(response.status);
    const error = new AppError(response.status === 429 ? "RATE_LIMITED" : "UPSTREAM_UNAVAILABLE");
    return fail(error, retryable, this.retryAfterMs(response));
  }

  private retryAfterMs(response: Response): number | undefined {
    if (response.status !== 429) return undefined;
    const header = response.headers.get("retry-after");
    if (header === null) return undefined;
    const seconds = Number(header);
    if (!Number.isFinite(seconds) || seconds < 0) return undefined;
    return Math.min(seconds * 1000, this.maxRetryAfterMs);
  }
}

type Attempt =
  | { kind: "ok"; quote: CommissionQuoteResponse }
  | { kind: "fail"; error: AppError; retryable: boolean; waitMs?: number | undefined };

const fail = (error: AppError, retryable: boolean, waitMs?: number): Attempt => ({
  kind: "fail",
  error,
  retryable,
  waitMs,
});

async function readTraceId(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "traceId" in body && typeof body.traceId === "string") {
      return body.traceId;
    }
  } catch {
    // body is only used for logging
  }
  return undefined;
}
