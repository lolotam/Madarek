import type { Metadata } from "next";

export const siteUrl = "https://madarek.cc";
export const siteDescription =
  "علوم الصف الثامن من المنهج الكويتي ٢٠٢٦–٢٠٢٧: شرح عربي مبسّط، أنشطة تفاعلية واختبارات، مع متابعة الأسرة لتقدّم الأبناء.";

export function publicPageMetadata(
  title: string,
  description: string,
  path: string,
  image = "/images/science-discovery.png",
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "ar_KW",
      siteName: "مدارك",
      title,
      description,
      url: path,
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
