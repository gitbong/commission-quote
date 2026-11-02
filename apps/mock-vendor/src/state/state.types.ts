import type { RESPONSES } from "../modules/commissionQuote/commissionQuote.responses";

export type StateId = keyof typeof RESPONSES;

export interface State {
  stateId: StateId;
  delay: number;
}
