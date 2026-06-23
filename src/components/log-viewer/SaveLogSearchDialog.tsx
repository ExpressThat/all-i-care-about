import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function SaveLogSearchDialog({
  defaultName,
  description = "Name this log search so it can be opened again later.",
  onOpenChange,
  onSave,
  open,
  saveLabel = "Save",
  title = "Save search",
}: {
  defaultName: string;
  description?: string;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
  open: boolean;
  saveLabel?: string;
  title?: string;
}) {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (open) {
      setName(defaultName);
    }
  }, [defaultName, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          maxLength={120}
          onChange={(event) => setName(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && name.trim()) {
              onSave(name.trim());
            }
          }}
          placeholder="Search name"
          value={name}
        />
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() => onSave(name.trim())}
            type="button"
          >
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
