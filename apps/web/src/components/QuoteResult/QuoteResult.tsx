import { Card, CardContent } from "@mui/material";
import type { QuoteState } from "../../hooks/useCommissionQuote";
import { ErrorResult } from "./ErrorResult";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { SuccessResult } from "./SuccessResult";

type Props = { state: QuoteState; onRetry: () => void };

function Content({ state, onRetry }: Props) {
  switch (state.status) {
    case "loading":
      return <LoadingSkeleton />;
    case "success":
      return <SuccessResult quote={state.quote} />;
    case "error":
      return <ErrorResult error={state.error} onRetry={onRetry} />;
    default:
      return null;
  }
}

export function QuoteResult(props: Props) {
  const { state } = props;
  const hidden = state.status === "idle";

  // Keep the live region mounted so results are announced when they appear.
  return (
    <div aria-live="polite" aria-busy={state.status === "loading"}>
      {!hidden && (
        <Card variant="outlined">
          <CardContent>
            <Content {...props} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
