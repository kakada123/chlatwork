/** Exact route and method pairs prevent the authenticated proxy from becoming a general API tunnel. */
export function allowedPrepHubRoute(path: string, method: string) {
  const id =
    "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}";
  const routes: [string, string[]][] = [
    ["(dashboard|inbox)", ["GET"]],
    ["subjects", ["GET", "POST"]],
    [`subjects/${id}`, ["GET", "PATCH", "DELETE"]],
    [`subjects/${id}/restore`, ["POST"]],
    [`subjects/${id}/history`, ["GET"]],
    [`subjects/${id}/sharing`, ["GET", "PUT", "DELETE"]],
    [`subjects/${id}/sections`, ["POST"]],
    [`subjects/${id}/sections/reorder`, ["PUT"]],
    [`subjects/${id}/sections/${id}`, ["PATCH", "DELETE"]],
    [`subjects/${id}/sections/${id}/items`, ["POST"]],
    [`subjects/${id}/sections/${id}/items/reorder`, ["PUT"]],
    [`subjects/${id}/sections/${id}/items/${id}`, ["PATCH", "DELETE"]],
    [`subjects/${id}/sections/${id}/resources`, ["POST"]],
    [`subjects/${id}/resources/${id}`, ["GET", "PATCH", "DELETE"]],
    [`subjects/${id}/reminders`, ["POST"]],
    [`subjects/${id}/reminders/${id}`, ["PATCH", "DELETE"]],
  ];
  return routes.some(
    ([pattern, methods]) =>
      methods.includes(method) && new RegExp(`^${pattern}$`).test(path),
  );
}

/** Public capability routes are intentionally GET-only and never fall through to private proxying. */
export function allowedPrepHubPublicRoute(path: string, method: string) {
  const token = "[A-Za-z0-9_-]{43}";
  const id =
    "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}";
  return (
    method === "GET" && new RegExp(`^${token}(?:/resources/${id})?$`).test(path)
  );
}
