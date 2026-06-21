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
import type { AccessibleIssueSource } from "@/lib/issues/issueCache";

export function AccessibleIssueSourcePicker({
  loading,
  onAdd,
  onRefresh,
  onSearchChange,
  onSelectOpenChange,
  onSelectedSourceIdChange,
  refreshing,
  saving,
  search,
  selectOpen,
  selectedSourceId,
  sources,
}: {
  loading: boolean;
  onAdd: () => void;
  onRefresh: () => void;
  onSearchChange: (search: string) => void;
  onSelectOpenChange: (open: boolean) => void;
  onSelectedSourceIdChange: (sourceId: string) => void;
  refreshing: boolean;
  saving: boolean;
  search: string;
  selectOpen: boolean;
  selectedSourceId: string;
  sources: AccessibleIssueSource[];
}) {
  const selectedSource = sources.find(
    (source) => source.sourceId === selectedSourceId,
  );

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search issue sources..."
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
          disabled={loading || sources.length === 0}
          open={selectOpen}
          onOpenChange={onSelectOpenChange}
          value={selectedSourceId}
          onValueChange={onSelectedSourceIdChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                loading ? "Loading issue sources..." : "Select an issue source"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {sources.map((source) => (
              <SelectItem key={source.sourceId} value={source.sourceId}>
                {source.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          disabled={!selectedSource || saving}
          onClick={onAdd}
          type="button"
        >
          Add source
        </Button>
      </div>
    </div>
  );
}
