import { Router } from "express";
import { commissionQuoteRequestSchema } from "@commission-quote/shared";
import { AppError } from "../../errors";
import type { CommissionQuoteService } from "./commissionQuote.service";

export const commissionQuoteRoutes = (service: CommissionQuoteService) => {
  const router = Router();

  router.post("/api/commission-quotes", async (req, res) => {
    const parsed = commissionQuoteRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        parsed.error.issues.map((issue) => ({
          field: issue.path.join(".") || "body",
          message: issue.message,
        })),
      );
    }

    res.status(201).json(await service.getQuote(parsed.data));
  });

  return router;
};
