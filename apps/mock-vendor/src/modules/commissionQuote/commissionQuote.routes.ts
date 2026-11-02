import { Router } from "express";
import type { State } from "../../state";
import { createCommissionQuoteController } from "./commissionQuote.controller";

export const commissionQuoteRoutes = (state: State) => {
  const router = Router();
  const controller = createCommissionQuoteController(state);

  router.post("/api/commission-quotes", controller.create);

  return router;
};
