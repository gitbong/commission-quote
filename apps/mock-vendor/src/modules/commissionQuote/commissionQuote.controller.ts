import type { RequestHandler } from "express";
import { RESPONSES } from "./commissionQuote.responses";
import type { State } from "../../state";
import { sleep } from "../../utils/sleep";

export const createCommissionQuoteController = (state: State) => {
  const create: RequestHandler = async (_req, res) => {
    if (state.delay > 0) await sleep(state.delay);

    const { status, body, ...rest } = RESPONSES[state.stateId];

    if ("headers" in rest) res.set(rest.headers);

    res.status(status).json(body);
  };

  return { create };
};
