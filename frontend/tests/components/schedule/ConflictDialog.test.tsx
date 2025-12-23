/**
 * ConflictDialog Component Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConflictDialog } from '../../../src/components/schedule/ConflictDialog';

describe('ConflictDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSwitchRSVP = vi.fn();

  const mockNewSession = {
    id: 'session-1',
    title: 'New Session Title',
    start_time: '2026-01-28T14:00:00.000Z',
    end_time: '2026-01-28T15:00:00.000Z',
    location: 'Room A',
  };

  const mockConflictingSession = {
    id: 'session-2',
    title: 'Conflicting Session Title',
    start_time: '2026-01-28T14:30:00.000Z',
    end_time: '2026-01-28T15:30:00.000Z',
    location: 'Room B',
  };

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockOnSwitchRSVP.mockClear();
  });

  it('should render dialog when open', () => {
    render(
      <ConflictDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        newSession={mockNewSession}
        conflictingSession={mockConflictingSession}
      />
    );

    expect(screen.getByText('Cannot RSVP - Schedule Conflict')).toBeInTheDocument();
  });

  it('should not render dialog when closed', () => {
    render(
      <ConflictDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        newSession={mockNewSession}
        conflictingSession={mockConflictingSession}
      />
    );

    expect(screen.queryByText('Cannot RSVP - Schedule Conflict')).not.toBeInTheDocument();
  });

  it('should display new session details', () => {
    render(
      <ConflictDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        newSession={mockNewSession}
        conflictingSession={mockConflictingSession}
      />
    );

    expect(screen.getByText('New Session Title')).toBeInTheDocument();
    expect(screen.getByText('Room A')).toBeInTheDocument();
  });

  it('should display conflicting session details', () => {
    render(
      <ConflictDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        newSession={mockNewSession}
        conflictingSession={mockConflictingSession}
      />
    );

    expect(screen.getByText('Conflicting Session Title')).toBeInTheDocument();
    expect(screen.getByText('Room B')).toBeInTheDocument();
  });

  it('should show "Keep Existing RSVP" button', () => {
    render(
      <ConflictDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        newSession={mockNewSession}
        conflictingSession={mockConflictingSession}
      />
    );

    expect(screen.getByText('Keep Existing RSVP')).toBeInTheDocument();
  });

  it('should close dialog when "Keep Existing RSVP" is clicked', () => {
    render(
      <ConflictDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        newSession={mockNewSession}
        conflictingSession={mockConflictingSession}
      />
    );

    const keepButton = screen.getByText('Keep Existing RSVP');
    fireEvent.click(keepButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should show "Switch to New Session" button when onSwitchRSVP is provided', () => {
    render(
      <ConflictDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        newSession={mockNewSession}
        conflictingSession={mockConflictingSession}
        onSwitchRSVP={mockOnSwitchRSVP}
      />
    );

    expect(screen.getByText('Switch to New Session')).toBeInTheDocument();
  });

  it('should not show "Switch to New Session" button when onSwitchRSVP is not provided', () => {
    render(
      <ConflictDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        newSession={mockNewSession}
        conflictingSession={mockConflictingSession}
      />
    );

    expect(screen.queryByText('Switch to New Session')).not.toBeInTheDocument();
  });

  it('should call onSwitchRSVP and close dialog when "Switch to New Session" is clicked', () => {
    render(
      <ConflictDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        newSession={mockNewSession}
        conflictingSession={mockConflictingSession}
        onSwitchRSVP={mockOnSwitchRSVP}
      />
    );

    const switchButton = screen.getByText('Switch to New Session');
    fireEvent.click(switchButton);

    expect(mockOnSwitchRSVP).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should display helpful message about switching or keeping RSVP', () => {
    render(
      <ConflictDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        newSession={mockNewSession}
        conflictingSession={mockConflictingSession}
        onSwitchRSVP={mockOnSwitchRSVP}
      />
    );

    expect(
      screen.getByText('You can switch your RSVP to the new session, or keep your existing registration.')
    ).toBeInTheDocument();
  });

  it('should display "Requested Session" label', () => {
    render(
      <ConflictDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        newSession={mockNewSession}
        conflictingSession={mockConflictingSession}
      />
    );

    expect(screen.getByText('Requested Session')).toBeInTheDocument();
  });

  it('should display "Already Registered For" label', () => {
    render(
      <ConflictDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        newSession={mockNewSession}
        conflictingSession={mockConflictingSession}
      />
    );

    expect(screen.getByText('Already Registered For')).toBeInTheDocument();
  });

  it('should handle sessions without location', () => {
    const sessionWithoutLocation = {
      id: 'session-3',
      title: 'Session Without Location',
      start_time: '2026-01-28T14:00:00.000Z',
      end_time: '2026-01-28T15:00:00.000Z',
    };

    render(
      <ConflictDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        newSession={sessionWithoutLocation}
        conflictingSession={mockConflictingSession}
      />
    );

    expect(screen.getByText('Session Without Location')).toBeInTheDocument();
  });

  it('should handle null sessions gracefully', () => {
    render(
      <ConflictDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        newSession={null}
        conflictingSession={null}
      />
    );

    // Dialog should still render without crashing
    expect(screen.getByText('Cannot RSVP - Schedule Conflict')).toBeInTheDocument();
  });
});
