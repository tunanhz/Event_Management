'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ContentBlock } from '@/lib/mockData';
import SectionCard from './SectionCard';
import styles from './EventIntro.module.css';

interface EventIntroProps {
  blocks: ContentBlock[];
  /** Raw rich-text HTML fallback when the event has no structured blocks
   *  (events created via the organizer wizard store description as HTML). */
  html?: string;
}

function renderBlock(block: ContentBlock, i: number) {
  switch (block.type) {
    case 'heading':
      return <h3 key={i} className={styles.heading}>{block.text}</h3>;
    case 'list':
      return (
        <ul key={i} className={styles.list}>
          {block.items.map((item, j) => <li key={j}>{item}</li>)}
        </ul>
      );
    default:
      return <p key={i} className={styles.paragraph}>{block.text}</p>;
  }
}

export default function EventIntro({ blocks, html }: EventIntroProps) {
  const [expanded, setExpanded] = useState(false);
  const useHtml = blocks.length === 0 && !!html;

  return (
    <SectionCard title="Giới thiệu" id="gioi-thieu">
      <div className={`${styles.content} ${expanded ? '' : styles.clamped}`}>
        {useHtml ? (
          <div dangerouslySetInnerHTML={{ __html: html as string }} />
        ) : (
          blocks.map(renderBlock)
        )}
        {!expanded && <span className={styles.fade} aria-hidden="true" />}
      </div>

      <div className={styles.toggleRow}>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? 'Thu gọn' : 'Xem thêm'}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
    </SectionCard>
  );
}
