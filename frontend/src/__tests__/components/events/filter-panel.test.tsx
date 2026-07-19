import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterPanel from '@/components/events/FilterPanel';
import type { Filters } from '@/components/events/events-types';

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('FilterPanel', () => {
  const defaultProps = {
    initial: {
      city: 'all' as const,
      free: false,
      categories: [],
    } satisfies Filters,
    onApply: jest.fn(),
    onReset: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the filter panel dialog', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByRole('dialog', { name: /Bộ lọc sự kiện/ })).toBeInTheDocument();
  });

  it('should render location section with city radio buttons', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /Vị trí/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/Toàn quốc/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hồ Chí Minh/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hà Nội/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Đà Lạt/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Vị trí khác/)).toBeInTheDocument();
  });

  it('should show correct city as checked', () => {
    const initial: Filters = {
      city: 'hcm',
      free: false,
      categories: [],
    };
    render(<FilterPanel {...defaultProps} initial={initial} />);
    expect(screen.getByLabelText(/Hồ Chí Minh/)).toBeChecked();
  });

  it('should render price section with free toggle switch', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /Giá tiền/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/Chỉ hiển thị sự kiện miễn phí/)).toBeInTheDocument();
  });

  it('should show free toggle as unchecked when initial free is false', () => {
    render(<FilterPanel {...defaultProps} />);
    const toggle = screen.getByLabelText(/Chỉ hiển thị sự kiện miễn phí/);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('should show free toggle as checked when initial free is true', () => {
    const initial: Filters = {
      city: 'all',
      free: true,
      categories: [],
    };
    render(<FilterPanel {...defaultProps} initial={initial} />);
    const toggle = screen.getByLabelText(/Chỉ hiển thị sự kiện miễn phí/);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('should render category section with category chips', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /Thể loại/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nhạc sống/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sân khấu & Nghệ thuật/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thể Thao/ })).toBeInTheDocument();
  });

  it('should toggle category selection when clicking a chip', async () => {
    const handleApply = jest.fn();
    render(<FilterPanel {...defaultProps} onApply={handleApply} />);

    const musicBtn = screen.getByRole('button', { name: /Nhạc sống/ });
    expect(musicBtn).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(musicBtn);
    expect(musicBtn).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(musicBtn);
    expect(musicBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('should show multiple selected categories', async () => {
    const handleApply = jest.fn();
    render(<FilterPanel {...defaultProps} onApply={handleApply} />);

    const musicBtn = screen.getByRole('button', { name: /Nhạc sống/ });
    const theaterBtn = screen.getByRole('button', { name: /Sân khấu & Nghệ thuật/ });

    await userEvent.click(musicBtn);
    await userEvent.click(theaterBtn);

    expect(musicBtn).toHaveAttribute('aria-pressed', 'true');
    expect(theaterBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('should render Reset button', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Thiết lập lại/ })).toBeInTheDocument();
  });

  it('should render Apply button', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Áp dụng/ })).toBeInTheDocument();
  });

  it('should call onApply with current state when Apply button is clicked', async () => {
    const handleApply = jest.fn();
    render(
      <FilterPanel
        {...defaultProps}
        initial={{
          city: 'all',
          free: false,
          categories: [],
        }}
        onApply={handleApply}
      />
    );

    const musicBtn = screen.getByRole('button', { name: /Nhạc sống/ });
    await userEvent.click(musicBtn);

    const applyBtn = screen.getByRole('button', { name: /Áp dụng/ });
    await userEvent.click(applyBtn);

    expect(handleApply).toHaveBeenCalledWith({
      city: 'all',
      free: false,
      categories: ['nhac-song'],
    });
  });

  it('should call onApply with all filter values', async () => {
    const handleApply = jest.fn();
    render(
      <FilterPanel
        {...defaultProps}
        initial={{
          city: 'all',
          free: false,
          categories: [],
        }}
        onApply={handleApply}
      />
    );

    // Change city
    const hcmRadio = screen.getByLabelText(/Hồ Chí Minh/);
    await userEvent.click(hcmRadio);

    // Toggle free
    const freeToggle = screen.getByLabelText(/Chỉ hiển thị sự kiện miễn phí/);
    await userEvent.click(freeToggle);

    // Select categories
    const musicBtn = screen.getByRole('button', { name: /Nhạc sống/ });
    const theaterBtn = screen.getByRole('button', { name: /Sân khấu & Nghệ thuật/ });
    await userEvent.click(musicBtn);
    await userEvent.click(theaterBtn);

    // Apply
    const applyBtn = screen.getByRole('button', { name: /Áp dụng/ });
    await userEvent.click(applyBtn);

    expect(handleApply).toHaveBeenCalledWith({
      city: 'hcm',
      free: true,
      categories: ['nhac-song', 'san-khau'],
    });
  });

  it('should reset all filters when Reset button is clicked', async () => {
    const handleApply = jest.fn();
    const handleReset = jest.fn();
    render(
      <FilterPanel
        {...defaultProps}
        initial={{
          city: 'hcm',
          free: true,
          categories: ['nhac-song'],
        }}
        onApply={handleApply}
        onReset={handleReset}
      />
    );

    const resetBtn = screen.getByRole('button', { name: /Thiết lập lại/ });
    await userEvent.click(resetBtn);

    expect(handleReset).toHaveBeenCalled();

    // Check that all filters are reset
    expect(screen.getByLabelText(/Toàn quốc/)).toBeChecked();
    expect(screen.getByLabelText(/Chỉ hiển thị sự kiện miễn phí/)).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(screen.getByRole('button', { name: /Nhạc sống/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('should call onApply when reset is clicked (after reset)', async () => {
    const handleApply = jest.fn();
    const handleReset = jest.fn();
    render(
      <FilterPanel
        {...defaultProps}
        initial={{
          city: 'hcm',
          free: true,
          categories: ['nhac-song'],
        }}
        onApply={handleApply}
        onReset={handleReset}
      />
    );

    const resetBtn = screen.getByRole('button', { name: /Thiết lập lại/ });
    await userEvent.click(resetBtn);

    expect(handleReset).toHaveBeenCalled();
  });

  it('should support changing city with radio buttons', async () => {
    const handleApply = jest.fn();
    render(<FilterPanel {...defaultProps} onApply={handleApply} />);

    const hcmRadio = screen.getByLabelText(/Hồ Chí Minh/);
    const hanoi = screen.getByLabelText(/Hà Nội/);

    await userEvent.click(hcmRadio);
    expect(hcmRadio).toBeChecked();

    await userEvent.click(hanoi);
    expect(hanoi).toBeChecked();
    expect(hcmRadio).not.toBeChecked();

    const applyBtn = screen.getByRole('button', { name: /Áp dụng/ });
    await userEvent.click(applyBtn);

    expect(handleApply).toHaveBeenCalledWith({
      city: 'hanoi',
      free: false,
      categories: [],
    });
  });

  it('should support toggling free filter', async () => {
    const handleApply = jest.fn();
    render(<FilterPanel {...defaultProps} onApply={handleApply} />);

    const freeToggle = screen.getByLabelText(/Chỉ hiển thị sự kiện miễn phí/);

    await userEvent.click(freeToggle);
    expect(freeToggle).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(freeToggle);
    expect(freeToggle).toHaveAttribute('aria-checked', 'false');
  });

  it('should preserve initial city selection', () => {
    const initial: Filters = {
      city: 'dalat',
      free: false,
      categories: [],
    };
    render(<FilterPanel {...defaultProps} initial={initial} />);
    expect(screen.getByLabelText(/Đà Lạt/)).toBeChecked();
  });

  it('should preserve initial free toggle state', () => {
    const initial: Filters = {
      city: 'all',
      free: true,
      categories: [],
    };
    render(<FilterPanel {...defaultProps} initial={initial} />);
    expect(screen.getByLabelText(/Chỉ hiển thị sự kiện miễn phí/)).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('should preserve initial categories selection', () => {
    const initial: Filters = {
      city: 'all',
      free: false,
      categories: ['nhac-song', 'san-khau'],
    };
    render(<FilterPanel {...defaultProps} initial={initial} />);
    expect(screen.getByRole('button', { name: /Nhạc sống/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /Sân khấu & Nghệ thuật/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('should have role="dialog" for accessibility', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should have aria-label for the dialog', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByRole('dialog', { name: /Bộ lọc sự kiện/ })).toBeInTheDocument();
  });

  it('should have role="switch" for free toggle', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('should have aria-pressed for category buttons', () => {
    render(<FilterPanel {...defaultProps} />);
    const musicBtn = screen.getByRole('button', { name: /Nhạc sống/ });
    expect(musicBtn).toHaveAttribute('aria-pressed');
  });
});
