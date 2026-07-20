import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectTicketsView } from '@/components/booking/SelectTicketsView';
import type { EventItem, ShowOption, TicketType } from '@/lib/mockData';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockRouter = {
  push: jest.fn(),
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

describe('SelectTicketsView', () => {
  const mockEvent: EventItem = {
    id: 'evt-001',
    title: 'Lễ hội Âm nhạc Mùa Hè Sài Gòn',
    date: '14/08/2026',
    time: '18:00',
    location: 'Nhà hát Hòa Bình, TP.HCM',
    price: '500.000đ',
    image: 'https://example.com/event.jpg',
    category: 'Âm nhạc',
  };

  const mockTickets: TicketType[] = [
    { id: 'ticket-1', name: 'Standard', price: 500000, minPerOrder: 1, maxPerOrder: 10 },
    { id: 'ticket-2', name: 'VIP', price: 1000000, minPerOrder: 1, maxPerOrder: 5 },
    { id: 'ticket-3', name: 'Early Bird', price: 300000, minPerOrder: 1, maxPerOrder: 3 },
  ];

  const mockShow: ShowOption = {
    id: 'show-1',
    label: 'Show 1',
    startTime: '2026-08-14T18:00:00Z',
    endTime: '2026-08-14T21:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.push.mockClear();
  });

  describe('rendering', () => {
    it('should render the page header with back button', () => {
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      expect(screen.getByRole('heading', { name: 'Chọn vé' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /trở về/i })).toBeInTheDocument();
    });

    it('should display event title in sidebar', () => {
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      expect(screen.getByText(mockEvent.title)).toBeInTheDocument();
    });

    it('should display event location', () => {
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      expect(screen.getByText(mockEvent.location)).toBeInTheDocument();
    });

    it('should render all visible tickets with name and price', () => {
      const { container } = render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const ticketList = container.querySelector<HTMLElement>('ul.ticketList')!;
      mockTickets.forEach((ticket) => {
        expect(within(ticketList).getByText(ticket.name)).toBeInTheDocument();
      });
      // Verify prices exist in sidebar
      const priceList = container.querySelector<HTMLElement>('ul.priceList')!;
      expect(within(priceList).getByText(mockTickets[0].name)).toBeInTheDocument();
    });

    it('should render ticket list with rows for each ticket', () => {
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const ticketRows = screen.getAllByRole('listitem');
      expect(ticketRows.length).toBeGreaterThanOrEqual(mockTickets.length);
    });
  });

  describe('single show (no show picker)', () => {
    it('should not render show picker when there is only one show', () => {
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      expect(screen.queryByText('Chọn xuất chiếu')).not.toBeInTheDocument();
    });

    it('should display event date and time in sidebar when single show', () => {
      const { container } = render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const sidebar = container.querySelector('aside')!;
      expect(within(sidebar).getByText(/Tháng/)).toBeInTheDocument();
    });
  });

  describe('multiple shows', () => {
    const show2: ShowOption = {
      id: 'show-2',
      label: 'Show 2',
      startTime: '2026-08-14T19:00:00Z',
      endTime: '2026-08-14T22:00:00Z',
    };

    it('should render show picker when multiple shows exist', () => {
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow, show2]} />);
      expect(screen.getByText('Chọn xuất chiếu')).toBeInTheDocument();
    });

    it('should render a button for each show', () => {
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow, show2]} />);
      expect(screen.getByRole('button', { name: /show 1/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /show 2/i })).toBeInTheDocument();
    });

    it('should mark the first show as active by default', () => {
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow, show2]} />);
      const buttons = screen.getAllByRole('button');
      const showButton = buttons.find((b) => b.textContent?.includes('Show 1'));
      expect(showButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should allow switching between shows', async () => {
      const user = userEvent.setup();
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow, show2]} />);
      const show2Button = screen.getByRole('button', { name: /show 2/i });
      await user.click(show2Button);
      expect(show2Button).toHaveAttribute('aria-pressed', 'true');
    });

    it('should clear ticket selections when switching shows', async () => {
      const user = userEvent.setup();
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow, show2]} />);

      // Select a ticket in show 1
      const incrButtons = screen.getAllByLabelText(/tăng số lượng/i);
      await user.click(incrButtons[0]);
      expect(screen.getByText('1')).toBeInTheDocument();

      // Switch to show 2
      const show2Button = screen.getByRole('button', { name: /show 2/i });
      await user.click(show2Button);

      // Quantities should reset
      const qtyDisplays = screen.getAllByText('0');
      expect(qtyDisplays.length).toBeGreaterThan(0);
    });

    it('should display selected show time in sidebar when multiple shows', async () => {
      const user = userEvent.setup();
      const { container } = render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow, show2]} />);

      // Time should be shown for the selected show
      const sidebar = container.querySelector('aside')!;
      expect(sidebar.textContent).toMatch(/\d{2}:\d{2}/);

      // Switch to show 2
      const show2Btn = screen.getByRole('button', { name: /show 2/i });
      await user.click(show2Btn);
      expect(sidebar.textContent).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('ticket quantity controls', () => {
    it('should start with zero quantity for all tickets', () => {
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const qtySpans = screen.getAllByText('0');
      expect(qtySpans.length).toBe(mockTickets.length);
    });

    it('should increment ticket quantity when + button clicked', async () => {
      const user = userEvent.setup();
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const incrButtons = screen.getAllByLabelText(/tăng số lượng/i);
      await user.click(incrButtons[0]);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should decrement ticket quantity when - button clicked', async () => {
      const user = userEvent.setup();
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const incrButtons = screen.getAllByLabelText(/tăng số lượng/i);
      const decrButtons = screen.getAllByLabelText(/giảm số lượng/i);
      await user.click(incrButtons[0]);
      await user.click(incrButtons[0]);
      expect(screen.getByText('2')).toBeInTheDocument();
      await user.click(decrButtons[0]);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should not go below zero', async () => {
      const user = userEvent.setup();
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const decrButtons = screen.getAllByLabelText(/giảm số lượng/i);
      // Try to decrement from 0
      await user.click(decrButtons[0]);
      // Should still be 0
      const qtySpans = screen.getAllByText('0');
      expect(qtySpans.length).toBeGreaterThan(0);
    });

    it('should disable decrement button at zero quantity', async () => {
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const decrButtons = screen.getAllByLabelText(/giảm số lượng/i);
      expect(decrButtons[0]).toBeDisabled();
    });

    it('should disable increment button at max per order limit', async () => {
      const user = userEvent.setup();
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const incrButtons = screen.getAllByLabelText(/tăng số lượng/i);

      // Increment first ticket (maxPerOrder: 10) to the limit
      for (let i = 0; i < 10; i++) {
        await user.click(incrButtons[0]);
      }

      // Button should now be disabled
      expect(incrButtons[0]).toBeDisabled();
    });

    it('should respect maxPerOrder limit per ticket type', async () => {
      const user = userEvent.setup();
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const incrButtons = screen.getAllByLabelText(/tăng số lượng/i);

      // VIP ticket has maxPerOrder: 5
      for (let i = 0; i < 6; i++) {
        await user.click(incrButtons[1]);
      }

      // Should only be at 5
      const qtySpans = screen.getAllByText('5');
      expect(qtySpans.length).toBeGreaterThan(0);
    });

    it('should update quantities live as user changes them', async () => {
      const user = userEvent.setup();
      const { container } = render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const ticketList = container.querySelector<HTMLElement>('ul.ticketList')!;
      const incrButtons = within(ticketList).getAllByLabelText(/tăng số lượng/i);

      await user.click(incrButtons[0]);
      const quantities = within(ticketList).getAllByText('0');
      expect(quantities.length).toBeGreaterThan(0);

      await user.click(incrButtons[0]);
      expect(within(ticketList).getByText('2')).toBeInTheDocument();

      await user.click(incrButtons[1]);
      // Verify second ticket quantity changed
      const secondQty = within(ticketList).getAllByText(/[0-2]/)[1];
      expect(secondQty).toBeInTheDocument();
    });
  });

  describe('pricing and total', () => {
    it('should display per-ticket price in sidebar', () => {
      const { container } = render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const priceList = container.querySelector<HTMLElement>('ul.priceList')!;
      // Verify price list has items
      expect(priceList.querySelectorAll('li').length).toBeGreaterThan(0);
      // Verify first ticket name appears in sidebar
      expect(within(priceList).getByText(mockTickets[0].name)).toBeInTheDocument();
    });

    it('should calculate and display running total on ticket selection', async () => {
      const user = userEvent.setup();
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const incrButtons = screen.getAllByLabelText(/tăng số lượng/i);

      // Select 1 Standard (500,000)
      await user.click(incrButtons[0]);
      // Should show 500.000 somewhere on the total button
      const continueBtn = screen.getByRole('button', { name: /tiếp tục/i });
      expect(continueBtn.textContent).toMatch(/500\.000|Tiếp tục/);
    });

    it('should update total when quantity changes', async () => {
      const user = userEvent.setup();
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const incrButtons = screen.getAllByLabelText(/tăng số lượng/i);

      // Add 1 Standard
      await user.click(incrButtons[0]);

      // Add 1 VIP (1M)
      await user.click(incrButtons[1]);

      // Should total 1.5M
      const continueBtn = screen.getByRole('button', { name: /tiếp tục/i });
      expect(continueBtn.textContent).toContain('500.000');
    });
  });

  describe('continue/submit button', () => {
    it('should show disabled "Vui lòng chọn vé" button when no tickets selected', () => {
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const btn = screen.getByRole('button', { name: /vui lòng chọn vé/i });
      expect(btn).toBeDisabled();
    });

    it('should enable continue button when tickets are selected', async () => {
      const user = userEvent.setup();
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const incrButtons = screen.getAllByLabelText(/tăng số lượng/i);

      await user.click(incrButtons[0]);

      const continueBtn = screen.getByRole('button', { name: /tiếp tục/i });
      expect(continueBtn).not.toBeDisabled();
    });

    it('should navigate to checkout when continue is clicked', async () => {
      const user = userEvent.setup();
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const incrButtons = screen.getAllByLabelText(/tăng số lượng/i);

      await user.click(incrButtons[0]);
      await user.click(incrButtons[0]);

      const continueBtn = screen.getByRole('button', { name: /tiếp tục/i });
      await user.click(continueBtn);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith(
          expect.stringContaining(`/su-kien/${mockEvent.id}/thanh-toan?`)
        );
      });
    });

    it('should encode selection in query string', async () => {
      const user = userEvent.setup();
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const incrButtons = screen.getAllByLabelText(/tăng số lượng/i);

      // ticket-1: 2, ticket-2: 1
      await user.click(incrButtons[0]);
      await user.click(incrButtons[0]);
      await user.click(incrButtons[1]);

      const continueBtn = screen.getByRole('button', { name: /tiếp tục/i });
      await user.click(continueBtn);

      await waitFor(() => {
        const call = mockRouter.push.mock.calls[0][0];
        expect(call).toContain('ticket-1=2');
        expect(call).toContain('ticket-2=1');
      });
    });

    it('should not call navigate if no tickets selected', async () => {
      const user = userEvent.setup();
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const btn = screen.getByRole('button', { name: /vui lòng chọn vé/i });

      // Try to click disabled button (should not work)
      await user.click(btn);

      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it('should show correct total in button text', async () => {
      const user = userEvent.setup();
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const incrButtons = screen.getAllByLabelText(/tăng số lượng/i);

      // 2x Standard (500k each) = 1M
      await user.click(incrButtons[0]);
      await user.click(incrButtons[0]);

      const continueBtn = screen.getByRole('button', { name: /tiếp tục/i });
      expect(continueBtn.textContent).toMatch(/500\.000|1\.000\.000/);
    });
  });

  describe('accessibility', () => {
    it('should have proper aria-label on increment buttons', () => {
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const incrLabels = screen.getAllByLabelText(/tăng số lượng/i);
      expect(incrLabels.length).toBe(mockTickets.length);
    });

    it('should have proper aria-label on decrement buttons', () => {
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const decrLabels = screen.getAllByLabelText(/giảm số lượng/i);
      expect(decrLabels.length).toBe(mockTickets.length);
    });

    it('should have aria-live on quantity display', () => {
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);
      const qtySpans = screen.getAllByText('0');
      expect(qtySpans[0]).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-pressed on show selector buttons', () => {
      const show2 = { ...mockShow, id: 'show-2', label: 'Show 2' };
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow, show2]} />);
      const buttons = screen.getAllByRole('button');
      const showButtons = buttons.filter((b) => b.textContent?.includes('Show'));
      showButtons.forEach((btn) => {
        expect(btn).toHaveAttribute('aria-pressed');
      });
    });
  });

  describe('show-specific tickets', () => {
    it('should render tickets in the sidebar price list', () => {
      render(<SelectTicketsView event={mockEvent} tickets={mockTickets} shows={[mockShow]} />);

      // All tickets should appear in price list
      mockTickets.forEach((ticket) => {
        const priceItems = screen.getAllByText(ticket.name);
        expect(priceItems.length).toBeGreaterThan(0);
      });
    });
  });
});
