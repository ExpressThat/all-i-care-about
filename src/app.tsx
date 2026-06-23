import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { Toaster } from "@/components/ui/sonner";
import { HomePage } from "@/components/home/HomePage";
import { IssuesPage } from "@/components/issues/IssuesPage";
import { LogsPage } from "@/components/log-viewer/LogsPage";
import { MetricAlertsPage } from "@/components/log-metrics/MetricAlertsPage";
import { MetricBuilderPage } from "@/components/log-metrics/MetricBuilderPage";
import { MetricDashboardsPage } from "@/components/log-metrics/MetricDashboardsPage";
import { SavedMetricsPage } from "@/components/log-metrics/SavedMetricsPage";
import { SavedSearchesPage } from "@/components/log-viewer/SavedSearchesPage";
import { RepositoriesPage } from "@/components/repositories/RepositoriesPage";
import type { SavedLogMetric } from "@/lib/logMetrics/metrics";
import type { SavedLogSearch } from "@/lib/logSearches/savedSearches";
import { ThemeController } from "@/lib/settings/theme/ThemeController";
import Layout from "./components/ui/custom/layout";
import type { AppPage } from "./components/ui/custom/pages";

function App() {
  const [activePage, setActivePage] = useState<AppPage>("home");
  const [savedSearchToOpen, setSavedSearchToOpen] =
    useState<SavedLogSearch | null>(null);
  const [metricToOpen, setMetricToOpen] = useState<SavedLogMetric | null>(null);

  const openSavedSearch = useCallback((savedSearch: SavedLogSearch) => {
    setSavedSearchToOpen(savedSearch);
    setActivePage("logs");
  }, []);

  const clearSavedSearchToOpen = useCallback(() => {
    setSavedSearchToOpen(null);
  }, []);
  const openMetric = useCallback((metric: SavedLogMetric) => {
    setMetricToOpen(metric);
    setActivePage("log-metrics");
  }, []);
  const clearMetricToOpen = useCallback(() => {
    setMetricToOpen(null);
  }, []);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) {
      return;
    }
    void invoke("start_background_workers").catch((error) => {
      console.warn("Failed to start background workers", error);
    });
  }, []);

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
        {activePage === "repositories" ? (
          <RepositoriesPage />
        ) : activePage === "issues" ? (
          <IssuesPage />
        ) : activePage === "logs" ? (
          <LogsPage
            onSavedSearchApplied={clearSavedSearchToOpen}
            savedSearchToOpen={savedSearchToOpen}
          />
        ) : activePage === "saved-log-searches" ? (
          <SavedSearchesPage onOpenSavedSearch={openSavedSearch} />
        ) : activePage === "log-metrics" ? (
          <MetricBuilderPage
            metricToOpen={metricToOpen}
            onMetricApplied={clearMetricToOpen}
          />
        ) : activePage === "saved-log-metrics" ? (
          <SavedMetricsPage onOpenMetric={openMetric} />
        ) : activePage === "log-metric-dashboards" ? (
          <MetricDashboardsPage />
        ) : activePage === "log-metric-alerts" ? (
          <MetricAlertsPage />
        ) : (
          <HomePage />
        )}
      </Layout>
      <Toaster />
    </>
  );
}

export default App;
