import { Box, Container, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface PageProps {
  title: string;
  desc: string;
  children?: ReactNode;
}

export function Page({ title, desc, children }: PageProps) {
  return (
    <Container maxWidth="sm" component="main" sx={{ py: { xs: 3, sm: 6 } }}>
      <Box component="header" sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {title}
        </Typography>
        <Typography color="text.secondary">{desc}</Typography>
      </Box>
      <Stack spacing={3}>{children}</Stack>
    </Container>
  );
}
