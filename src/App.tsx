import { useEffect, useState } from "react";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { Toaster } from "@/components/ui/sonner"
import { HomePage } from "@/components/home/HomePage"
import { RepositoriesPage } from "@/components/repositories/RepositoriesPage"
import { ThemeController } from "@/lib/settings/theme/ThemeController"
import Layout from "./components/ui/custom/layout";
import type { AppPage } from "./components/ui/custom/pages"

function App() {
  const [activePage, setActivePage] = useState<AppPage>("home")

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
      <Layout activePage={activePage} onPageChange={setActivePage}>
        {activePage === "repositories" ? <RepositoriesPage /> : <HomePage />}
      </Layout>
      <Toaster />
    </>
  );
}

export default App;
