/**
 * Tests for src/components/organizer/create-event/TicketTypeModal.tsx
 *
 * Covers the read-only "Suất diễn" schedule display and the sale-window rule
 * it exists to support (selling must stop 30 minutes before the show starts).
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { TicketTypeModal } from '@/components/organizer/create-event/TicketTypeModal'

describe('TicketTypeModal', () => {
  const onClose = jest.fn()
  const onSave = jest.fn()

  // Show runs 20:00 → 22:00 on 26/07/2026, so sales must close by 19:30.
  const SHOW_START = '2026-07-26T20:00'
  const SHOW_END = '2026-07-26T22:00'

  const renderModal = (props: Partial<React.ComponentProps<typeof TicketTypeModal>> = {}) =>
    render(
      <TicketTypeModal
        ticket={null}
        showStartTime={SHOW_START}
        showEndTime={SHOW_END}
        onClose={onClose}
        onSave={onSave}
        {...props}
      />
    )

  beforeEach(() => {
    onClose.mockClear()
    onSave.mockClear()
  })

  describe('show schedule display', () => {
    it('should show the start and end time of the show being sold into', () => {
      renderModal()
      expect(screen.getByText('Suất diễn:')).toBeInTheDocument()
      expect(
        screen.getByLabelText('Từ 20:00 26/07/2026 đến 22:00 26/07/2026')
      ).toBeInTheDocument()
    })

    it('should hide the schedule row when the show has no times yet', () => {
      renderModal({ showStartTime: '', showEndTime: '' })
      expect(screen.queryByText('Suất diễn:')).not.toBeInTheDocument()
    })

    it('should fall back to a dash when only one side is filled in', () => {
      renderModal({ showEndTime: '' })
      expect(screen.getByLabelText('Từ 20:00 26/07/2026 đến —')).toBeInTheDocument()
    })
  })

  describe('sale window cap', () => {
    // The wizard's Field wrapper renders a plain <label> with no htmlFor, so the
    // date pickers are reached positionally: [0] = sale start, [1] = sale end.
    const saleEndInput = (container: HTMLElement) =>
      container.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]')[1]

    it('should cap the sale-end picker 30 minutes before the show starts', () => {
      const { container } = renderModal()
      expect(saleEndInput(container)).toHaveAttribute('max', '2026-07-26T19:30')
    })

    it('should prefill a new ticket sale end at that cap', () => {
      const { container } = renderModal()
      expect(saleEndInput(container)).toHaveValue('2026-07-26T19:30')
    })
  })
})
