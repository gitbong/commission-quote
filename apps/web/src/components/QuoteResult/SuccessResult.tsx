import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { useState } from "react";
import type { QuoteState } from "../../hooks/useCommissionQuote";
import { formatCurrency, formatPercent } from "../../lib/format";
import { staticContent } from "../../lib/staticContent";

type Quote = Extract<QuoteState, { status: "success" }>["quote"];

function QuoteId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the ID stays selectable on screen.
    }
  };
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
      <Typography component="span">{id}</Typography>
      <Tooltip
        title={
          copied
            ? staticContent("COMMISSION_QUOTE_RESULT_COPIED_LABEL")
            : staticContent("COMMISSION_QUOTE_RESULT_COPY_QUOTE_ID_LABEL")
        }
      >
        <IconButton
          size="small"
          aria-label={staticContent(
            "COMMISSION_QUOTE_RESULT_COPY_QUOTE_ID_LABEL",
          )}
          onClick={copy}
        >
          {copied ? (
            <CheckIcon fontSize="inherit" />
          ) : (
            <ContentCopyIcon fontSize="inherit" />
          )}
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

export function SuccessResult({ quote }: { quote: Quote }) {
  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="h6" component="h2" gutterBottom>
          {staticContent("COMMISSION_QUOTE_RESULT_TITLE")}
        </Typography>

        <Typography variant="caption" color="text.secondary" component="div">
          {staticContent("COMMISSION_QUOTE_RESULT_TOTAL_COMMISSION_LABEL")}
        </Typography>

        <Typography variant="h4" component="p" color="primary">
          {formatCurrency(quote.totalCommission)}
        </Typography>
      </Box>
      <Stack direction="row" spacing={4} sx={{ flexWrap: "wrap" }}>
        <Box>
          <Typography variant="caption" color="text.secondary" component="div">
            {staticContent("COMMISSION_QUOTE_RESULT_COMMISSION_RATE_LABEL")}
          </Typography>
          <Typography>{formatPercent(quote.commissionRate)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" component="div">
            {staticContent("COMMISSION_QUOTE_RESULT_QUOTE_ID_LABEL")}
          </Typography>
          <QuoteId id={quote.quoteId} />
        </Box>
      </Stack>
    </Stack>
  );
}
