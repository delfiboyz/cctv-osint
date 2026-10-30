export function isAdmin(req: Request): boolean {
  const token = process.env.CCTV_ADMIN_TOKEN;
  if (!token) return false;
  return req.headers.get("x-admin-token") === token;
}
