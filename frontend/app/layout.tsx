import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CareerOS",
    template: "%s · CareerOS",
  },
  description: "Stay on top of every job application and next step.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-background">
        <a
          href="#main-content"
          className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-control bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-elevated transition-transform focus:translate-y-0"
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
