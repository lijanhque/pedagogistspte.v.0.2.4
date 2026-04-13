"use client";

import React from "react";
import { AcademicProvider } from "@/components/providers/academic-provider";
import { usePathname } from "next/navigation";
import { PTEProvider } from "@/components/providers/pte-provider";
import { PTEAppSidebar } from "@/components/pte/pte-app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Zap, Crown } from "lucide-react";
import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function PTELayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <PTEProvider>
      <AcademicProvider>
        <PTELayoutContent>{children}</PTELayoutContent>
      </AcademicProvider>
    </PTEProvider>
  );
}

function CreditsBadge() {
  const { data, isLoading } = useSWR("/api/user", fetcher, {
    refreshInterval: 60000, // Refresh every minute
    revalidateOnFocus: true,
  });

  if (isLoading || !data?.data) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted animate-pulse">
        <div className="h-3.5 w-12 bg-muted-foreground/20 rounded" />
      </div>
    );
  }

  const user = data.data;
  const tier = user.subscriptionTier || "free";
  const dailyCredits = user.dailyAiCredits || 10;
  const used = user.aiCreditsUsed || 0;
  const remaining = dailyCredits === -1 ? -1 : Math.max(0, dailyCredits - used);

  const tierColors: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    pro: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    premium:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* Credits Display */}
      <Link href="/pte/billing" className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-md bg-muted/80 hover:bg-muted transition-colors text-xs sm:text-sm font-medium">
        <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-yellow-500" aria-hidden="true" />
        <span className="hidden sm:inline">Credits:</span>
        <span className="font-bold">
          {remaining === -1 ? (
            <span className="text-green-600 dark:text-green-400">Unlimited</span>
          ) : (
            <span className={remaining <= 2 ? "text-red-500" : ""}>
              {remaining}/{dailyCredits}
            </span>
          )}
        </span>
      </Link>

      {/* Subscription Badge */}
      <Badge
        variant="outline"
        className={`capitalize text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 ${tierColors[tier] || tierColors.free}`}
      >
        {tier === "premium" && <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" aria-hidden="true" />}
        {tier}
      </Badge>
    </div>
  );
}

function PTELayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <PTEAppSidebar />
      <SidebarInset>
        <header className="flex min-h-12 sm:min-h-16 shrink-0 items-center gap-2 border-b px-3 sm:px-4 py-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4 hidden sm:block" />
          <Breadcrumb className="hidden sm:block">
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/pte/dashboard">PTE</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              {pathname
                ?.split("/")
                .filter(Boolean)
                .slice(1)
                .map((segment, index, array) => {
                  const href = `/pte/${array.slice(0, index + 1).join("/")}`;
                  const isLast = index === array.length - 1;
                  const title =
                    segment.charAt(0).toUpperCase() +
                    segment.slice(1).replace(/_/g, " ");

                  return (
                    <React.Fragment key={href}>
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage>{title}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={href}>{title}</BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {!isLast && (
                        <BreadcrumbSeparator className="hidden sm:block" />
                      )}
                    </React.Fragment>
                  );
                })}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <CreditsBadge />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
