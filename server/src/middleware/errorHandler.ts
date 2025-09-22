interface HttpError extends Error {
  status?: number;
  details?: unknown;
}

export function errorHandler(err: HttpError, _req: any, res: any, _next: any) {
  const status = err.status ?? 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ error: err.message || 'Unexpected error', details: err.details });
}
