import {
  Button,
  Card,
  CardContent,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Controller, type Control } from "react-hook-form";
import type { QuoteFormInput, QuoteFormOutput } from "../contract";
import { staticContent } from "../lib/staticContent";

type Props = {
  control: Control<QuoteFormInput, unknown, QuoteFormOutput>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  loading: boolean;
};

export function QuoteForm({ control, onSubmit, loading }: Props) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          {staticContent("COMMISSION_QUOTE_FORM_TITLE")}
        </Typography>
        <form
          onSubmit={onSubmit}
          noValidate
          aria-label={staticContent("COMMISSION_QUOTE_FORM_TITLE")}
        >
          <Stack spacing={2.5}>
            <Controller
              name="loanAmount"
              control={control}
              render={({ field: { ref, ...field }, fieldState }) => (
                <TextField
                  {...field}
                  inputRef={ref}
                  id="loanAmount"
                  label={staticContent("COMMISSION_QUOTE_LOAN_AMOUNT_LABEL")}
                  disabled={loading}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  slotProps={{
                    htmlInput: { inputMode: "decimal" },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          {staticContent("COMMISSION_QUOTE_LOAN_AMOUNT_PREFIX")}
                        </InputAdornment>
                      ),
                    },
                  }}
                  fullWidth
                />
              )}
            />
            <Controller
              name="loanTermInMonths"
              control={control}
              render={({ field: { ref, ...field }, fieldState }) => (
                <TextField
                  {...field}
                  inputRef={ref}
                  id="loanTermInMonths"
                  label={staticContent("COMMISSION_QUOTE_LOAN_TERM_LABEL")}
                  disabled={loading}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  slotProps={{
                    htmlInput: { inputMode: "numeric" },
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          {staticContent("COMMISSION_QUOTE_LOAN_TERM_SUFFIX")}
                        </InputAdornment>
                      ),
                    },
                  }}
                  fullWidth
                />
              )}
            />
            <Controller
              name="riskBand"
              control={control}
              render={({ field: { ref, ...field }, fieldState }) => (
                <TextField
                  {...field}
                  inputRef={ref}
                  id="riskBand"
                  select
                  label={staticContent("COMMISSION_QUOTE_RISK_BAND_LABEL")}
                  disabled={loading}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  fullWidth
                >
                  <MenuItem value="LOW">
                    {staticContent("COMMISSION_QUOTE_RISK_BAND_LOW")}
                  </MenuItem>
                  <MenuItem value="MEDIUM">
                    {staticContent("COMMISSION_QUOTE_RISK_BAND_MEDIUM")}
                  </MenuItem>
                  <MenuItem value="HIGH">
                    {staticContent("COMMISSION_QUOTE_RISK_BAND_HIGH")}
                  </MenuItem>
                </TextField>
              )}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={
                loading ? (
                  <CircularProgress size={18} color="inherit" />
                ) : undefined
              }
              sx={{ alignSelf: { xs: "stretch", sm: "flex-end" } }}
            >
              {loading
                ? staticContent("COMMISSION_QUOTE_SUBMIT_BUTTON_LOADING_LABEL")
                : staticContent("COMMISSION_QUOTE_SUBMIT_BUTTON_LABEL")}
            </Button>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
