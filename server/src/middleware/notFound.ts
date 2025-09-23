export function notFoundHandler(_req: any, res: any, _next: any) {
  res.status(404).json({ error: 'NotFound' });
}
