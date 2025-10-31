export const NextResponse = {
  json(payload: unknown, init?: ResponseInit) {
    const headers = new Headers(init?.headers ?? {});
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    return new Response(JSON.stringify(payload), {
      status: init?.status ?? 200,
      headers
    });
  }
};
