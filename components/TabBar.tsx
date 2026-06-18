"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/",
    label: "记录流",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M8 9h8M8 13h6" />
      </svg>
    ),
  },
  {
    href: "/ai",
    label: "AI 整理",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l2 5 5 .5-4 3.5 1.3 5L12 19l-4.3 2 1.3-5L5 8.5 10 8z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "设置",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5a7 7 0 0 0 .1-1z" />
      </svg>
    ),
  },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar">
      {tabs.map((t) => {
        const on = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`tab ${on ? "on" : ""}`}>
            {t.icon}
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
