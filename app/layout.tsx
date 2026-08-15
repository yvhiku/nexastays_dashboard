import React from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { playfair, dmSans } from "@/app/fonts/brand-fonts";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";

export const metadata: Metadata = {
  title: "Nexa Stays — Admin Dashboard",
  description: "Operational control center for the Nexa Stays marketplace.",
  icons: {
    icon: [{ url: "/images/nexastays.png", type: "image/png" }],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // SEC-010: middleware sets x-nonce; Next uses it for inline bootstrap scripts when present.
  const h = await headers();
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      className={`${playfair.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning data-nonce={nonce || undefined}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
