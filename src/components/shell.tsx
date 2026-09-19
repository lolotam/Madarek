"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpLeft,
  BookOpen,
  FlaskConical,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useSession } from "./providers";
import { sciencePath } from "@/content/curriculum";
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="مدارك — الرئيسية">
      <span className="logo-mark">
        <BookOpen size={25} />
        <i />
      </span>
      <span>
        مدارك<small>مساحة للاكتشاف</small>
      </span>
    </Link>
  );
}
export function Header() {
  const path = usePathname(),
    { user } = useSession();
  const [open, setOpen] = useState(false);
  return (
    <>
      <a href="#main-content" className="skip-link">
        انتقلي إلى المحتوى
      </a>
      <header className="site-header">
        <div className="container nav-inner">
          <Logo />
          <nav
            className={open ? "main-nav open" : "main-nav"}
            aria-label="القائمة الرئيسية"
          >
            <Link
              onClick={() => setOpen(false)}
              className={path === "/" ? "active" : ""}
              href="/"
            >
              الرئيسية
            </Link>
            <Link
              onClick={() => setOpen(false)}
              className={path.startsWith("/grade") ? "active" : ""}
              href={sciencePath}
            >
              استكشفي العلوم <FlaskConical size={16} />
            </Link>
            <Link onClick={() => setOpen(false)} href="/#how">
              كيف نتعلّم؟
            </Link>
          </nav>
          <Link
            href={user ? "/dashboard" : "/login"}
            className="button small primary nav-account"
          >
            {user ? <LayoutDashboard size={17} /> : <ArrowUpLeft size={17} />}
            <span>{user ? "مساحتي" : "ابدئي رحلتك"}</span>
          </Link>
          <button
            className="icon-button mobile-menu"
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <Logo />
        <p>لكل سؤال، بداية اكتشاف.</p>
        <div>
          <Link href={sciencePath}>علوم الصف الثامن</Link>
          <span>الكويت · ٢٠٢٦–٢٠٢٧</span>
        </div>
      </div>
      <div className="container footer-note">
        مساحة تعليمية مستقلة مبنية على الكتاب المرفوع · نسخة محلية أولى ·
        المحتوى يتوسّع خطوة بخطوة
      </div>
    </footer>
  );
}
