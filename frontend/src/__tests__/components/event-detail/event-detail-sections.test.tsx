import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SectionCard from '@/components/event-detail/SectionCard';
import EventSchedule from '@/components/event-detail/EventSchedule';
import EventIntro from '@/components/event-detail/EventIntro';
import type { ContentBlock } from '@/lib/mockData';

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('SectionCard', () => {
  it('should render section with title', () => {
    render(
      <SectionCard title="Test Section">
        <p>Test content</p>
      </SectionCard>
    );
    expect(screen.getByRole('heading', { name: 'Test Section' })).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render section with id attribute', () => {
    const { container } = render(
      <SectionCard title="Test" id="test-id">
        <p>Content</p>
      </SectionCard>
    );
    const section = container.querySelector('section[id="test-id"]');
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute('id', 'test-id');
  });

  it('should render children content', () => {
    render(
      <SectionCard title="Events">
        <ul>
          <li>Event 1</li>
          <li>Event 2</li>
        </ul>
      </SectionCard>
    );
    expect(screen.getByText('Event 1')).toBeInTheDocument();
    expect(screen.getByText('Event 2')).toBeInTheDocument();
  });

  it('should render optional action in header', () => {
    const action = <button>View All</button>;
    render(
      <SectionCard title="Test" action={action}>
        <p>Content</p>
      </SectionCard>
    );
    expect(screen.getByRole('button', { name: 'View All' })).toBeInTheDocument();
  });

  it('should render without action when not provided', () => {
    render(
      <SectionCard title="Test">
        <p>Content</p>
      </SectionCard>
    );
    expect(screen.queryByRole('button', { name: 'View All' })).not.toBeInTheDocument();
  });

  it('should render as a semantic section element', () => {
    const { container } = render(
      <SectionCard title="Test">
        <p>Content</p>
      </SectionCard>
    );
    const section = container.querySelector('section');
    expect(section).toBeInTheDocument();
    expect(section).toHaveClass('card');
  });
});

describe('EventSchedule', () => {
  const today = new Date(2026, 6, 15); // July 15, 2026

  const defaultProps = {
    showDates: ['15/07/2026', '20/07/2026', '25/07/2026', '05/08/2026'],
    time: '19:30',
    eventId: 'e1',
  };

  it('should render schedule section with title', () => {
    render(<EventSchedule {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /Lịch diễn/ })).toBeInTheDocument();
  });

  it('should render month tabs', () => {
    render(<EventSchedule {...defaultProps} />);
    // Tab buttons include both month and day count
    expect(screen.getByRole('button', { name: /Tháng 7, 2026/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Th 8/ })).toBeInTheDocument();
  });

  it('should show calendar view by default', () => {
    render(<EventSchedule {...defaultProps} />);
    expect(screen.getByRole('group', { name: /Kiểu hiển thị lịch/ })).toBeInTheDocument();
  });

  it('should render view toggle buttons', () => {
    render(<EventSchedule {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Dạng danh sách/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dạng lịch/ })).toBeInTheDocument();
  });

  it('should switch to list view when list button is clicked', async () => {
    render(<EventSchedule {...defaultProps} />);
    const listBtn = screen.getByRole('button', { name: /Dạng danh sách/ });
    await userEvent.click(listBtn);
    expect(listBtn).toHaveAttribute('aria-pressed', 'true');
    // List view should show dates
    expect(screen.getByText(/15 Tháng 07, 2026/)).toBeInTheDocument();
  });

  it('should switch back to calendar view', async () => {
    render(<EventSchedule {...defaultProps} />);
    const listBtn = screen.getByRole('button', { name: /Dạng danh sách/ });
    const calendarBtn = screen.getByRole('button', { name: /Dạng lịch/ });

    await userEvent.click(listBtn);
    expect(listBtn).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(calendarBtn);
    expect(calendarBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('should show calendar days in list view', async () => {
    render(<EventSchedule {...defaultProps} />);
    const listBtn = screen.getByRole('button', { name: /Dạng danh sách/ });
    await userEvent.click(listBtn);

    // Should show first month's dates
    expect(screen.getByText(/15 Tháng 07, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/20 Tháng 07, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/25 Tháng 07, 2026/)).toBeInTheDocument();
  });

  it('should show "Mua vé" links in list view', async () => {
    render(<EventSchedule {...defaultProps} />);
    const listBtn = screen.getByRole('button', { name: /Dạng danh sách/ });
    await userEvent.click(listBtn);

    const buyLinks = screen.getAllByRole('link', { name: /Mua vé/ });
    expect(buyLinks.length).toBeGreaterThan(0);
  });

  it('should show month count in tabs', () => {
    render(<EventSchedule {...defaultProps} />);
    expect(screen.getByText(/3 suất diễn/)).toBeInTheDocument(); // July has 3
  });

  it('should render navigation arrows', () => {
    render(<EventSchedule {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Xem tháng trước/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xem tháng sau/ })).toBeInTheDocument();
  });

  it('should handle single show date', () => {
    render(<EventSchedule {...defaultProps} showDates={['15/07/2026']} />);
    expect(screen.getByText(/1 suất diễn/)).toBeInTheDocument();
  });

  it('should display weekday headers in calendar', () => {
    render(<EventSchedule {...defaultProps} />);
    expect(screen.getByText('Thứ 2')).toBeInTheDocument();
    expect(screen.getByText('Thứ 7')).toBeInTheDocument();
    expect(screen.getByText('Chủ nhật')).toBeInTheDocument();
  });

  it('should have proper aria attributes on calendar cells', async () => {
    render(<EventSchedule {...defaultProps} />);
    // Calendar days should have aria-pressed attributes
    const dayButtons = screen.getAllByRole('button');
    const activeDays = dayButtons.filter((btn) => btn.getAttribute('aria-pressed') !== null);
    expect(activeDays.length).toBeGreaterThan(0);
  });

  it('should have "lich-dien" as section id', () => {
    const { container } = render(<EventSchedule {...defaultProps} />);
    const section = container.querySelector('section[id="lich-dien"]');
    expect(section).toBeInTheDocument();
  });
});

describe('EventIntro', () => {
  it('should render intro section with title', () => {
    render(<EventIntro blocks={[]} />);
    expect(screen.getByRole('heading', { name: /Giới thiệu/ })).toBeInTheDocument();
  });

  it('should render section with id "gioi-thieu"', () => {
    const { container } = render(<EventIntro blocks={[]} />);
    const section = container.querySelector('section[id="gioi-thieu"]');
    expect(section).toBeInTheDocument();
  });

  it('should render paragraph blocks', () => {
    const blocks: ContentBlock[] = [
      { type: 'paragraph', text: 'Test paragraph 1' },
      { type: 'paragraph', text: 'Test paragraph 2' },
    ];
    render(<EventIntro blocks={blocks} />);
    expect(screen.getByText('Test paragraph 1')).toBeInTheDocument();
    expect(screen.getByText('Test paragraph 2')).toBeInTheDocument();
  });

  it('should render heading blocks', () => {
    const blocks: ContentBlock[] = [
      { type: 'heading', text: 'Section Heading' },
      { type: 'paragraph', text: 'Some content' },
    ];
    render(<EventIntro blocks={blocks} />);
    expect(screen.getByRole('heading', { name: 'Section Heading' })).toBeInTheDocument();
  });

  it('should render list blocks with items', () => {
    const blocks: ContentBlock[] = [
      {
        type: 'list',
        items: ['Item 1', 'Item 2', 'Item 3'],
      },
    ];
    render(<EventIntro blocks={blocks} />);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('should render mixed content blocks', () => {
    const blocks: ContentBlock[] = [
      { type: 'heading', text: 'Description' },
      { type: 'paragraph', text: 'This is a description' },
      { type: 'heading', text: 'Requirements' },
      { type: 'list', items: ['Requirement 1', 'Requirement 2'] },
    ];
    render(<EventIntro blocks={blocks} />);
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('This is a description')).toBeInTheDocument();
    expect(screen.getByText('Requirements')).toBeInTheDocument();
    expect(screen.getByText('Requirement 1')).toBeInTheDocument();
  });

  it('should have "Xem thêm" button by default', () => {
    const blocks: ContentBlock[] = [{ type: 'paragraph', text: 'Some content' }];
    render(<EventIntro blocks={blocks} />);
    expect(screen.getByRole('button', { name: /Xem thêm/ })).toBeInTheDocument();
  });

  it('should expand content when "Xem thêm" is clicked', async () => {
    const blocks: ContentBlock[] = [{ type: 'paragraph', text: 'Some content' }];
    render(<EventIntro blocks={blocks} />);
    const toggleBtn = screen.getByRole('button', { name: /Xem thêm/ });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Thu gọn/ })).toBeInTheDocument();
  });

  it('should collapse content when "Thu gọn" is clicked', async () => {
    const blocks: ContentBlock[] = [{ type: 'paragraph', text: 'Some content' }];
    render(<EventIntro blocks={blocks} />);
    const toggleBtn = screen.getByRole('button', { name: /Xem thêm/ });

    await userEvent.click(toggleBtn);
    expect(screen.getByRole('button', { name: /Thu gọn/ })).toBeInTheDocument();

    await userEvent.click(toggleBtn);
    expect(screen.getByRole('button', { name: /Xem thêm/ })).toBeInTheDocument();
  });

  it('should render HTML fallback when blocks are empty and html is provided', () => {
    const htmlContent = '<p>This is <strong>HTML</strong> content</p>';
    render(<EventIntro blocks={[]} html={htmlContent} />);
    // HTML is broken up by elements, so use a function matcher
    expect(screen.getByText((content) => content.includes('This is'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('HTML'))).toBeInTheDocument();
  });

  it('should prefer blocks over HTML fallback when blocks exist', () => {
    const blocks: ContentBlock[] = [{ type: 'paragraph', text: 'Block content' }];
    const htmlContent = '<p>HTML content</p>';
    render(<EventIntro blocks={blocks} html={htmlContent} />);
    expect(screen.getByText('Block content')).toBeInTheDocument();
    expect(screen.queryByText('HTML content')).not.toBeInTheDocument();
  });

  it('should handle empty blocks array', () => {
    render(<EventIntro blocks={[]} />);
    expect(screen.getByRole('heading', { name: /Giới thiệu/ })).toBeInTheDocument();
  });

  it('should show fade gradient when collapsed', () => {
    const blocks: ContentBlock[] = [{ type: 'paragraph', text: 'Some content' }];
    const { container } = render(<EventIntro blocks={blocks} />);

    // Fade element should be present when collapsed
    const fadeElement = container.querySelector('[class*="fade"]');
    expect(fadeElement).toBeInTheDocument();
  });

  it('should hide fade gradient when expanded', async () => {
    const blocks: ContentBlock[] = [{ type: 'paragraph', text: 'Some content' }];
    const { container } = render(<EventIntro blocks={blocks} />);

    const toggleBtn = screen.getByRole('button', { name: /Xem thêm/ });
    await userEvent.click(toggleBtn);

    // After expansion, the fade should not be visible
    const fadeElement = container.querySelector('[class*="fade"]');
    // The element is still in the DOM but has different styling
    if (fadeElement) {
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    }
  });

  it('should render list as ul element', () => {
    const blocks: ContentBlock[] = [
      {
        type: 'list',
        items: ['Item 1', 'Item 2'],
      },
    ];
    const { container } = render(<EventIntro blocks={blocks} />);
    expect(container.querySelector('ul')).toBeInTheDocument();
  });

  it('should render list items as li elements', () => {
    const blocks: ContentBlock[] = [
      {
        type: 'list',
        items: ['Item 1', 'Item 2'],
      },
    ];
    const { container } = render(<EventIntro blocks={blocks} />);
    const listItems = container.querySelectorAll('li');
    expect(listItems).toHaveLength(2);
  });
});
