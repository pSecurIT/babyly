import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Lora, Nunito } from "next/font/google";
import "./globals.css";
import { readAdminSession, readGuestSession } from "@/lib/session";
import { LogoutButton } from "@/components/LogoutButton";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Babyly",
  description: "Babyly is een veilige voorspel- en adreswebsite voor vrienden en familie.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [guestSession, adminSession] = await Promise.all([readGuestSession(), readAdminSession()]);
  const isAuthenticated = Boolean(guestSession || adminSession);

  return (
    <html
      lang="nl"
      className={`${nunito.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-20 px-4 pt-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 rounded-[28px] bg-[rgba(255,255,255,0.34)] px-4 py-3 shadow-[0_12px_28px_rgba(73,105,82,0.06)] backdrop-blur-xl sm:px-5">
            <Link href="/" aria-label="Ga naar de homepagina" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#f9faf6_0%,#ebf9ee_52%,#e0f4db_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_18px_rgba(84,157,100,0.08)]">
                <Image src="/logo.svg" alt="Babyly logo" width={28} height={28} priority />
              </div>
              <div className="leading-none">
                <p className="font-black tracking-[-0.05em] text-[1.65rem] text-[#234a37] sm:text-[1.9rem]">Babyly</p>
              </div>
            </Link>

            {isAuthenticated && (
              <div className="rounded-full bg-[rgba(255,255,255,0.72)] px-2 py-1.5 shadow-[0_8px_18px_rgba(73,105,82,0.08)]">
                <LogoutButton />
              </div>
            )}
          </div>
        </header>
        {children}
        <footer className="mx-auto mt-auto w-full max-w-5xl px-6 pb-8 pt-4 text-center text-sm text-[#4f6a5d]">
          <a className="underline" href="/privacy">Privacy en gegevens verwijderen</a>
        </footer>
      </body>
    </html>
  );
}
