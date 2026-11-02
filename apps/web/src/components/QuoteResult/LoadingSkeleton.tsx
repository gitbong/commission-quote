import { Box, Skeleton } from "@mui/material";
import { staticContent } from "../../lib/staticContent";

export function LoadingSkeleton() {
  return (
    <Box aria-label={staticContent("COMMISSION_QUOTE_RESULT_LOADING_LABEL")}>
      <Skeleton variant="text" width="40%" />
      <Skeleton variant="text" height={56} width="60%" />
      <Skeleton variant="text" width="50%" />
    </Box>
  );
}
