"use client";

import { useEffect, useRef } from "react";
import { formatDateTime, cn } from "@/lib/utils";
import type { TicketMessage } from "@/lib/types";
import { senderLabel } from "./labels";

export function TicketChat({
  ticketId,
  messages,
  emptyLabel,
  pinToLatest,
}: {
  ticketId: string;
  messages: TicketMessage[];
  emptyLabel: string;
  pinToLatest: number;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    stickToBottom.current = true;
  }, [ticketId]);

  useEffect(() => {
    stickToBottom.current = true;
  }, [pinToLatest]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !stickToBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, pinToLatest, ticketId]);

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  return (
    <div
      ref={scrollerRef}
      onScroll={onScroll}
      className="min-h-0 flex-1 overflow-y-auto p-4"
    >
      {messages.length === 0 ? (
        <p className="text-sm text-nexa-ink-4">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => {
            const isAgent = m.senderType === "SUPPORT_AGENT";
            const isSystem = m.senderType === "SYSTEM";
            return (
              <div
                key={m.id}
                className={cn(
                  "flex",
                  isSystem ? "justify-center" : isAgent ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    isAgent && "rounded-br-md bg-nexa-primary-soft text-nexa-ink",
                    isSystem && "rounded-md bg-nexa-bg-2 text-center text-nexa-ink-3",
                    !isAgent && !isSystem && "rounded-bl-md border border-nexa-line bg-white",
                  )}
                >
                  {!isSystem && (
                    <p className="text-[11px] font-semibold uppercase text-nexa-ink-4">
                      {senderLabel(m.senderType)}
                    </p>
                  )}
                  <p className={cn("whitespace-pre-wrap", !isSystem && "mt-1")}>{m.body}</p>
                  {m.createdAt && (
                    <p className="mt-1 text-[11px] text-nexa-ink-4">
                      {formatDateTime(m.createdAt)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
