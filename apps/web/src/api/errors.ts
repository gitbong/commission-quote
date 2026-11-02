import { staticContent } from "../lib/staticContent";

export const NETWORK_ERROR_CODE = "NETWORK_ERROR";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const networkError = () =>
  new ApiError(
    NETWORK_ERROR_CODE,
    staticContent("COMMISSION_QUOTE_NETWORK_ERROR_MESSAGE"),
  );
