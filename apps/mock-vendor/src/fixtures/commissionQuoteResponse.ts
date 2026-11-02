import type { ErrorBody } from "../modules/commissionQuote";

export const commissionQuote201 = {
  quoteId: "001",
  commissionRate: 0.0275,
  totalCommission: 6875.5,
};

export const commissionQuote400: ErrorBody = {
  status: 400,
  message: "Invalid request payload",
  traceId: "error-id-001",
  errors: [],
};

export const commissionQuote401: ErrorBody = {
  status: 401,
  message: "Missing or invalid credentials",
  traceId: "error-id-002",
  errors: [],
};

export const commissionQuote429: ErrorBody = {
  status: 429,
  message: "Too many requests",
  traceId: "error-id-003",
  errors: [],
};

export const commissionQuote500: ErrorBody = {
  status: 500,
  message: "Unexpected error",
  traceId: "error-id-004",
  errors: [],
};

export const commissionQuote502: ErrorBody = {
  status: 502,
  message: "Invalid response from upstream",
  traceId: "error-id-005",
  errors: [],
};

export const commissionQuote504: ErrorBody = {
  status: 504,
  message: "Upstream did not respond in time",
  traceId: "error-id-006",
  errors: [],
};
