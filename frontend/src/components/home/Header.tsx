"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useScrollState } from "@/lib/use-scroll-hide";
import styles from "./Header.module.css";

const Header: React.FC = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { y, dir } = useScrollState();
  // Hide on scroll-down (past a small threshold), reveal on scroll-up.
  const hidden = dir === "down" && y > 120;

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
            <div className={styles.searchBar}>
              <span className={styles.searchIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Tìm kiếm sự kiện, nghệ sĩ..."
                aria-label="Tìm kiếm sự kiện, nghệ sĩ"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className={styles.searchDivider} />
              <button className={styles.cityButton} type="button">
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
                </svg>
                TP. Hồ Chí Minh
              </button>
            </div>

            {/* Right Actions */}
            <div className={styles.actions}>
              <button
                className={styles.createEventBtn}
                type="button"
                onClick={() => router.push("/organizer/create-event")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Tạo sự kiện
              </button>

              <Link href="/ve-cua-toi" className={styles.ticketsLink}>
                <svg className={styles.ticketsIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                  <path d="M13 5v2" />
                  <path d="M13 17v2" />
                  <path d="M13 11v2" />
                </svg>
                Vé của tôi
              </Link>

              <a href="/login" className={styles.loginLink}>
                <span className={styles.loginLabel}>Đăng nhập | Đăng ký</span>
              </a>

              <ThemeToggle className={styles.themeToggle} />

              <button className={styles.langSelector} type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <ellipse cx="12" cy="12" rx="4" ry="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                </svg>
                VI
              </button>
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
            <Link href="/su-kien" className={styles.subLink}>Vé bán lại</Link>
            <Link href="/blog" className={styles.subLink}>Blog</Link>
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
            <ThemeToggle className={styles.mobileIconBtn} />

            <button className={styles.mobileIconBtn} type="button" aria-label="Tìm kiếm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>

            <button className={styles.mobileIconBtn} type="button" aria-label="Menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
