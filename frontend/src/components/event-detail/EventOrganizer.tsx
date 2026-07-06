import type { Organizer } from '@/lib/mockData';
import SectionCard from './SectionCard';
import styles from './EventOrganizer.module.css';

interface EventOrganizerProps {
  organizer: Organizer;
}

export default function EventOrganizer({ organizer }: EventOrganizerProps) {
  return (
    <SectionCard title="Ban tổ chức" id="ban-to-chuc">
      <div className={styles.row}>
        {organizer.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={organizer.logo} alt={organizer.name} className={styles.logo} />
        ) : (
          <div className={styles.logoFallback} aria-hidden="true">
            {organizer.name.charAt(0)}
          </div>
        )}
        <div className={styles.info}>
          <h3 className={styles.name}>{organizer.name}</h3>
          <p className={styles.description}>{organizer.description}</p>
        </div>
      </div>
    </SectionCard>
  );
}
