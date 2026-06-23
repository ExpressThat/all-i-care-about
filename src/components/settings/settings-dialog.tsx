import { useState, type ReactNode } from "react";
import { Settings, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { setSetting, useSetting } from "@/lib/settings/settingsStore";
import { ProvidersSettings } from "./providers-settings";
import { ThemeSelector } from "./theme-selector";

type SettingsCategory = "general" | "providers";

const categories: Array<{
  description: string;
  icon: typeof Settings | typeof Workflow;
  id: SettingsCategory;
  label: string;
}> = [
  {
    description: "Theme and application preferences",
    icon: Settings,
    id: "general",
    label: "General",
  },
  {
    description: "Connected data sources and capabilities",
    icon: Workflow,
    id: "providers",
    label: "Providers",
  },
];

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeCategory, setActiveCategory] =
    useState<SettingsCategory>("general");
  const active = categories.find((category) => category.id === activeCategory);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid h-[min(560px,calc(100vh-2rem))] max-w-[min(920px,calc(100vw-2rem))] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-[min(920px,calc(100vw-2rem))]">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            {active?.description ?? "Application preferences"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 grid-cols-[220px_minmax(0,1fr)]">
          <nav className="border-r bg-card/50 p-2">
            {categories.map((category) => (
              <CategoryButton
                category={category}
                isActive={activeCategory === category.id}
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
              />
            ))}
          </nav>
          <section className="themed-scrollbar min-h-0 overflow-y-auto p-5">
            {activeCategory === "general" ? <GeneralSettings /> : null}
            {activeCategory === "providers" ? <ProvidersSettings /> : null}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoryButton({
  category,
  isActive,
  onClick,
}: {
  category: (typeof categories)[number];
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      className="mb-1 h-auto w-full justify-start gap-2 px-2 py-2 text-left"
      onClick={onClick}
      variant={isActive ? "secondary" : "ghost"}
    >
      <category.icon aria-hidden="true" className="size-4" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">
          {category.label}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {category.description}
        </span>
      </span>
    </Button>
  );
}

function GeneralSettings() {
  return (
    <div className="space-y-5">
      <SettingGroup description="Choose the app colour theme." title="Theme">
        <ThemeSelector />
      </SettingGroup>
      <SettingGroup
        description="Start the app automatically when you sign in."
        title="Startup"
      >
        <AutostartSetting />
      </SettingGroup>
    </div>
  );
}

function AutostartSetting() {
  const checked = useSetting("AutoStart");
  const [isSaving, setIsSaving] = useState(false);

  async function handleCheckedChange(nextChecked: boolean) {
    setIsSaving(true);

    try {
      await setSetting("AutoStart", nextChecked);
      toast.success(nextChecked ? "Autostart enabled" : "Autostart disabled");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update autostart setting",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-medium">Start on login</div>
        <div className="text-xs text-muted-foreground">
          Launch All I Care About when your computer starts.
        </div>
      </div>
      <Switch
        aria-label="Start on login"
        checked={checked}
        disabled={isSaving}
        onCheckedChange={handleCheckedChange}
      />
    </div>
  );
}

function SettingGroup({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="grid gap-3 border-b pb-5 last:border-b-0 last:pb-0">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}
