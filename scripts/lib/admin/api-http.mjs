// api-http.mjs — JSON answers shared by the editor API and its parts.
export function send(res, status, data, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow', ...headers,
  });
  res.end(JSON.stringify(data));
}
export const oops = (res, status, error, headers) => send(res, status, { error }, headers);

// Answers and closes the connection (used when an upload body may still be arriving).
export function sendAndClose(req, res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Connection: 'close' });
  res.end(JSON.stringify(data), () => req.destroy());
}
