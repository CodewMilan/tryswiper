import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
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
  description: "Describe the post. Your agent builds the carousel.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
          <ClerkProvider
            signInUrl="/login"
            signUpUrl="/signup"
            signInFallbackRedirectUrl="/connect"
            signUpFallbackRedirectUrl="/connect"
          >
            {children}
          </ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
