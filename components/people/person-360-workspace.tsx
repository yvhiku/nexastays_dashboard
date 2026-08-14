"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { FilterTabs } from "@/components/ui/toolbar";
import {
  fetchStaysPerson,
  type StaysPersonOverview,
} from "@/lib/api/stays-admin";
import { fetchAdminUser, type AdminUserDetail } from "@/lib/api/users-admin";
import { Person360Header } from "./person-360-header";
import { PersonActivity } from "./person-activity";
import { isAbortError, isPersonTab, type PersonTab } from "./person-display";
import { PersonHosting } from "./person-hosting";
import { PersonOverview } from "./person-overview";
import { PersonSupport } from "./person-support";
import { PersonTravel } from "./person-travel";
import { PersonTrust } from "./person-trust";
import { personRoles } from "./person-role-badges";

export function Person360Workspace({
  userId,
  tab,
  defaultTab,
  onTabChange,
  fallbackName,
  fallbackEmail,
  fallbackAvatarColor,
  actions,
}: {
  userId: string;
  tab: string | null;
  defaultTab: PersonTab;
  onTabChange: (tab: PersonTab) => void;
  fallbackName?: string;
  fallbackEmail?: string;
  fallbackAvatarColor?: string;
  actions?: ReactNode;
}) {
  const [identity, setIdentity] = useState<AdminUserDetail | null>(null);
  const [stays, setStays] = useState<StaysPersonOverview | null>(null);
  const [identityLoading, setIdentityLoading] = useState(true);
  const [staysLoading, setStaysLoading] = useState(true);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [staysError, setStaysError] = useState<string | null>(null);
  const [identityRetry, setIdentityRetry] = useState(0);
  const [staysRetry, setStaysRetry] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    const requestedId = userId;
    setIdentity(null);
    setIdentityError(null);
    setIdentityLoading(true);

    fetchAdminUser(requestedId, { signal: ac.signal })
      .then((data) => {
        if (ac.signal.aborted) return;
        if (data.id && data.id !== requestedId) return;
        setIdentity(data);
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted || isAbortError(err)) return;
        setIdentityError(err instanceof Error ? err.message : "Failed to load identity");
      })
      .finally(() => {
        if (!ac.signal.aborted) setIdentityLoading(false);
      });

    return () => ac.abort();
  }, [userId, identityRetry]);

  useEffect(() => {
    const ac = new AbortController();
    const requestedId = userId;
    setStays(null);
    setStaysError(null);
    setStaysLoading(true);

    fetchStaysPerson(requestedId, { signal: ac.signal })
      .then((data) => {
        if (ac.signal.aborted) return;
        if (data.userId && data.userId !== requestedId) return;
        setStays(data);
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted || isAbortError(err)) return;
        setStaysError(
          err instanceof Error ? err.message : "Failed to load operational context",
        );
      })
      .finally(() => {
        if (!ac.signal.aborted) setStaysLoading(false);
      });

    return () => ac.abort();
  }, [userId, staysRetry]);

  const { isHost, isGuest } = personRoles(stays);
  const tabOptions = useMemo(() => {
    const options: Array<{ value: PersonTab; label: string }> = [
      { value: "overview", label: "Overview" },
    ];
    if (!stays || isHost) options.push({ value: "hosting", label: "Hosting" });
    if (!stays || isGuest) options.push({ value: "travel", label: "Travel" });
    options.push(
      { value: "trust", label: "Trust" },
      { value: "support", label: "Support" },
      { value: "activity", label: "Activity" },
    );
    return options;
  }, [stays, isHost, isGuest]);

  const activeTab: PersonTab = useMemo(() => {
    const requested = isPersonTab(tab) ? tab : defaultTab;
    if (tabOptions.some((opt) => opt.value === requested)) return requested;
    return "overview";
  }, [tab, defaultTab, tabOptions]);

  useEffect(() => {
    if (!stays) return;
    if (isPersonTab(tab) && tab !== activeTab) onTabChange(activeTab);
  }, [stays, tab, activeTab, onTabChange]);

  const retryIdentity = useCallback(() => setIdentityRetry((n) => n + 1), []);
  const retryStays = useCallback(() => setStaysRetry((n) => n + 1), []);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
      <Person360Header
        identity={identity}
        stays={stays}
        fallbackName={fallbackName}
        fallbackEmail={fallbackEmail}
        fallbackAvatarColor={fallbackAvatarColor}
        actions={actions}
      />
      <div className="shrink-0 border-b border-nexa-line px-4 py-3 sm:px-5">
        <FilterTabs<PersonTab>
          options={tabOptions}
          value={activeTab}
          onChange={onTabChange}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        {activeTab === "overview" ? (
          <PersonOverview
            identity={identity}
            identityLoading={identityLoading}
            identityError={identityError}
            onRetryIdentity={retryIdentity}
            stays={stays}
            staysLoading={staysLoading}
            staysError={staysError}
            onRetryStays={retryStays}
          />
        ) : null}
        {activeTab === "hosting" ? (
          <PersonHosting
            userId={userId}
            stays={stays}
            loading={staysLoading}
            error={staysError}
            onRetry={retryStays}
          />
        ) : null}
        {activeTab === "travel" ? (
          <PersonTravel
            userId={userId}
            stays={stays}
            loading={staysLoading}
            error={staysError}
            onRetry={retryStays}
          />
        ) : null}
        {activeTab === "trust" ? (
          <PersonTrust
            userId={userId}
            identity={identity}
            stays={stays}
            loading={staysLoading}
            error={staysError}
            onRetry={retryStays}
          />
        ) : null}
        {activeTab === "support" ? (
          <PersonSupport
            userId={userId}
            stays={stays}
            loading={staysLoading}
            error={staysError}
            onRetry={retryStays}
          />
        ) : null}
        {activeTab === "activity" ? <PersonActivity userId={userId} /> : null}
      </div>
    </div>
  );
}
