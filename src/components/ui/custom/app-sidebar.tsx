import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Cog,
  GitPullRequest,
  Home,
  ScrollText,
  Search,
  Ticket,
} from "lucide-react";
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
            <SidebarMenuItem>
              <Accordion
                className="w-full"
                collapsible
                defaultValue={activePage === "logs" ? "logs" : undefined}
                type="single"
              >
                <AccordionItem className="border-0" value="logs">
                  <AccordionTrigger className="h-8 rounded-md px-2 py-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:no-underline [&>svg]:size-4">
                    <span className="flex min-w-0 items-center gap-2">
                      <ScrollText aria-hidden="true" className="size-4" />
                      <span className="truncate">Logs</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={activePage === "logs"}
                        >
                          <button
                            onClick={() => onPageChange("logs")}
                            type="button"
                          >
                            <Search aria-hidden="true" />
                            <span>Logs screen</span>
                          </button>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
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
