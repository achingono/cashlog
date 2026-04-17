import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { useLocation } from "react-router-dom";
import { BRAND } from "@/lib/brand";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/holdings": "Holdings",
  "/transactions": "Transactions",
  "/assets": "Assets",
  "/budgets": "Budgets",
  "/goals": "Goals",
  "/reports": "Reports",
  "/settings": "Settings",
};

export function AppHeader() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "Dashboard";

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto hidden rounded-full border border-border/70 bg-card px-3 py-1 text-xs text-muted-foreground md:block">
        {BRAND.signature}
      </div>
    </header>
  );
}
