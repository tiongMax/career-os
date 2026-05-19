import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerOS",
  description: "Job application tracking system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-neutral-50">
        <Sidebar />
        <main className="flex-1 min-w-0 p-8">{children}</main>
      </body>
    </html>
  );
}
