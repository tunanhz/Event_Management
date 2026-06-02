import styles from "./Spinner.module.css";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <div className={`${styles.wrapper} ${className}`}>
      <div className={`${styles.spinner} ${styles[size]}`} />
    </div>
  );
}
