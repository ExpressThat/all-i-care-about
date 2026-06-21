import { useEffect } from "react";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { Toaster } from "@/components/ui/sonner"
import { ThemeController } from "@/lib/settings/theme/ThemeController"
import Layout from "./components/ui/custom/layout";

function App() {
  useEffect(() => {
    if (import.meta.env.DEV || !("__TAURI_INTERNALS__" in window)) {
      return;
    }

    async function installAvailableUpdate() {
      try {
        const update = await check();

        if (!update) {
          return;
        }

        await update.downloadAndInstall();
        await relaunch();
      } catch (error) {
        console.warn("Update check failed", error);
      }
    }

    installAvailableUpdate();
  }, []);

  return (
    <>
      <ThemeController />
      <Layout>
        <p>test</p>
      </Layout>
      <Toaster />
    </>
  );
}

export default App;
