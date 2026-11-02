import express, { Router } from "express";
import type { State } from "../../state";
import { createMockServerStateController } from "./mockServerState.controller";

export const mockServerStateRoutes = (state: State) => {
  const router = Router();
  const controller = createMockServerStateController(state);

  router.put("/mock/state", express.json(), controller.update);

  return router;
};
