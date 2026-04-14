import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { validate } from './validation';

describe('validate middleware', () => {
  it('parses valid payload and calls next', () => {
    const middleware = validate(z.object({ amount: z.number().positive() }), 'body');
    const req: any = { body: { amount: 10 } };
    const res: any = {};
    const next = vi.fn();

    middleware(req, res, next);

    expect(req.body).toEqual({ amount: 10 });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns a 400 response for zod errors', () => {
    const middleware = validate(z.object({ amount: z.number().positive() }), 'body');
    const req: any = { body: { amount: -3 } };
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res: any = { status };
    const next = vi.fn();

    middleware(req, res, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Validation error', code: 'VALIDATION_ERROR' }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
