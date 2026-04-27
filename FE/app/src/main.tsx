import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { AppProviders } from "./app/AppProviders";
import { router } from "./router/routes";
import "./platform/theme/global.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing root element");
}

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>
);
