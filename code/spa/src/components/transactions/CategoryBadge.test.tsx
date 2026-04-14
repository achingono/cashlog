import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategoryBadge } from './CategoryBadge';

describe('CategoryBadge', () => {
  it('renders uncategorized label when category is null', () => {
    render(<CategoryBadge category={null} />);
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
  });

  it('renders category name and triggers click handler', () => {
    const onClick = vi.fn();
    render(<CategoryBadge category={{ id: 'c1', name: 'Food', icon: 'Utensils', color: 'blue' }} onClick={onClick} />);

    fireEvent.click(screen.getByText('Food'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
