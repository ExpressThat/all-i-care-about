import { useState } from "react";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import type { AppPage } from "./pages";

export default function Layout({
  activePage,
  children,
  onPageChange,
}: {
  activePage: AppPage;
  children: React.ReactNode;
  onPageChange: (page: AppPage) => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <SidebarProvider>
      <AppSidebar
        activePage={activePage}
        onOpenSettings={() => setSettingsOpen(true)}
        onPageChange={onPageChange}
      />
      <main className="h-svh min-w-0 flex-1 overflow-hidden bg-background">
        {children}
      </main>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </SidebarProvider>
  );
}
