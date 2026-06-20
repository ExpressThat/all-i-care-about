import { useState } from "react"
import { SettingsDialog } from "@/components/settings/settings-dialog"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <SidebarProvider>
      <AppSidebar onOpenSettings={() => setSettingsOpen(true)} />
      <main>
        {children}
      </main>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </SidebarProvider>
  )
}
