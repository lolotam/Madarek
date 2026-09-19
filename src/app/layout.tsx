import type { Metadata } from "next";
import "@fontsource-variable/noto-sans-arabic";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header, Footer } from "@/components/shell";
import { siteUrl, siteDescription } from "@/content/site";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "مدارك",
  title: { default: "مدارك | مساحة للاكتشاف", template: "%s | مدارك" },
  description: siteDescription,
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth">
      <body>
        <Providers>
          <Header />
          <main id="main-content">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
