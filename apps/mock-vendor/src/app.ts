import express, { type Express } from "express";
import { commissionQuoteRoutes } from "./modules/commissionQuote";
import { mockServerStateRoutes } from "./modules/mockServerState";
import { createState } from "./state";
import { requestLogger } from "./utils/requestLogger";

export function createApp(): Express {
  const state = createState();
  const app = express();

  app.use(requestLogger);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.text({ type: "text/*" }));

  app.use(mockServerStateRoutes(state));
  app.use(commissionQuoteRoutes(state));

  return app;
}
