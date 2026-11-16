export function allowedTasksRoute(path: string, method: string) {
  const id =
    "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}";
  const routes: [string, string[]][] = [
    ["(dashboard|catalog|follow-ups)", ["GET"]],
    ["records", ["GET", "POST"]],
    ["work-log", ["POST"]],
    [`records/${id}`, ["GET", "PATCH", "DELETE"]],
    [`records/${id}/(duplicate|restore)`, ["POST"]],
    [`records/${id}/events`, ["GET"]],
    [`records/${id}/subtasks`, ["POST"]],
    [`records/${id}/subtasks/${id}`, ["PATCH", "DELETE"]],
    [`records/${id}/follow-ups`, ["POST"]],
    [`follow-ups/${id}`, ["PATCH", "DELETE"]],
    ["(projects|objectives|reports)", ["GET", "POST"]],
    [`(projects|objectives)/${id}`, ["PATCH", "DELETE"]],
    [`reports/${id}`, ["GET", "PATCH", "DELETE"]],
    ["reports/preview", ["POST"]],
    [`reports/${id}/data`, ["GET"]],
    [`records/${id}/attachments`, ["POST"]],
    [`attachments/${id}`, ["GET", "PATCH", "DELETE"]],
  ];
  return routes.some(
    ([pattern, methods]) =>
      methods.includes(method) && new RegExp(`^${pattern}$`).test(path),
  );
}
