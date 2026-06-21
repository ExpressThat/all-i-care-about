import { Moon, Sun, SunMoon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppTheme } from "@/lib/settings/Settings";
import { setSetting, useSetting } from "@/lib/settings/settingsStore";

const themeOptions: Array<{
  icon: typeof Sun;
  label: string;
  value: AppTheme;
}> = [
  { icon: Sun, label: "Light", value: "Light" },
  { icon: Moon, label: "Dark", value: "Dark" },
  { icon: SunMoon, label: "System", value: "System" },
];

export function ThemeSelector() {
  const theme = useSetting("Theme");
  const [open, setOpen] = useState(false);
  const Icon =
    themeOptions.find((option) => option.value === theme)?.icon ?? SunMoon;

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Select colour theme" variant="outline">
          <Icon aria-hidden="true" className="size-4" />
          {theme}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Select Colour Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(value) => {
              void setSetting("Theme", value as AppTheme);
              setOpen(false);
            }}
          >
            {themeOptions.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                <option.icon aria-hidden="true" className="size-4" />
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
