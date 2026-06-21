import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Cog, GitPullRequest, Home, Ticket } from "lucide-react";
import type { AppPage } from "./pages";

export function AppSidebar({
  activePage,
  onOpenSettings,
  onPageChange,
}: {
  activePage: AppPage;
  onOpenSettings: () => void;
  onPageChange: (page: AppPage) => void;
}) {
  return (
    <Sidebar>
      <SidebarHeader>
        <h1>AICA</h1>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={activePage === "home"}
                onClick={() => onPageChange("home")}
                type="button"
              >
                <Home aria-hidden="true" />
                <span>Home</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={activePage === "repositories"}
                onClick={() => onPageChange("repositories")}
                type="button"
              >
                <GitPullRequest aria-hidden="true" />
                <span>Repositories</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={activePage === "issues"}
                onClick={() => onPageChange("issues")}
                type="button"
              >
                <Ticket aria-hidden="true" />
                <span>Issues</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
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
  );
}
