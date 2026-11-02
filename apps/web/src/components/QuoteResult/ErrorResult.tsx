import { Alert, Button } from "@mui/material";
import type { QuoteState } from "../../hooks/useCommissionQuote";
import { staticContent } from "../../lib/staticContent";

type ApiError = Extract<QuoteState, { status: "error" }>["error"];

type Props = { error: ApiError; onRetry: () => void };

export function ErrorResult({ error, onRetry }: Props) {
  return (
    <Alert
      severity="error"
      action={
        <Button color="inherit" size="small" onClick={onRetry}>
          {staticContent("COMMISSION_QUOTE_RESULT_RETRY_BUTTON_LABEL")}
        </Button>
      }
    >
      {error.message}
    </Alert>
  );
}
