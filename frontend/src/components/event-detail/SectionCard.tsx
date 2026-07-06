import type { ReactNode } from 'react';
import styles from './SectionCard.module.css';

interface SectionCardProps {
  title: string;
  action?: ReactNode; // optional control rendered on the right of the header
  id?: string;
  children: ReactNode;
}

/* Shared card shell for the detail sections (Giới thiệu, Lịch diễn, Ban tổ chức). */
export default function SectionCard({ title, action, id, children }: SectionCardProps) {
  return (
    <section id={id} className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {action}
      </div>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
