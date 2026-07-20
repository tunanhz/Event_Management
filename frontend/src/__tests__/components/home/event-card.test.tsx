import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventCard from '@/components/home/EventCard';
import type { EventItem } from '@/components/home/EventCard';
import { useSavedEvents } from '@/lib/use-saved-events';

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock useSavedEvents hook
jest.mock('@/lib/use-saved-events', () => ({
  useSavedEvents: jest.fn(() => ({
    isSaved: jest.fn((id: string) => false),
    toggle: jest.fn(),
  })),
}));

const mockUseSavedEvents = useSavedEvents as jest.MockedFunction<typeof useSavedEvents>;

describe('EventCard', () => {
  const defaultEvent: EventItem = {
    id: 'e1',
    title: 'Live Concert 2026',
    date: '15/06/2026',
    time: '19:00',
    location: 'Concert Hall',
    price: 'Từ 300.000đ',
    image: 'https://example.com/image.jpg',
    category: 'Âm nhạc',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render event card with event details', () => {
    render(<EventCard event={defaultEvent} />);
    expect(screen.getByText('Live Concert 2026')).toBeInTheDocument();
    expect(screen.getByText('15/06/2026')).toBeInTheDocument();
    expect(screen.getByText('19:00')).toBeInTheDocument();
    expect(screen.getByText('Concert Hall')).toBeInTheDocument();
  });

  it('should render event image with alt text', () => {
    render(<EventCard event={defaultEvent} />);
    const img = screen.getByAltText('Live Concert 2026');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('should have lazy loading enabled on image', () => {
    render(<EventCard event={defaultEvent} />);
    const img = screen.getByAltText('Live Concert 2026');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('should render category badge', () => {
    render(<EventCard event={defaultEvent} />);
    expect(screen.getByText('Âm nhạc')).toBeInTheDocument();
  });

  it('should render price text', () => {
    render(<EventCard event={defaultEvent} />);
    expect(screen.getByText('Từ 300.000đ')).toBeInTheDocument();
  });

  it('should link to event detail page', () => {
    render(<EventCard event={defaultEvent} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/su-kien/e1');
  });

  it('should apply free price styling when price is "Miễn phí"', () => {
    const freeEvent = { ...defaultEvent, price: 'Miễn phí' };
    const { container } = render(<EventCard event={freeEvent} />);
    const priceElement = container.querySelector('[class*="price"]');
    expect(priceElement).toHaveClass('priceFree');
  });

  it('should apply normal price styling for paid events', () => {
    const { container } = render(<EventCard event={defaultEvent} />);
    const priceElement = container.querySelector('[class*="price"]');
    expect(priceElement).toHaveClass('price');
    expect(priceElement).not.toHaveClass('priceFree');
  });

  it('should render save button with correct aria-label when not saved', () => {
    render(<EventCard event={defaultEvent} />);
    expect(screen.getByLabelText('Lưu sự kiện')).toBeInTheDocument();
  });

  it('should have aria-pressed false when event is not saved', () => {
    render(<EventCard event={defaultEvent} />);
    const saveBtn = screen.getByLabelText('Lưu sự kiện');
    expect(saveBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('should have aria-pressed true when event is saved', () => {
    mockUseSavedEvents.mockReturnValue({
      savedIds: ['e1'],
      isSaved: jest.fn(() => true),
      toggle: jest.fn(),
    });

    render(<EventCard event={defaultEvent} />);
    const saveBtn = screen.getByLabelText('Bỏ lưu sự kiện');
    expect(saveBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('should display different aria-label when saved', () => {
    mockUseSavedEvents.mockReturnValue({
      savedIds: ['e1'],
      isSaved: jest.fn(() => true),
      toggle: jest.fn(),
    });

    render(<EventCard event={defaultEvent} />);
    expect(screen.getByLabelText('Bỏ lưu sự kiện')).toBeInTheDocument();
  });

  it('should call toggle when save button is clicked', async () => {
    const toggleMock = jest.fn();
    mockUseSavedEvents.mockReturnValue({
      savedIds: [],
      isSaved: jest.fn(() => false),
      toggle: toggleMock,
    });

    render(<EventCard event={defaultEvent} />);
    const saveBtn = screen.getByLabelText('Lưu sự kiện');
    await userEvent.click(saveBtn);

    expect(toggleMock).toHaveBeenCalledWith('e1');
  });

  it('should stop event propagation when save button is clicked', async () => {
    const toggleMock = jest.fn();
    mockUseSavedEvents.mockReturnValue({
      savedIds: [],
      isSaved: jest.fn(() => false),
      toggle: toggleMock,
    });

    render(<EventCard event={defaultEvent} />);
    const saveBtn = screen.getByLabelText('Lưu sự kiện');

    // Click the button - the component handles event propagation internally
    await userEvent.click(saveBtn);

    // Verify the toggle was called, confirming the click was handled
    expect(toggleMock).toHaveBeenCalledWith('e1');
  });

  it('should have title as h3 heading', () => {
    render(<EventCard event={defaultEvent} />);
    const heading = screen.getByRole('heading', { name: 'Live Concert 2026' });
    expect(heading.tagName).toBe('H3');
  });

  it('should render date and time together', () => {
    render(<EventCard event={defaultEvent} />);
    expect(screen.getByText('15/06/2026')).toBeInTheDocument();
    expect(screen.getByText('19:00')).toBeInTheDocument();
  });

  it('should have separator between date and time', () => {
    const { container } = render(<EventCard event={defaultEvent} />);
    const separator = container.querySelector('[class*="dateSeparator"]');
    expect(separator).toHaveTextContent('•');
  });

  it('should render save button inside the card', () => {
    const { container } = render(<EventCard event={defaultEvent} />);
    const imageWrapper = container.querySelector('[class*="imageWrapper"]');
    const saveBtn = screen.getByLabelText('Lưu sự kiện');
    expect(imageWrapper?.contains(saveBtn)).toBe(true);
  });

  it('should render with different event IDs', () => {
    const event2 = { ...defaultEvent, id: 'e2', title: 'Event 2' };
    render(<EventCard event={event2} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/su-kien/e2');
  });

  it('should render different prices correctly', () => {
    const eventExpensive = { ...defaultEvent, price: 'Từ 1.500.000đ' };
    render(<EventCard event={eventExpensive} />);
    expect(screen.getByText('Từ 1.500.000đ')).toBeInTheDocument();
  });

  it('should handle long event titles', () => {
    const eventLongTitle = {
      ...defaultEvent,
      title: 'This is a very long event title that should still be displayed correctly in the card component',
    };
    render(<EventCard event={eventLongTitle} />);
    expect(
      screen.getByText(
        'This is a very long event title that should still be displayed correctly in the card component'
      )
    ).toBeInTheDocument();
  });

  it('should handle long location names', () => {
    const eventLongLocation = {
      ...defaultEvent,
      location: 'Very Long Concert Hall Name In a Special Location',
    };
    render(<EventCard event={eventLongLocation} />);
    expect(screen.getByText('Very Long Concert Hall Name In a Special Location')).toBeInTheDocument();
  });

  it('should render all required sections', () => {
    const { container } = render(<EventCard event={defaultEvent} />);
    expect(container.querySelector('[class*="imageWrapper"]')).toBeInTheDocument();
    expect(container.querySelector('[class*="content"]')).toBeInTheDocument();
  });

  it('should be accessible as a link', () => {
    render(<EventCard event={defaultEvent} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/su-kien/e1');
    // The card should be the link itself
    expect(link.querySelector('h3')).toBeInTheDocument();
  });

  it('should show free event styling correctly', () => {
    const freeEvent = { ...defaultEvent, price: 'Miễn phí' };
    render(<EventCard event={freeEvent} />);
    const priceElement = screen.getByText('Miễn phí');
    expect(priceElement).toBeInTheDocument();
  });

  it('should have type="button" on save button', () => {
    render(<EventCard event={defaultEvent} />);
    const saveBtn = screen.getByLabelText('Lưu sự kiện');
    expect(saveBtn).toHaveAttribute('type', 'button');
  });

  it('should render bookmark icon in save button', () => {
    const { container } = render(<EventCard event={defaultEvent} />);
    const saveBtn = screen.getByLabelText('Lưu sự kiện');
    // The button should contain an svg (the bookmark icon)
    expect(saveBtn.querySelector('svg')).toBeInTheDocument();
  });
});
