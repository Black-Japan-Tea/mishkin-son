import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root") ?? document.body).render(
  <StrictMode>
    {/* внешний boundary — страховка на случай падения выше App (провайдеры, роутер) */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
