import express, { type Express } from "express";
import helmet from "helmet";
import { errorHandler, notFoundHandler } from "./middleware";
import {
  commissionQuoteRoutes,
  createCommissionQuoteService,
  type CommissionQuoteClient,
} from "./modules/commissionQuote";

export interface AppDeps {
  commissionQuoteClient: CommissionQuoteClient;
}

export function createApp({ commissionQuoteClient }: AppDeps): Express {
  const app = express();

  // Security headers; also removes X-Powered-By.
  app.use(helmet());

  // Liveness/readiness probe for the platform. It does not call the vendor.
  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(express.json());
  app.use(
    commissionQuoteRoutes(createCommissionQuoteService(commissionQuoteClient)),
  );
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
