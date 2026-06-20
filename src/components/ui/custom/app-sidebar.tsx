import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
} from "@/components/ui/sidebar"
import { Cog } from "lucide-react"

export function AppSidebar() {
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
                <div className="flex gap-2 cursor-pointer hover:scale-99 hover:backdrop-brightness-95 w-full">
                    <Cog /> Settings
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}