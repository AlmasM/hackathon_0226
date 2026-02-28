import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerMapsAuthFailureCallback } from "./lib/mapsLogger";
import App from "./App";
import "./style.css";

// Register before any Maps script loads so Google can call it on auth failure
registerMapsAuthFailureCallback();

const container = document.getElementById("app");

if (!container) {
  throw new Error("Root element #app was not found");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
