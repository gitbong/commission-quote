import { act, renderHook, waitFor } from "@testing-library/react";
import { ApiError, NETWORK_ERROR_CODE } from "../../api/errors";
import { createQueryWrapper } from "../../testUtils";
import { useCommissionQuote } from "../useCommissionQuote";

const req = {
  loanAmount: 1000,
  loanTermInMonths: 12,
  riskBand: "LOW",
} as const;
const ok = { quoteId: "Q-1", commissionRate: 0.03, totalCommission: 30 };
const json = (status: number, body: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );

afterEach(() => vi.unstubAllGlobals());

const renderQuoteHook = () =>
  renderHook(() => useCommissionQuote(), { wrapper: createQueryWrapper() });

describe("useCommissionQuote", () => {
  describe("GIVEN the BFF responds 201 with a quote", () => {
    beforeEach(() => vi.stubGlobal("fetch", () => json(201, ok)));

    describe("WHEN a quote is submitted", () => {
      it("THEN the state starts idle and ends in success", async () => {
        const { result } = renderQuoteHook();
        expect(result.current.state).toEqual({ status: "idle" });
        await act(async () => {
          expect(await result.current.submit(req)).toBeUndefined();
        });
        await waitFor(() =>
          expect(result.current.state).toEqual({
            status: "success",
            quote: ok,
          }),
        );
      });
    });
  });

  describe("GIVEN the BFF has not responded yet", () => {
    let resolve!: (r: Response) => void;
    beforeEach(() =>
      vi.stubGlobal("fetch", () => new Promise<Response>((r) => (resolve = r))),
    );

    describe("WHEN a quote is submitted", () => {
      it("THEN the state goes through loading to success", async () => {
        const { result } = renderQuoteHook();
        let pending!: Promise<unknown>;
        act(() => {
          pending = result.current.submit(req);
        });
        await waitFor(() =>
          expect(result.current.state.status).toBe("loading"),
        );
        await act(async () => {
          resolve(new Response(JSON.stringify(ok), { status: 201 }));
          await pending;
        });
        await waitFor(() =>
          expect(result.current.state.status).toBe("success"),
        );
      });
    });
  });

  describe("GIVEN the BFF responds 504 UPSTREAM_TIMEOUT", () => {
    beforeEach(() =>
      vi.stubGlobal("fetch", () =>
        json(504, { code: "UPSTREAM_TIMEOUT", message: "Slow.", errors: [] }),
      ),
    );

    describe("WHEN a quote is submitted", () => {
      it("THEN the ApiError is returned and stored in the state", async () => {
        const { result } = renderQuoteHook();
        let error: ApiError | undefined;
        await act(async () => {
          error = await result.current.submit(req);
        });
        expect(error?.code).toBe("UPSTREAM_TIMEOUT");
        await waitFor(() =>
          expect(result.current.state).toMatchObject({
            status: "error",
            error: { code: "UPSTREAM_TIMEOUT" },
          }),
        );
      });
    });
  });

  describe("GIVEN the request fails unexpectedly", () => {
    beforeEach(() =>
      vi.stubGlobal("fetch", () => Promise.reject(new TypeError("fail"))),
    );

    describe("WHEN a quote is submitted", () => {
      it("THEN the failure is mapped to the network error", async () => {
        const { result } = renderQuoteHook();
        await act(async () => {
          await result.current.submit(req);
        });
        await waitFor(() =>
          expect(result.current.state).toMatchObject({
            status: "error",
            error: { code: NETWORK_ERROR_CODE },
          }),
        );
      });
    });
  });

  describe("GIVEN a submit is already in flight", () => {
    let resolve!: (r: Response) => void;
    const fetchMock = vi.fn(
      () => new Promise<Response>((r) => (resolve = r)),
    );
    beforeEach(() => {
      fetchMock.mockClear();
      vi.stubGlobal("fetch", fetchMock);
    });

    describe("WHEN a second submit is made", () => {
      it("THEN it is ignored and only one request is sent", async () => {
        const { result } = renderQuoteHook();
        let first!: Promise<unknown>;
        act(() => {
          first = result.current.submit(req);
          void result.current.submit(req);
        });
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        await act(async () => {
          resolve(new Response(JSON.stringify(ok), { status: 201 }));
          await first;
        });
      });
    });
  });

  describe("GIVEN a request is pending", () => {
    let signal: AbortSignal | undefined;
    beforeEach(() => {
      signal = undefined;
      vi.stubGlobal("fetch", (_url: string, init: RequestInit) => {
        signal = init.signal ?? undefined;
        return new Promise<Response>((_res, rej) =>
          signal?.addEventListener("abort", () =>
            rej(new DOMException("aborted", "AbortError")),
          ),
        );
      });
    });

    describe("WHEN the component unmounts", () => {
      it("THEN the request is aborted without updating state", async () => {
        const { result, unmount } = renderQuoteHook();
        let pending!: Promise<unknown>;
        act(() => {
          pending = result.current.submit(req);
        });
        await waitFor(() => expect(signal).toBeDefined());
        unmount();
        expect(signal?.aborted).toBe(true);
        await expect(pending).resolves.toBeUndefined();
      });
    });
  });
});
