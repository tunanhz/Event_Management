import styles from "./Card.module.css";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "bordered";
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
}

export function Card({
  children,
  className = "",
  variant = "default",
  hover = true,
  padding = "md",
}: CardProps) {
  return (
    <div
      className={`${styles.card} ${styles[variant]} ${styles[`pad${padding}`]} ${
        hover ? styles.hoverable : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
