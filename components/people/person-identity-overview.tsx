import { formatDate } from "@/lib/utils";
import type { AdminUserDetail } from "@/lib/api/users-admin";
import { PersonField } from "./person-field";

export function PersonIdentityOverview({
  identity,
}: {
  identity: AdminUserDetail | null;
}) {
  if (!identity) return null;
  const phones =
    identity.phones.length > 0
      ? identity.phones
          .map((p) => {
            const flags = [
              p.isPrimary ? "primary" : null,
              p.isVerified ? "verified" : null,
            ]
              .filter(Boolean)
              .join(", ");
            return flags ? `${p.phoneNumber} (${flags})` : p.phoneNumber;
          })
          .join(" · ")
      : identity.phoneNumber;

  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-nexa-ink-4">
        Identity
      </h3>
      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PersonField label="Full name" value={identity.fullName} />
        <PersonField label="Email" value={identity.email} />
        <PersonField label="Phone" value={phones} />
        <PersonField label="City" value={identity.city} />
        <PersonField label="Address" value={identity.address} />
        <PersonField label="Date of birth" value={identity.dateOfBirth} />
        <PersonField label="Nationality" value={identity.nationality} />
        <PersonField label="Account status" value={identity.accountStatus} />
        <PersonField
          label="Deletion status"
          value={
            identity.deletionStatus && identity.deletionStatus !== "NONE"
              ? identity.deletionStatus
              : identity.deletionStatus === "NONE"
                ? "None"
                : null
          }
        />
        <PersonField
          label="Created"
          value={identity.createdAt ? formatDate(identity.createdAt) : null}
        />
        <PersonField
          label="Last login"
          value={identity.lastLoginAt ? formatDate(identity.lastLoginAt) : null}
        />
      </dl>
    </section>
  );
}
