import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ProviderInstance } from "@/lib/providers/providerTypes"
import {
  addWatchedRepository,
  listAccessibleRepositories,
  listWatchedRepositories,
  refreshAccessibleRepositories,
  removeWatchedRepository,
  type AccessibleRepository,
  type WatchedRepository,
} from "@/lib/repositories/repositoryCache"
import { AccessibleRepositoryPicker } from "./AccessibleRepositoryPicker"
import { shouldRefreshAccessibleRepositories } from "./manageWatchedReposUtils"
import { WatchedRepositoriesList } from "./WatchedRepositoriesList"

const NESTED_SELECT_CLOSE_GRACE_MS = 150

export function ManageWatchedRepositoriesDialog({
  gitProviders,
  onChanged,
  onOpenChange,
  open,
}: {
  gitProviders: ProviderInstance[]
  onChanged: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const [providerId, setProviderId] = useState("")
  const [watchedRepositories, setWatchedRepositories] = useState<WatchedRepository[]>([])
  const [accessibleRepositories, setAccessibleRepositories] = useState<AccessibleRepository[]>([])
  const [selectedFullName, setSelectedFullName] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [providerSelectOpen, setProviderSelectOpen] = useState(false)
  const [repositorySelectOpen, setRepositorySelectOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const providerSelectOpenRef = useRef(false)
  const repositorySelectOpenRef = useRef(false)
  const nestedSelectInteractionRef = useRef(false)
  const nestedSelectCloseTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => {
      window.clearTimeout(nestedSelectCloseTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    setProviderId((currentProviderId) => {
      if (currentProviderId) {
        return currentProviderId
      }
      return gitProviders[0]?.id ?? ""
    })
  }, [gitProviders, open])

  useEffect(() => {
    if (!open || !providerId) {
      return
    }

    void load(providerId, search)
  }, [open, providerId, search])

  const watchedFullNames = useMemo(
    () => new Set(watchedRepositories.map((repository) => repository.fullName)),
    [watchedRepositories],
  )
  const addableRepositories = accessibleRepositories.filter(
    (repository) => !watchedFullNames.has(repository.fullName),
  )
  const selectedRepository = accessibleRepositories.find(
    (repository) => repository.fullName === selectedFullName,
  )

  function updateNestedSelectInteraction() {
    window.clearTimeout(nestedSelectCloseTimerRef.current)

    if (providerSelectOpenRef.current || repositorySelectOpenRef.current) {
      nestedSelectInteractionRef.current = true
      return
    }

    nestedSelectCloseTimerRef.current = window.setTimeout(() => {
      nestedSelectInteractionRef.current = false
    }, NESTED_SELECT_CLOSE_GRACE_MS)
  }

  function handleProviderSelectOpenChange(nextOpen: boolean) {
    providerSelectOpenRef.current = nextOpen
    setProviderSelectOpen(nextOpen)
    updateNestedSelectInteraction()
  }

  function handleRepositorySelectOpenChange(nextOpen: boolean) {
    repositorySelectOpenRef.current = nextOpen
    setRepositorySelectOpen(nextOpen)
    updateNestedSelectInteraction()
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen && nestedSelectInteractionRef.current) {
      return
    }

    onOpenChange(nextOpen)
  }

  async function load(nextProviderId = providerId, nextSearch = search) {
    if (!nextProviderId) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [watched, accessible] = await Promise.all([
        listWatchedRepositories(nextProviderId),
        listAccessibleRepositories(nextProviderId, nextSearch),
      ])
      setWatchedRepositories(watched)
      setAccessibleRepositories(accessible)

      if (shouldRefreshAccessibleRepositories(accessible)) {
        const refreshed = await refreshAccessibleRepositories(nextProviderId)
        setAccessibleRepositories(refreshed)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }

  async function refreshRepositories() {
    if (!providerId) {
      return
    }

    setRefreshing(true)
    setError(null)
    try {
      setAccessibleRepositories(await refreshAccessibleRepositories(providerId))
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setRefreshing(false)
    }
  }

  async function addRepository() {
    if (!selectedRepository) {
      return
    }

    setSaving(true)
    setError(null)
    try {
      await addWatchedRepository(
        selectedRepository.providerId,
        selectedRepository.owner,
        selectedRepository.name,
      )
      setSelectedFullName("")
      await load(selectedRepository.providerId, search)
      onChanged()
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setSaving(false)
    }
  }

  async function removeRepository(repository: WatchedRepository) {
    setError(null)
    try {
      await removeWatchedRepository(repository.id)
      await load(repository.providerId, search)
      onChanged()
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-h-none max-w-2xl overflow-visible"
        onInteractOutside={(event) => {
          if (nestedSelectInteractionRef.current) {
            event.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Manage watched repos</DialogTitle>
          <DialogDescription>
            Add repositories or remove them from the watch list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {gitProviders.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Configure a git provider with pull request access before adding
              watched repositories.
            </div>
          ) : (
            <>
              {gitProviders.length > 1 ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Provider</label>
                  <Select
                    open={providerSelectOpen}
                    onOpenChange={handleProviderSelectOpenChange}
                    value={providerId}
                    onValueChange={setProviderId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {gitProviders.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <AccessibleRepositoryPicker
                loading={loading}
                onAdd={addRepository}
                onRefresh={refreshRepositories}
                onSearchChange={setSearch}
                onSelectOpenChange={handleRepositorySelectOpenChange}
                onSelectedFullNameChange={setSelectedFullName}
                refreshing={refreshing || !providerId}
                repositories={addableRepositories}
                saving={saving}
                search={search}
                selectOpen={repositorySelectOpen}
                selectedFullName={selectedFullName}
              />

              <WatchedRepositoriesList
                onRemove={(repository) => void removeRepository(repository)}
                repositories={watchedRepositories}
              />
            </>
          )}

          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
