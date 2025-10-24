export function logServerError(scope: string, err: unknown, extra?: Record<string, any>) {
  const message =
    typeof err === "object" && err !== null && "message" in err
      ? String((err as { message?: unknown }).message)
      : typeof err === "string"
        ? err
        : "Unknown error";

  const stack =
    typeof err === "object" && err !== null && "stack" in err
      ? String((err as { stack?: unknown }).stack ?? "")
      : undefined;

  console.error("[server]", scope, {
    message,
    stack,
    digest: (err as any)?.digest,
    ...extra
  });
}
