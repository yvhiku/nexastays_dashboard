import type { KycRecord } from "../types";
import { apiFetch } from "./client";

type ApiKycRow = {
  id: string;
  user_id: string;
  full_name?: string | null;
  status?: string;
  provider?: string | null;
  submitted_at?: string;
  kycProfile?: {
    status?: string;
    reviewed_at?: string | null;
    rejection_reason?: string | null;
    document_type?: string | null;
  };
  is_host?: boolean;
};

function mapKycStatus(status: string | undefined): KycRecord["status"] {
  switch (status?.toUpperCase()) {
    case "VERIFIED":
    case "APPROVED":
      return "verified";
    case "REJECTED":
      return "rejected";
    case "PENDING":
    case "SUBMITTED":
      return "pending";
    default:
      return "unverified";
  }
}

function mapKyc(row: ApiKycRow): KycRecord {
  const status = row.kycProfile?.status ?? row.status;
  return {
    id: row.id,
    name: row.full_name?.trim() || row.user_id.slice(0, 8),
    role: row.is_host ? "host" : "guest",
    status: mapKycStatus(status),
    provider: row.provider ?? "—",
    submittedAt: row.submitted_at ?? "",
    reviewedAt: row.kycProfile?.reviewed_at ?? undefined,
    failureReason: row.kycProfile?.rejection_reason ?? undefined,
    documentType: row.kycProfile?.document_type ?? "—",
  };
}

export async function fetchKycApplications(status?: string): Promise<KycRecord[]> {
  const params = new URLSearchParams({
    source: "STAYS",
    limit: "200",
  });
  if (status && status !== "all") {
    const apiStatus =
      status === "verified"
        ? "APPROVED"
        : status === "pending"
          ? "PENDING"
          : status === "rejected"
            ? "REJECTED"
            : status.toUpperCase();
    params.set("status", apiStatus);
  }
  const rows = await apiFetch<ApiKycRow[]>(`/admin/kyc/applications?${params}`, {
    base: "identity",
  });
  return rows.map(mapKyc);
}

export type KycCase = {
  id: string;
  userId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  status: KycRecord["status"];
  provider: string;
  documentType: string;
  submittedAt: string;
  reviewedAt?: string;
  failureReason?: string;
  source?: string;
  isHost?: boolean;
  documents?: { id_document?: boolean; selfie?: boolean; liveness?: boolean };
};

export async function fetchKycCase(id: string): Promise<KycCase> {
  const row = await apiFetch<ApiKycRow & {
    user_id?: string;
    user_phone?: string | null;
    user_name?: string | null;
    email?: string | null;
    documents?: KycCase["documents"];
    source?: string;
  }>(`/admin/kyc/${encodeURIComponent(id)}`, { base: "identity" });
  const mapped = mapKyc(row);
  return {
    ...mapped,
    userId: row.user_id ?? "",
    phone: row.user_phone,
    email: row.email,
    source: row.source,
    isHost: row.is_host,
    documents: row.documents,
  };
}

export type IdentityAccountStatus = "ACTIVE" | "SUSPENDED" | "FROZEN" | "BANNED";

/** Set Identity account status (admin). Logs USER_STATUS_UPDATED audit event. */
export async function updateUserAccountStatus(
  userId: string,
  status: IdentityAccountStatus,
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(
    `/admin/users/${encodeURIComponent(userId)}/status`,
    {
      base: "identity",
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}
