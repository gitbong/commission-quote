import {
  commissionQuote201,
  commissionQuote400,
  commissionQuote401,
  commissionQuote429,
  commissionQuote500,
  commissionQuote502,
  commissionQuote504,
} from "../../fixtures";
import type { StateId } from "../../state";
import type { MockResponse } from "./commissionQuote.types";

export const RESPONSES = {
  "201": { status: 201, body: commissionQuote201 },
  "400": { status: 400, body: commissionQuote400 },
  "401": { status: 401, body: commissionQuote401 },
  "429": {
    status: 429,
    body: commissionQuote429,
    headers: { "Retry-After": "1" },
  },
  "500": { status: 500, body: commissionQuote500 },
  "502": { status: 502, body: commissionQuote502 },
  "504": { status: 504, body: commissionQuote504 },
} as const satisfies Record<string, MockResponse>;

export const isValidStateId = (value: unknown): value is StateId =>
  typeof value === "string" && Object.hasOwn(RESPONSES, value);
