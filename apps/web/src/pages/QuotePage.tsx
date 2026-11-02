import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Page } from "../components/Page";
import { QuoteForm } from "../components/QuoteForm";
import { QuoteResult } from "../components/QuoteResult/QuoteResult";
import {
  quoteFormSchema,
  type QuoteFormInput,
  type QuoteFormOutput,
} from "../contract";
import { useCommissionQuote } from "../hooks/useCommissionQuote";
import { staticContent } from "../lib/staticContent";

export function QuotePage() {
  const { state, submit } = useCommissionQuote();
  const { control, handleSubmit } = useForm<
    QuoteFormInput,
    unknown,
    QuoteFormOutput
  >({
    resolver: zodResolver(quoteFormSchema) as Resolver<
      QuoteFormInput,
      unknown,
      QuoteFormOutput
    >,
    defaultValues: { loanAmount: "", loanTermInMonths: "", riskBand: "" },
    mode: "onTouched",
  });

  const onSubmit = handleSubmit(async (values) => {
    await submit(values);
  });

  return (
    <Page
      title={staticContent("COMMISSION_QUOTE_PAGE_HEADER")}
      desc={staticContent("COMMISSION_QUOTE_PAGE_DESCRIPTION")}
    >
      <QuoteForm
        control={control}
        onSubmit={onSubmit}
        loading={state.status === "loading"}
      />
      <QuoteResult state={state} onRetry={() => void onSubmit()} />
    </Page>
  );
}
