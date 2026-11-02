import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { createCommissionQuote } from "../api/commissionQuoteApi";
import { ApiError, networkError } from "../api/errors";
import type {
  CommissionQuoteRequest,
  CommissionQuoteResponse,
} from "@commission-quote/shared";

export type QuoteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; quote: CommissionQuoteResponse }
  | { status: "error"; error: ApiError };

function toQuoteState<TVariables>(
  mutation: UseMutationResult<CommissionQuoteResponse, ApiError, TVariables>,
): QuoteState {
  switch (mutation.status) {
    case "pending":
      return { status: "loading" };
    case "success":
      return { status: "success", quote: mutation.data };
    case "error":
      return { status: "error", error: mutation.error };
    default:
      return { status: "idle" };
  }
}

export function useCommissionQuote() {
  const controller = useRef<AbortController | null>(null);
  const inFlight = useRef(false);

  const mutation = useMutation<
    CommissionQuoteResponse,
    ApiError,
    { request: CommissionQuoteRequest; signal: AbortSignal }
  >({
    mutationFn: async ({ request, signal }) => {
      try {
        return await createCommissionQuote(request, signal);
      } catch (err) {
        throw err instanceof ApiError ? err : networkError();
      }
    },
    retry: false,
  });

  const { mutateAsync } = mutation;

  useEffect(() => () => controller.current?.abort(), []);

  const submit = useCallback(
    async (request: CommissionQuoteRequest): Promise<ApiError | undefined> => {
      if (inFlight.current) return;
      inFlight.current = true;

      const ctrl = new AbortController();
      controller.current = ctrl;

      try {
        await mutateAsync({ request, signal: ctrl.signal });
        return;
      } catch (err) {
        if (ctrl.signal.aborted) return;
        return err as ApiError;
      } finally {
        inFlight.current = false;
      }
    },
    [mutateAsync],
  );

  return { state: toQuoteState(mutation), submit };
}
