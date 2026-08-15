"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DetailSheet } from "@/components/ui/detail-sheet";
import { supportAgentDisplayName } from "@/lib/api/identity-admin";
import type { SupportAgentWithWorkload } from "@/lib/api/stays-admin";
import type { Ticket } from "@/lib/types";
import { AgentAvatar } from "./agent-avatar";

export function TicketAssignmentPicker({
  open,
  ticket,
  agents,
  busy,
  onClose,
  onAssign,
  onUnassign,
}: {
  open: boolean;
  ticket: Ticket;
  agents: SupportAgentWithWorkload[];
  busy: boolean;
  onClose: () => void;
  onAssign: (agentId: string) => void;
  onUnassign: () => void;
}) {
  const [confirm, setConfirm] = useState<
    | { type: "assign"; agent: SupportAgentWithWorkload }
    | { type: "unassign" }
    | null
  >(null);

  const { eligible, ineligible } = useMemo(() => {
    const active = agents.filter((agent) => agent.status === "ACTIVE");
    const rest = agents.filter((agent) => agent.status !== "ACTIVE");
    const byName = (a: SupportAgentWithWorkload, b: SupportAgentWithWorkload) =>
      supportAgentDisplayName(a).localeCompare(supportAgentDisplayName(b));
    return {
      eligible: [...active].sort((a, b) => a.assigned - b.assigned || byName(a, b)),
      ineligible: [...rest].sort(byName),
    };
  }, [agents]);

  const currentlyAssigned = Boolean(ticket.assignee);

  function chooseAgent(agent: SupportAgentWithWorkload) {
    if (busy || agent.status !== "ACTIVE") return;
    if (agent.id === ticket.assignee) {
      onClose();
      return;
    }
    if (!currentlyAssigned) {
      onAssign(agent.id);
      return;
    }
    setConfirm({ type: "assign", agent });
  }

  return (
    <>
      <DetailSheet nested open={open} onClose={onClose} title="Assign ticket">
        <div className="px-4 py-3">
          {eligible.length === 0 && ineligible.length === 0 ? (
            <p className="text-sm text-nexa-ink-4">No support agents to assign.</p>
          ) : (
            <ul className="space-y-1">
              {eligible.map((agent) => {
                const name = supportAgentDisplayName(agent);
                const current = agent.id === ticket.assignee;
                return (
                  <li key={agent.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => chooseAgent(agent)}
                      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-nexa-bg-2 disabled:opacity-60"
                    >
                      <AgentAvatar name={name} photoUrl={agent.profilePhotoUrl} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-nexa-ink">
                            {name}
                          </span>
                          {current ? <Badge variant="neutral">Current</Badge> : null}
                        </span>
                        <span className="block truncate text-xs text-nexa-ink-4">
                          {agent.email ?? agent.id}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-nexa-ink-4">
                        {agent.assigned} assigned
                      </span>
                    </button>
                  </li>
                );
              })}
              {ineligible.map((agent) => {
                const name = supportAgentDisplayName(agent);
                return (
                  <li key={agent.id}>
                    <div className="flex items-center gap-3 rounded-md px-2 py-2 opacity-60">
                      <AgentAvatar name={name} photoUrl={agent.profilePhotoUrl} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-nexa-ink">{name}</p>
                        <p className="truncate text-xs text-nexa-ink-4">
                          {agent.email ?? agent.id} · {agent.status}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-nexa-ink-4">Unavailable</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {currentlyAssigned && (
            <div className="mt-4 border-t border-nexa-line pt-3">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirm({ type: "unassign" })}
              >
                Unassign ticket
              </Button>
            </div>
          )}
        </div>
      </DetailSheet>
      <ConfirmDialog
        open={confirm?.type === "assign"}
        title="Reassign ticket?"
        description={
          confirm?.type === "assign"
            ? `Assign this ticket to ${supportAgentDisplayName(confirm.agent)}.`
            : undefined
        }
        confirmLabel="Reassign"
        busy={busy}
        onConfirm={() => {
          if (confirm?.type === "assign") onAssign(confirm.agent.id);
          setConfirm(null);
        }}
        onCancel={() => {
          if (!busy) setConfirm(null);
        }}
      />
      <ConfirmDialog
        open={confirm?.type === "unassign"}
        title="Unassign ticket?"
        description="This ticket will return to the unassigned queue."
        confirmLabel="Unassign"
        danger
        busy={busy}
        onConfirm={() => {
          onUnassign();
          setConfirm(null);
        }}
        onCancel={() => {
          if (!busy) setConfirm(null);
        }}
      />
    </>
  );
}
