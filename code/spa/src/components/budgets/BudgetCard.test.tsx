import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BudgetCard } from './BudgetCard';

const budget = {
  id: 'b1',
  categoryId: 'c1',
  categoryName: 'Food',
  categoryIcon: 'Utensils',
  categoryColor: 'blue',
  amount: 500,
  spent: 450,
  remaining: 50,
  percentUsed: 90,
  period: 'MONTHLY',
  startDate: '2026-01-01',
  endDate: null,
};

describe('BudgetCard', () => {
  it('renders budget details and supports edit/delete actions', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(<BudgetCard budget={budget} onEdit={onEdit} onDelete={onDelete} />);

    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('$450.00 of $500.00')).toBeInTheDocument();

    const iconButtons = screen.getAllByRole('button');
    fireEvent.click(iconButtons[0]);
    fireEvent.click(iconButtons[1]);

    expect(onEdit).toHaveBeenCalledWith(budget);
    expect(onDelete).toHaveBeenCalledWith('b1');
  });
});
