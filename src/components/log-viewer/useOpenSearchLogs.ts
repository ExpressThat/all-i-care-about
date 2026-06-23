import { useEffect, useMemo, useRef, useState } from "react";
import {
  listOpenSearchAliases,
  listOpenSearchFields,
  searchOpenSearchLogs,
  type LogDataSource,
  type LogField,
  type LogSearchFilter,
  type LogSearchResult,
} from "@/lib/providers/opensearch/logs";
import type { ProviderInstance } from "@/lib/providers/providerTypes";
import { useSetting } from "@/lib/settings/settingsStore";
import {
  defaultLogTimeRange,
  resolveTimeRange,
  type LogTimeRange,
} from "@/lib/logSearches/timeRange";
import type { SavedLogSearch } from "@/lib/logSearches/savedSearches";

export function useOpenSearchLogs({
  openedSavedSearch,
  onOpenedSavedSearchApplied,
}: {
  openedSavedSearch?: SavedLogSearch | null;
  onOpenedSavedSearchApplied?: () => void;
} = {}) {
  const providers = useSetting("Providers");
  const logProviders = useMemo(
    () =>
      providers.filter(
        (provider): provider is ProviderInstance<"opensearch"> =>
          provider.type === "opensearch" &&
          provider.enabledCapabilities.includes("Logs"),
      ),
    [providers],
  );
  const [providerId, setProviderId] = useState("");
  const [aliases, setAliases] = useState<LogDataSource[]>([]);
  const [selectedAlias, setSelectedAlias] = useState("");
  const [fields, setFields] = useState<LogField[]>([]);
  const [filters, setFilters] = useState<LogSearchFilter[]>([]);
  const [timeRange, setTimeRange] = useState<LogTimeRange>(() =>
    defaultLogTimeRange(),
  );
  const [result, setResult] = useState<LogSearchResult>({
    logs: [],
    histogram: [],
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSavedSearch, setActiveSavedSearch] =
    useState<SavedLogSearch | null>(null);
  const pendingSavedSearchRef = useRef<SavedLogSearch | null>(null);

  useEffect(() => {
    if (!openedSavedSearch) {
      return;
    }

    pendingSavedSearchRef.current = openedSavedSearch;
    setActiveSavedSearch(openedSavedSearch);
    setTimeRange(openedSavedSearch.timeRange);
    setProviderId(openedSavedSearch.providerId);
    onOpenedSavedSearchApplied?.();
  }, [openedSavedSearch, onOpenedSavedSearchApplied]);

  useEffect(() => {
    if (logProviders.length === 0) {
      setProviderId("");
      return;
    }

    setProviderId((current) =>
      logProviders.some((provider) => provider.id === current)
        ? current
        : logProviders[0].id,
    );
  }, [logProviders]);

  useEffect(() => {
    const pendingSavedSearch = pendingSavedSearchRef.current;
    const isApplyingSavedSearch =
      pendingSavedSearch?.providerId === providerId;
    const hasPendingSavedSearch = pendingSavedSearch !== null;

    setAliases([]);
    setSelectedAlias("");
    setFields([]);
    if (!isApplyingSavedSearch && !hasPendingSavedSearch) {
      setFilters([]);
    }
    if (!providerId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    void listOpenSearchAliases(providerId)
      .then((nextAliases) => {
        if (!cancelled) {
          const nextAlias = isApplyingSavedSearch
            ? pendingSavedSearch.dataSource
            : (nextAliases[0]?.alias ?? "");
          setAliases(nextAliases);
          setSelectedAlias(nextAlias);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [providerId]);

  useEffect(() => {
    const pendingSavedSearch = pendingSavedSearchRef.current;
    const isApplyingSavedSearch =
      pendingSavedSearch?.providerId === providerId &&
      pendingSavedSearch.dataSource === selectedAlias;
    const isWaitingForSavedSearchAlias =
      pendingSavedSearch?.providerId === providerId;
    const hasPendingSavedSearch = pendingSavedSearch !== null;

    setFields([]);
    if (
      !isApplyingSavedSearch &&
      !isWaitingForSavedSearchAlias &&
      !hasPendingSavedSearch
    ) {
      setFilters([]);
    }
    if (!providerId || !selectedAlias) {
      return;
    }

    let cancelled = false;
    setError(null);
    void listOpenSearchFields(providerId, selectedAlias)
      .then((nextFields) => {
        if (!cancelled) {
          setFields(nextFields);
          if (isApplyingSavedSearch) {
            setFilters(pendingSavedSearch.filters);
            pendingSavedSearchRef.current = null;
          }
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [providerId, selectedAlias]);

  useEffect(() => {
    if (providerId && selectedAlias) {
      void refreshLogs();
    }
  }, [providerId, selectedAlias, filters, timeRange]);

  async function refreshLogs() {
    if (!providerId || !selectedAlias) {
      return;
    }

    const resolvedRange = resolveTimeRange(timeRange);
    setLoading(true);
    setError(null);
    try {
      setResult(
        await searchOpenSearchLogs(providerId, {
          alias: selectedAlias,
          filters,
          histogramInterval: resolvedRange.histogramInterval,
          start: resolvedRange.start,
          end: resolvedRange.end,
          size: 100,
        }),
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  return {
    aliases,
    error,
    fields,
    filters,
    loading,
    logProviders,
    providerId,
    refreshLogs,
    result,
    selectedAlias,
    setFilters,
    setProviderId,
    setSelectedAlias,
    setTimeRange,
    timeRange,
    activeSavedSearch,
    setActiveSavedSearch,
  };
}
