import type { RequestHandler } from "express";
import type { State } from "../../state";
import { RESPONSES, isValidStateId, type FieldError } from "../commissionQuote";
import type { UpdateStateBody } from "./mockServerState.types";

export const createMockServerStateController = (state: State) => {
  const update: RequestHandler = (req, res) => {
    const { stateId, delay = 0 }: UpdateStateBody = req.body ?? {};
    const errors: FieldError[] = [];

    if (!isValidStateId(stateId)) {
      errors.push({
        field: "stateId",
        message: `Must be one of: ${Object.keys(RESPONSES).join(", ")}`,
      });
    }

    if (typeof delay !== "number" || !Number.isFinite(delay) || delay < 0) {
      errors.push({
        field: "delay",
        message: "Must be a non-negative number (ms)",
      });
    }

    if (
      errors.length > 0 ||
      !isValidStateId(stateId) ||
      typeof delay !== "number"
    ) {
      res.status(400).json({
        status: 400,
        message: "Invalid request payload",
        errors,
      });
      return;
    }

    state.stateId = stateId;
    state.delay = delay;
    res.status(200).json({ ...state });
  };

  return { update };
};
