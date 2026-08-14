"use client";

import type { KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CannedReply } from "@/lib/types";

export function TicketComposer({
  reply,
  onReplyChange,
  canned,
  disabled,
  closed,
  sending,
  onSend,
}: {
  reply: string;
  onReplyChange: (value: string) => void;
  canned: CannedReply[];
  disabled: boolean;
  closed: boolean;
  sending: boolean;
  onSend: () => void;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (disabled || sending || !reply.trim()) return;
    onSend();
  }

  return (
    <div className="shrink-0 border-t border-nexa-line bg-white p-3">
      {canned.length > 0 && (
        <select
          className="mb-2 h-8 max-w-full rounded-md border border-nexa-line bg-white px-2 text-xs"
          defaultValue=""
          disabled={disabled}
          aria-label="Use saved reply"
          onChange={(e) => {
            const id = e.target.value;
            e.target.value = "";
            const cannedReply = canned.find((c) => c.id === id);
            if (cannedReply) onReplyChange(cannedReply.body);
          }}
        >
          <option value="" disabled>
            Use saved reply
          </option>
          {canned.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={reply}
          onChange={(e) => onReplyChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          placeholder={closed ? "This support ticket is closed." : "Write a reply…"}
          disabled={disabled}
          className="min-h-[72px] flex-1 resize-none rounded-md border border-nexa-line px-3 py-2 text-sm disabled:bg-nexa-bg-2"
        />
        <Button
          size="sm"
          className="shrink-0"
          disabled={disabled || sending || !reply.trim()}
          onClick={onSend}
          aria-label="Send reply"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
