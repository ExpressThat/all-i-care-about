import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AccessibleRepository } from "@/lib/repositories/repositoryCache";

export function AccessibleRepositoryPicker({
  loading,
  onAdd,
  onRefresh,
  onSearchChange,
  onSelectOpenChange,
  onSelectedFullNameChange,
  selectOpen,
  refreshing,
  repositories,
  saving,
  search,
  selectedFullName,
}: {
  loading: boolean;
  onAdd: () => void;
  onRefresh: () => void;
  onSearchChange: (search: string) => void;
  onSelectOpenChange: (open: boolean) => void;
  onSelectedFullNameChange: (fullName: string) => void;
  selectOpen: boolean;
  refreshing: boolean;
  repositories: AccessibleRepository[];
  saving: boolean;
  search: string;
  selectedFullName: string;
}) {
  const selectedRepository = repositories.find(
    (repository) => repository.fullName === selectedFullName,
  );

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search accessible repos..."
          value={search}
        />
        <Button
          disabled={refreshing}
          onClick={onRefresh}
          type="button"
          variant="outline"
        >
          <RefreshCw
            aria-hidden="true"
            className={refreshing ? "size-4 animate-spin" : "size-4"}
          />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Select
          disabled={loading || repositories.length === 0}
          open={selectOpen}
          onOpenChange={onSelectOpenChange}
          value={selectedFullName}
          onValueChange={onSelectedFullNameChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={loading ? "Loading repos..." : "Select a repository"}
            />
          </SelectTrigger>
          <SelectContent>
            {repositories.map((repository) => (
              <SelectItem key={repository.fullName} value={repository.fullName}>
                {repository.fullName}
                {repository.isPrivate ? " private" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          disabled={!selectedRepository || saving}
          onClick={onAdd}
          type="button"
        >
          Add repo
        </Button>
      </div>
    </div>
  );
}
