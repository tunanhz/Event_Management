import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Trang chủ | Event Management",
  description: "Khám phá và quản lý các sự kiện hấp dẫn. Tạo, tham gia và theo dõi sự kiện dễ dàng.",
};

/**
 * Home Page - Server Component
 * Fetches featured events from Express backend via RSC
 */
export default async function HomePage() {
  // TODO: Fetch featured events from backend
  // const events = await api.get<ApiResponse<Event[]>>('/api/events?status=published&limit=6');

  return (
    <main className={styles.main}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={styles.heroGradient} />
          <div className={styles.heroOrbs}>
            <div className={styles.orb1} />
            <div className={styles.orb2} />
            <div className={styles.orb3} />
          </div>
        </div>
        <div className={`container ${styles.heroContent}`}>
          <span className={styles.badge}>🎉 Nền tảng Quản lý Sự kiện</span>
          <h1 className={styles.heroTitle}>
            Tạo & Quản lý
            <br />
            <span className={styles.heroTitleGradient}>Sự kiện dễ dàng</span>
          </h1>
          <p className={styles.heroDescription}>
            Nền tảng toàn diện giúp bạn lên kế hoạch, tổ chức và theo dõi mọi sự kiện.
            Từ hội thảo đến lễ hội — tất cả trong một nơi.
          </p>
          <div className={styles.heroCta}>
            <button className={styles.btnPrimary} id="hero-create-event">
              Tạo sự kiện mới
            </button>
            <button className={styles.btnSecondary} id="hero-explore-events">
              Khám phá sự kiện
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.stats}>
        <div className="container">
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>0</span>
              <span className={styles.statLabel}>Sự kiện</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>0</span>
              <span className={styles.statLabel}>Người tham gia</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>0</span>
              <span className={styles.statLabel}>Nhà tổ chức</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>0</span>
              <span className={styles.statLabel}>Thành phố</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Tại sao chọn chúng tôi?</h2>
          <p className={styles.sectionSubtitle}>
            Mọi công cụ bạn cần để tạo sự kiện thành công
          </p>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📅</div>
              <h3 className={styles.featureTitle}>Quản lý dễ dàng</h3>
              <p className={styles.featureDescription}>
                Tạo và quản lý sự kiện chỉ với vài thao tác đơn giản.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>👥</div>
              <h3 className={styles.featureTitle}>Theo dõi người tham gia</h3>
              <p className={styles.featureDescription}>
                Quản lý danh sách khách mời và theo dõi đăng ký real-time.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📊</div>
              <h3 className={styles.featureTitle}>Thống kê chi tiết</h3>
              <p className={styles.featureDescription}>
                Phân tích dữ liệu sự kiện với dashboard trực quan.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
