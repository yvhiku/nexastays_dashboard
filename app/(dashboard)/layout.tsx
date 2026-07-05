import { AppChrome } from "@/components/layout/app-chrome";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppChrome>{children}</AppChrome>;
}
