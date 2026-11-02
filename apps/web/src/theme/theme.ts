import { createTheme } from "@mui/material/styles";

// The only place with a brand colour. Change this value to re-skin the app.
export const PRIMARY_COLOR = "#de313b";

export const createAppTheme = (primary: string = PRIMARY_COLOR) =>
  createTheme({
    palette: { mode: "light", primary: { main: primary } },
    shape: { borderRadius: 8 },
    components: {
      MuiButton: {
        styleOverrides: { root: { borderRadius: 9999, textTransform: "none" } },
      },
    },
    typography: { fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif' },
  });

export const theme = createAppTheme();
