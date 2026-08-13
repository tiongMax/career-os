import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerOS",
  description: "Job application tracking system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-neutral-50">
        <a
          href="#main-content"
          className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <Sidebar />
        <main
          id="main-content"
          className="min-w-0 flex-1 px-4 pb-8 pt-20 sm:px-6 md:p-8"
        >
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </body>
    </html>
  );
}
