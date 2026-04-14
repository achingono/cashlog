import { describe, expect, it, vi } from 'vitest';
import { AppError, errorHandler } from './error-handler';

describe('errorHandler', () => {
  it('returns app error status and payload', () => {
    const err = new AppError(404, 'Missing', 'NOT_FOUND');
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res: any = { status };

    errorHandler(err, {} as any, res, vi.fn());

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: {
        message: 'Missing',
        code: 'NOT_FOUND',
      },
    });
  });

  it('returns internal error for non-AppError exceptions', () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res: any = { status };

    errorHandler(new Error('boom'), {} as any, res, vi.fn());

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    });
  });
});
