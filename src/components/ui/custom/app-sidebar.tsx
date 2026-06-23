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
  Bookmark,
  Bell,
  Gauge,
  LayoutDashboard,
  ScrollText,
  Search,
  Ticket,
} from "lucide-react";
import { useEffect, useState } from "react";
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
  const [logsAccordionValue, setLogsAccordionValue] = useState("");

  useEffect(() => {
    if (
      activePage === "logs" ||
      activePage === "saved-log-searches" ||
      activePage === "log-metrics" ||
      activePage === "saved-log-metrics" ||
      activePage === "log-metric-dashboards" ||
      activePage === "log-metric-alerts"
    ) {
      setLogsAccordionValue("logs");
    }
  }, [activePage]);

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
                onValueChange={setLogsAccordionValue}
                type="single"
                value={logsAccordionValue}
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
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={activePage === "saved-log-searches"}
                        >
                          <button
                            onClick={() => onPageChange("saved-log-searches")}
                            type="button"
                          >
                            <Bookmark aria-hidden="true" />
                            <span>Saved searches</span>
                          </button>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={activePage === "log-metrics"}>
                          <button onClick={() => onPageChange("log-metrics")} type="button">
                            <Gauge aria-hidden="true" />
                            <span>Metrics</span>
                          </button>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={activePage === "saved-log-metrics"}>
                          <button onClick={() => onPageChange("saved-log-metrics")} type="button">
                            <Bookmark aria-hidden="true" />
                            <span>Saved metrics</span>
                          </button>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={activePage === "log-metric-dashboards"}>
                          <button onClick={() => onPageChange("log-metric-dashboards")} type="button">
                            <LayoutDashboard aria-hidden="true" />
                            <span>Dashboards</span>
                          </button>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={activePage === "log-metric-alerts"}>
                          <button onClick={() => onPageChange("log-metric-alerts")} type="button">
                            <Bell aria-hidden="true" />
                            <span>Metric alerts</span>
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
