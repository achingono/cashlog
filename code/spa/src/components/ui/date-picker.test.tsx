import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DatePicker } from './date-picker';

describe('DatePicker', () => {
  it('supports typing a date through a labeled input', () => {
    const onChange = vi.fn();

    render(
      <div>
        <label htmlFor="purchaseDate">Purchase Date</label>
        <DatePicker
          id="purchaseDate"
          value=""
          onChange={onChange}
          placeholder="Select purchase date"
        />
      </div>,
    );

    fireEvent.change(screen.getByLabelText('Purchase Date'), {
      target: { value: '1998-05-14' },
    });

    expect(onChange).toHaveBeenCalledWith('1998-05-14');
  });

  it('renders the provided date value in the shared input field', () => {
    render(
      <DatePicker
        id="targetDate"
        value="1984-01-24"
        onChange={() => undefined}
        placeholder="Select target date"
      />,
    );

    expect(screen.getByDisplayValue('1984-01-24')).toBeInTheDocument();
  });
});