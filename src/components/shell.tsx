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
import { useEffect, useRef, useState } from "react";
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
  const menuButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    const onOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !header.current?.contains(event.target)
      )
        setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [open]);
  return (
    <>
      <a href="#main-content" className="skip-link">
        انتقلي إلى المحتوى
      </a>
      <header
        ref={header}
        className="site-header"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setOpen(false);
        }}
      >
        <div className="container nav-inner">
          <Logo />
          <nav
            id="primary-navigation"
            className={open ? "main-nav open" : "main-nav"}
            aria-label="القائمة الرئيسية"
          >
            <Link
              onClick={() => setOpen(false)}
              className={path === "/" ? "active" : ""}
              aria-current={path === "/" ? "page" : undefined}
              href="/"
            >
              الرئيسية
            </Link>
            <Link
              onClick={() => setOpen(false)}
              className={path.startsWith("/grade") ? "active" : ""}
              aria-current={path.startsWith("/grade") ? "location" : undefined}
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
            onClick={() => setOpen(false)}
          >
            {user ? <LayoutDashboard size={17} /> : <ArrowUpLeft size={17} />}
            <span>{user ? "مساحتي" : "ابدئي رحلتك"}</span>
          </Link>
          <button
            ref={menuButton}
            className="icon-button mobile-menu"
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={open}
            aria-controls="primary-navigation"
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
        مساحة تعليمية مستقلة للمنهج الكويتي · الفصل الأول ٢٠٢٦–٢٠٢٧ · المحتوى
        يتوسّع خطوة بخطوة
      </div>
    </footer>
  );
}
