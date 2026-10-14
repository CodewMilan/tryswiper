import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import { headers } from "next/headers";
import { e2eEnabled } from "@/lib/auth-env";
import { AuthRuntimeProvider } from "@/components/auth-runtime";
import { getSessionUser } from "@/lib/session";
import "./globals.css";

const inter = localFont({
  variable: "--font-inter",
  src: [
    { path: "../../public/fonts/Inter-Regular.ttf", weight: "300 400" },
    { path: "../../public/fonts/Inter-Medium.ttf", weight: "500" },
    { path: "../../public/fonts/Inter-SemiBold.ttf", weight: "600" },
    { path: "../../public/fonts/Inter-Bold.ttf", weight: "700" },
  ],
});

const geistMono = localFont({
  variable: "--font-geist-mono",
  src: "../../public/fonts/IBMPlexMono-Regular.ttf",
});

export const metadata: Metadata = {
  title: "Swiper",
  description: "Generate an editable carousel from a brief on the web, or connect the agent you already use.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const fixtureMode = e2eEnabled((await headers()).get("host"));
  const authEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !fixtureMode;
  const fixtureAccount = fixtureMode ? (await getSessionUser())?.name ?? null : null;
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <a href="#main-content" className="sr-only fixed left-4 top-4 z-[60] rounded-xl bg-card px-4 py-3 text-sm font-medium shadow-lg focus:not-sr-only focus:ring-2 focus:ring-ring">Skip to content</a>
        <AuthRuntimeProvider enabled={authEnabled} fixtureAccount={fixtureAccount}>
        {authEnabled ? (
          <ClerkProvider
            signInUrl="/login"
            signUpUrl="/signup"
            signInFallbackRedirectUrl="/library"
            signUpFallbackRedirectUrl="/library"
          >
            {children}
          </ClerkProvider>
        ) : (
          children
        )}
        </AuthRuntimeProvider>
      </body>
    </html>
  );
}
