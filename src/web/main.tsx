import React from "react";
import { createRoot } from "react-dom/client";
import { StyledEngineProvider } from "@mui/material/styles";
import { LOCAL_FONT_FACE_CSS } from "../shared/web-fonts";
import { App } from "./index";
import { ThemeProvider, resolveThemePreference } from "./theme/ThemeContext";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container not found");
}

const initialTheme = resolveThemePreference();

const fontStyle = document.createElement("style");
fontStyle.dataset.fonts = "local";
fontStyle.textContent = LOCAL_FONT_FACE_CSS;
document.head.appendChild(fontStyle);

createRoot(container).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <ThemeProvider initialTheme={initialTheme}>
        <App />
      </ThemeProvider>
    </StyledEngineProvider>
  </React.StrictMode>,
);
