import { redirect } from "next/navigation";

export default function HostApplicationsRedirect() {
  redirect("/hosts?status=pending");
}
