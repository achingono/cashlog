import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GoalCard } from './GoalCard';

const goal = {
  id: 'g1',
  name: 'Emergency Fund',
  targetAmount: 1000,
  currentAmount: 1100,
  percentComplete: 110,
  targetDate: '2026-06-01',
  status: 'COMPLETED' as const,
  icon: null,
  color: null,
  notes: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  accounts: [{ id: 'a1', name: 'Checking', institution: 'Bank', type: 'CHECKING', balance: 1100 }],
};

describe('GoalCard', () => {
  it('renders goal information and fires click callback', () => {
    const onClick = vi.fn();
    render(<GoalCard goal={goal} onClick={onClick} />);

    expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('Goal reached!')).toBeInTheDocument();
    expect(screen.getByText('Linked accounts:')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Emergency Fund'));
    expect(onClick).toHaveBeenCalledWith(goal);
  });
});
