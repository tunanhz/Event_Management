"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  User as UserIcon,
  Megaphone,
  ShieldCheck,
  LayoutDashboard,
  Bookmark,
  LogOut,
} from "lucide-react";
import { useAuth, type User } from "@/context/AuthContext";
import styles from "./header-account-menu.module.css";

type Role = User["role"];

/**
 * Per-role presentation for the header avatar.
 * - accent: ring/badge colour that visually distinguishes each role
 * - href/actionLabel: where the avatar (and menu item) leads for that role
 */
const ROLE_UI: Record<
  Role,
  { label: string; href: string; actionLabel: string; accent: string; Icon: typeof UserIcon }
> = {
  PARTICIPANT: { label: "Người tham gia", href: "/ve-cua-toi", actionLabel: "Tài khoản", accent: "#22d3ee", Icon: UserIcon },
  ORGANIZER: { label: "Nhà tổ chức", href: "/organizer", actionLabel: "Trang tổ chức", accent: "#a78bfa", Icon: Megaphone },
  ADMIN: { label: "Quản trị viên", href: "/dashboard", actionLabel: "Bảng điều khiển", accent: "#fbbf24", Icon: ShieldCheck },
  STAFF: { label: "Nhân viên", href: "/dashboard", actionLabel: "Bảng điều khiển", accent: "#34d399", Icon: ShieldCheck },
};

/**
 * Header account control for the public site.
 * - Logged out → "Đăng nhập | Đăng ký" link.
 * - Logged in  → role-aware avatar (colour + badge per role) with a dropdown
 *   (name, role, shortcut to the role's area, logout).
 */
export function HeaderAccountMenu({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Reserve space during the auth check to avoid layout shift.
  if (loading) return <span className={styles.skeleton} aria-hidden="true" />;

  if (!user) {
    return (
      <a href="/login" className={styles.loginLink}>
        <span className={styles.loginLabel}>
          {variant === "mobile" ? "Đăng nhập" : "Đăng nhập | Đăng ký"}
        </span>
      </a>
    );
  }

  const roleUi = ROLE_UI[user.role] ?? ROLE_UI.PARTICIPANT;
  const { Icon } = roleUi;
  const initial = user.fullName?.charAt(0).toUpperCase() ?? "?";

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Tài khoản ${user.fullName} — ${roleUi.label}`}
      >
        <span className={styles.avatarWrap} style={{ borderColor: roleUi.accent }}>
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar} alt={user.fullName} className={styles.avatarImg} />
          ) : (
            <span className={styles.avatarFallback} style={{ color: roleUi.accent }}>
              {initial}
            </span>
          )}
          {/* Role badge — distinguishes the avatar per role */}
          <span className={styles.roleBadge} style={{ backgroundColor: roleUi.accent }} aria-hidden="true">
            <Icon size={10} strokeWidth={2.5} />
          </span>
        </span>
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.menuHeader}>
            <span className={styles.menuName}>{user.fullName}</span>
            <span className={styles.menuRole} style={{ color: roleUi.accent }}>
              <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
              {roleUi.label}
            </span>
          </div>

          <div className={styles.menuDivider} />

          <Link href={roleUi.href} className={styles.menuItem} role="menuitem" onClick={() => setOpen(false)}>
            {user.role === "PARTICIPANT" ? <UserIcon size={16} aria-hidden="true" /> : <LayoutDashboard size={16} aria-hidden="true" />}
            {roleUi.actionLabel}
          </Link>

          <Link href="/su-kien-da-luu" className={styles.menuItem} role="menuitem" onClick={() => setOpen(false)}>
            <Bookmark size={16} aria-hidden="true" />
            Sự kiện đã lưu
          </Link>

          <button
            type="button"
            className={`${styles.menuItem} ${styles.menuItemDanger}`}
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
          >
            <LogOut size={16} aria-hidden="true" />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
