import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import styles from "@/presentation/styles/layout.module.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OrbitPulse",
  description: "Personal Scrum for Deep Focus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <div className={styles.container}>
          <aside className={styles.sidebar}>
            <Link href="/" className={styles.logo}>
              <Image
                src="/images/OrbitPulse_Logo.png"
                alt="OrbitPulse Logo"
                width={40}
                height={40}
                priority
              />
              <span className={styles.logoText}>
                <span style={{ color: "#ffffff" }}>Orbit</span>
                <span style={{ color: "#16ADB4" }}>Pulse</span>
              </span>
            </Link>
            <nav className={styles.nav}>
              <Link href="/backlog" className={styles.navLink}>
                Backlog
              </Link>
              <Link href="/sprints" className={styles.navLink}>
                Sprints
              </Link>
            </nav>
          </aside>
          <main className={styles.main}>{children}</main>
        </div>
      </body>
    </html>
  );
}
