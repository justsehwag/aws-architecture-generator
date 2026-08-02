import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { I18nProvider } from "@/lib/i18n";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppErrorBoundary } from "@/components/error/AppErrorBoundary";
import { PageErrorBoundary } from "@/components/error/PageErrorBoundary";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "AWS Architecture Generator",
  description:
    "Convert natural language descriptions into professional AWS architecture diagrams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AppErrorBoundary>
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <I18nProvider>
                <AppLayout>
                  <PageErrorBoundary>{children}</PageErrorBoundary>
                </AppLayout>
                <Toaster />
              </I18nProvider>
            </ThemeProvider>
          </AuthProvider>
        </AppErrorBoundary>
      </body>
    </html>
  );
}
