import React from "react";
import ReactDOM from "react-dom/client";
import JavascriptTimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import App from "./app";
import { initSettingsStore } from "@/lib/settings/settingsStore";
import "./index.css";

JavascriptTimeAgo.addDefaultLocale(en);

async function bootstrap() {
  await initSettingsStore();

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap();
