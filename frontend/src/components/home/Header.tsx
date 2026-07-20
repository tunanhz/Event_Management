"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { HeaderAccountMenu } from "./HeaderAccountMenu";
import { useScrollState } from "@/lib/use-scroll-hide";
import styles from "./Header.module.css";

const Header: React.FC = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { y, dir } = useScrollState();
  // Hide on scroll-down (past a small threshold), reveal on scroll-up.
  const hidden = dir === "down" && y > 120;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/su-kien?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      {/* ═══════ Desktop Header ═══════ */}
      <div className={`${styles.headerWrapper} ${hidden ? styles.hidden : ""}`}>
        <header className={styles.header}>
          <div className={styles.container}>
            {/* Logo */}
            <Link href="/" className={styles.logo}>
              <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                <path d="M13 5v2" />
                <path d="M13 17v2" />
                <path d="M13 11v2" />
              </svg>
              <span className={styles.logoText}>EventBox</span>
            </Link>

            {/* Search Bar */}
            <form className={styles.searchBar} onSubmit={submitSearch} role="search">
              <button type="submit" className={styles.searchIcon} aria-label="Tìm kiếm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Tìm kiếm sự kiện, nghệ sĩ..."
                aria-label="Tìm kiếm sự kiện, nghệ sĩ"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

            </form>

            {/* Right Actions */}
            <div className={styles.actions}>


              <Link href="/ve-cua-toi" className={styles.ticketsLink}>
                <svg className={styles.ticketsIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                  <path d="M13 5v2" />
                  <path d="M13 17v2" />
                  <path d="M13 11v2" />
                </svg>
                Vé của tôi
              </Link>

              <NotificationBell />

              <HeaderAccountMenu variant="desktop" />

              <ThemeToggle className={styles.themeToggle} />


            </div>
          </div>
        </header>

        {/* Sub Navigation Bar */}
        <div className={styles.subHeader}>
          <div className={styles.subContainer}>
            <Link href="/su-kien?category=nhac-song" className={styles.subLink}>Nhạc sống</Link>
            <Link href="/su-kien?category=san-khau" className={styles.subLink}>Sân khấu & Nghệ thuật</Link>
            <Link href="/su-kien?category=the-thao" className={styles.subLink}>Thể thao</Link>
            <Link href="/su-kien?category=hoi-thao" className={styles.subLink}>Hội thảo & Workshop</Link>
            <Link href="/su-kien?category=tham-quan" className={styles.subLink}>Tham quan & Trải nghiệm</Link>
            <Link href="/su-kien?category=khac" className={styles.subLink}>Khác</Link>

          </div>
        </div>
      </div>

      {/* ═══════ Mobile Header ═══════ */}
      <header className={`${styles.mobileHeader} ${hidden ? styles.hidden : ""}`}>
        <div className={styles.mobileContainer}>
          {/* Logo */}
          <Link href="/" className={styles.logo}>
            <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
              <path d="M13 5v2" />
              <path d="M13 17v2" />
              <path d="M13 11v2" />
            </svg>
            <span className={styles.logoText}>EventBox</span>
          </Link>

          {/* Mobile Actions */}
          <div className={styles.mobileActions}>
            <NotificationBell className={`${styles.mobileIconBtn} ${styles.mobileOptional}`} />

            <ThemeToggle className={`${styles.mobileIconBtn} ${styles.mobileOptional}`} />

            <button className={`${styles.mobileIconBtn} ${styles.mobileSearchBtn}`} type="button" aria-label="Tìm kiếm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>

            <button className={`${styles.mobileIconBtn} ${styles.mobileMenuBtn}`} type="button" aria-label="Menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <HeaderAccountMenu variant="mobile" />
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
