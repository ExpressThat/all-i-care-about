import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import { initSettingsStore } from "@/lib/settings/settingsStore";
import "./index.css";

async function bootstrap() {
  await initSettingsStore();

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap();
