import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventsToolbar from '@/components/events/EventsToolbar';
import type { Filters } from '@/components/events/events-types';
import type { DateFilter } from '@/components/events/events-types';

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('EventsToolbar', () => {
  const today = new Date(2026, 5, 15); // June 15, 2026

  const defaultProps = {
    heading: 'Test Heading',
    filters: {
      city: 'all' as const,
      free: false,
      categories: [],
    } satisfies Filters,
    dateFilter: {
      mode: 'all' as const,
      date: null,
    } satisfies DateFilter,
    today,
    onApplyFilters: jest.fn(),
    onResetFilters: jest.fn(),
    onApplyDate: jest.fn(),
    onResetDate: jest.fn(),
    onRemoveCategory: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render heading', () => {
    render(<EventsToolbar {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Test Heading' })).toBeInTheDocument();
  });

  it('should use default heading when not provided', () => {
    const props = { ...defaultProps, heading: undefined };
    render(<EventsToolbar {...props} />);
    expect(screen.getByRole('heading', { name: 'Kết quả tìm kiếm:' })).toBeInTheDocument();
  });

  it('should render date button with correct label when mode is "all"', () => {
    render(<EventsToolbar {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Tất cả các ngày/ })).toBeInTheDocument();
  });

  it('should render date button with preset label for "today"', () => {
    const dateFilter: DateFilter = { mode: 'today', date: null };
    render(<EventsToolbar {...defaultProps} dateFilter={dateFilter} />);
    expect(screen.getByRole('button', { name: /Hôm nay/ })).toBeInTheDocument();
  });

  it('should render date button with formatted date when mode is "date" with a selected date', () => {
    const dateFilter: DateFilter = { mode: 'date', date: '2026-06-15' };
    render(<EventsToolbar {...defaultProps} dateFilter={dateFilter} />);
    expect(screen.getByRole('button', { name: /15\/06\/2026/ })).toBeInTheDocument();
  });

  it('should render filter button with no badge when no filters are active', () => {
    render(<EventsToolbar {...defaultProps} />);
    const filterBtn = screen.getByRole('button', { name: /Bộ lọc/ });
    expect(filterBtn).toBeInTheDocument();
    expect(filterBtn).not.toHaveTextContent(/\d+/);
  });

  it('should render filter button with badge showing filter count', () => {
    const filters: Filters = {
      city: 'hcm',
      free: true,
      categories: ['music', 'theater'],
    };
    render(<EventsToolbar {...defaultProps} filters={filters} />);
    const filterBtn = screen.getByRole('button', { name: /Bộ lọc/ });
    expect(filterBtn).toHaveTextContent('4'); // 1 city + 1 free + 2 categories
  });

  it('should show active category chips', () => {
    const filters: Filters = {
      city: 'all',
      free: false,
      categories: ['nhac-song', 'san-khau'],
    };
    render(<EventsToolbar {...defaultProps} filters={filters} />);
    expect(screen.getByText('Nhạc sống')).toBeInTheDocument();
    expect(screen.getByText('Sân khấu & Nghệ thuật')).toBeInTheDocument();
  });

  it('should call onRemoveCategory when clicking a category chip', async () => {
    const filters: Filters = {
      city: 'all',
      free: false,
      categories: ['nhac-song'],
    };
    const handleRemoveCategory = jest.fn();
    render(
      <EventsToolbar
        {...defaultProps}
        filters={filters}
        onRemoveCategory={handleRemoveCategory}
      />
    );
    const chip = screen.getByRole('button', { name: /Bỏ lọc Nhạc sống/ });
    await userEvent.click(chip);
    expect(handleRemoveCategory).toHaveBeenCalledWith('nhac-song');
  });

  it('should open date panel when date button is clicked', async () => {
    render(<EventsToolbar {...defaultProps} />);
    const dateBtn = screen.getByRole('button', { name: /Tất cả các ngày/ });
    await userEvent.click(dateBtn);
    expect(screen.getByRole('dialog', { name: /Chọn ngày/ })).toBeInTheDocument();
  });

  it('should close date panel when clicking date button again', async () => {
    render(<EventsToolbar {...defaultProps} />);
    const dateBtn = screen.getByRole('button', { name: /Tất cả các ngày/ });
    await userEvent.click(dateBtn);
    expect(screen.getByRole('dialog', { name: /Chọn ngày/ })).toBeInTheDocument();
    await userEvent.click(dateBtn);
    expect(screen.queryByRole('dialog', { name: /Chọn ngày/ })).not.toBeInTheDocument();
  });

  it('should open filter panel when filter button is clicked', async () => {
    render(<EventsToolbar {...defaultProps} />);
    const filterBtn = screen.getByRole('button', { name: /Bộ lọc/ });
    await userEvent.click(filterBtn);
    expect(screen.getByRole('dialog', { name: /Bộ lọc sự kiện/ })).toBeInTheDocument();
  });

  it('should close filter panel when clicking filter button again', async () => {
    render(<EventsToolbar {...defaultProps} />);
    const filterBtn = screen.getByRole('button', { name: /Bộ lọc/ });
    await userEvent.click(filterBtn);
    expect(screen.getByRole('dialog', { name: /Bộ lọc sự kiện/ })).toBeInTheDocument();
    await userEvent.click(filterBtn);
    expect(screen.queryByRole('dialog', { name: /Bộ lọc sự kiện/ })).not.toBeInTheDocument();
  });

  it('should close date panel on Escape key', async () => {
    render(<EventsToolbar {...defaultProps} />);
    const dateBtn = screen.getByRole('button', { name: /Tất cả các ngày/ });
    await userEvent.click(dateBtn);
    expect(screen.getByRole('dialog', { name: /Chọn ngày/ })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Chọn ngày/ })).not.toBeInTheDocument();
    });
  });

  it('should close filter panel on Escape key', async () => {
    render(<EventsToolbar {...defaultProps} />);
    const filterBtn = screen.getByRole('button', { name: /Bộ lọc/ });
    await userEvent.click(filterBtn);
    expect(screen.getByRole('dialog', { name: /Bộ lọc sự kiện/ })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Bộ lọc sự kiện/ })).not.toBeInTheDocument();
    });
  });

  it('should close date panel on outside click', async () => {
    const { container } = render(<EventsToolbar {...defaultProps} />);
    const dateBtn = screen.getByRole('button', { name: /Tất cả các ngày/ });
    await userEvent.click(dateBtn);
    expect(screen.getByRole('dialog', { name: /Chọn ngày/ })).toBeInTheDocument();

    // Click outside the toolbar
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Chọn ngày/ })).not.toBeInTheDocument();
    });
  });

  it('should close filter panel on outside click', async () => {
    render(<EventsToolbar {...defaultProps} />);
    const filterBtn = screen.getByRole('button', { name: /Bộ lọc/ });
    await userEvent.click(filterBtn);
    expect(screen.getByRole('dialog', { name: /Bộ lọc sự kiện/ })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Bộ lọc sự kiện/ })).not.toBeInTheDocument();
    });
  });

  it('should have aria-expanded attribute on date button when panel is open', async () => {
    render(<EventsToolbar {...defaultProps} />);
    const dateBtn = screen.getByRole('button', { name: /Tất cả các ngày/ });
    expect(dateBtn).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(dateBtn);
    expect(dateBtn).toHaveAttribute('aria-expanded', 'true');
  });

  it('should have aria-expanded attribute on filter button when panel is open', async () => {
    render(<EventsToolbar {...defaultProps} />);
    const filterBtn = screen.getByRole('button', { name: /Bộ lọc/ });
    expect(filterBtn).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(filterBtn);
    expect(filterBtn).toHaveAttribute('aria-expanded', 'true');
  });

  it('should have aria-haspopup attribute on both buttons', () => {
    render(<EventsToolbar {...defaultProps} />);
    const dateBtn = screen.getByRole('button', { name: /Tất cả các ngày/ });
    const filterBtn = screen.getByRole('button', { name: /Bộ lọc/ });
    expect(dateBtn).toHaveAttribute('aria-haspopup', 'dialog');
    expect(filterBtn).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('should apply date filter when DatePanel calls onApply', async () => {
    const handleApplyDate = jest.fn();
    render(<EventsToolbar {...defaultProps} onApplyDate={handleApplyDate} />);
    const dateBtn = screen.getByRole('button', { name: /Tất cả các ngày/ });
    await userEvent.click(dateBtn);

    // Click on a preset button to apply a date filter
    const todayPreset = screen.getByRole('button', { name: /Hôm nay/ });
    await userEvent.click(todayPreset);

    // The apply button in DatePanel
    const applyBtn = screen.getByRole('button', { name: /Áp dụng/ });
    await userEvent.click(applyBtn);

    await waitFor(() => {
      expect(handleApplyDate).toHaveBeenCalled();
    });
  });

  it('should apply filters when FilterPanel calls onApply', async () => {
    const handleApplyFilters = jest.fn();
    render(<EventsToolbar {...defaultProps} onApplyFilters={handleApplyFilters} />);
    const filterBtn = screen.getByRole('button', { name: /Bộ lọc/ });
    await userEvent.click(filterBtn);

    // The apply button in FilterPanel
    const applyBtn = screen.getByRole('button', { name: /Áp dụng/ });
    await userEvent.click(applyBtn);

    await waitFor(() => {
      expect(handleApplyFilters).toHaveBeenCalled();
    });
  });

  it('should show date button as active when dateFilter mode is not "all"', () => {
    const dateFilter: DateFilter = { mode: 'today', date: null };
    render(<EventsToolbar {...defaultProps} dateFilter={dateFilter} />);
    const dateBtn = screen.getByRole('button', { name: /Hôm nay/ });
    expect(dateBtn).toHaveClass('btnActive');
  });

  it('should show filter button as active when filters are applied', () => {
    const filters: Filters = {
      city: 'hcm',
      free: false,
      categories: [],
    };
    render(<EventsToolbar {...defaultProps} filters={filters} />);
    const filterBtn = screen.getByRole('button', { name: /Bộ lọc/ });
    expect(filterBtn).toHaveClass('btnActive');
  });
});
