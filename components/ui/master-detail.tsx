"use client";

import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Responsive master-detail. Not a chat clone — workspace content is provided by the page.
 *
 * md+ (768): list | workspace. Context stays inline from 2xl, otherwise the page
 * should put details in a sheet so the primary workspace is not crushed.
 * <768: list → detail with an explicit Back control.
 */
export function MasterDetail({
  hasSelection,
  list,
  workspace,
  context,
  onBack,
  backLabel = "Back",
  listWidthClassName = "md:w-[300px] xl:w-[360px]",
  splitAt = "md",
  className,
}: {
  hasSelection: boolean;
  list: React.ReactNode;
  workspace: React.ReactNode;
  context?: React.ReactNode;
  onBack: () => void;
  backLabel?: string;
  listWidthClassName?: string;
  splitAt?: "md" | "lg";
  className?: string;
}) {
  const splitHidden = splitAt === "lg" ? "lg:hidden" : "md:hidden";
  const splitFlex = splitAt === "lg" ? "lg:flex lg:flex-col" : "md:flex md:flex-col";
  const splitShow = splitAt === "lg" ? "hidden lg:flex lg:flex-col" : "hidden md:flex md:flex-col";
  const splitBorder = splitAt === "lg" ? "lg:border-r" : "md:border-r";
  const splitWidth = splitAt === "lg" ? "lg:w-[360px]" : listWidthClassName;

  return (
    <div className={cn("flex min-h-0 flex-1", className)}>
      <div
        className={cn(
          "min-h-0 w-full shrink-0 border-nexa-line",
          splitWidth,
          splitBorder,
          hasSelection ? cn("hidden", splitFlex) : "flex flex-col",
        )}
      >
        {list}
      </div>
      <div
        className={cn(
          "relative min-h-0 min-w-0 flex-1",
          hasSelection ? "flex flex-col" : splitShow,
        )}
      >
        {hasSelection ? (
          <div
            className={cn(
              "flex shrink-0 items-center gap-2 border-b border-nexa-line bg-white px-3 py-2",
              splitHidden,
            )}
          >
            <Button size="sm" variant="ghost" className="px-2" onClick={onBack}>
              <ChevronLeft className="h-4 w-4" />
              {backLabel}
            </Button>
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1">
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{workspace}</div>
          {context ? (
            <div className="hidden min-h-0 w-[280px] shrink-0 overflow-y-auto border-l border-nexa-line 2xl:block">
              {context}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
