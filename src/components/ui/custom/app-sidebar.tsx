import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
} from "@/components/ui/sidebar"
import { Cog } from "lucide-react"

export function AppSidebar({
    onOpenSettings,
}: {
    onOpenSettings: () => void
}) {
    return (
        <Sidebar>
            <SidebarHeader>
                <h1>AICA</h1>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <p>test</p>
                </SidebarGroup>
                <SidebarGroup />
            </SidebarContent>
            <SidebarFooter>
                <button
                    className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    onClick={onOpenSettings}
                    type="button"
                >
                    <Cog aria-hidden="true" className="size-4" />
                    <span>Settings</span>
                </button>
            </SidebarFooter>
        </Sidebar>
    )
}
