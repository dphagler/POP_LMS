import { randomUUID } from "crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogPayload = Record<string, unknown>;

export type Logger = {
  debug: (message: string | LogPayload, extra?: LogPayload) => void;
  info: (message: string | LogPayload, extra?: LogPayload) => void;
  warn: (message: string | LogPayload, extra?: LogPayload) => void;
  error: (message: string | LogPayload, extra?: LogPayload) => void;
  child: (context: LogPayload) => Logger;
};

const serviceName = process.env.SERVICE_NAME ?? "pop-lms";

const consoleMethod: Record<LogLevel, "debug" | "log" | "warn" | "error"> = {
  debug: "debug",
  info: "log",
  warn: "warn",
  error: "error"
};

const jsonReplacer = (_key: string, value: unknown) => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }
  return value;
};

function write(level: LogLevel, base: LogPayload, message: string | LogPayload, extra?: LogPayload) {
  const timestamp = new Date().toISOString();
  const entry: LogPayload = {
    service: serviceName,
    level,
    timestamp,
    ...base
  };

  if (typeof message === "string") {
    entry.message = message;
  } else {
    Object.assign(entry, message);
  }

  if (extra) {
    Object.assign(entry, extra);
  }

  const output = JSON.stringify(entry, jsonReplacer);
  const method = consoleMethod[level];
  const target =
    method === "debug"
      ? console.debug.bind(console)
      : method === "warn"
        ? console.warn.bind(console)
        : method === "error"
          ? console.error.bind(console)
          : console.log.bind(console);
  target(output);
}

export function createLogger(base: LogPayload = {}): Logger {
  return {
    debug(message, extra) {
      write("debug", base, message, extra);
    },
    info(message, extra) {
      write("info", base, message, extra);
    },
    warn(message, extra) {
      write("warn", base, message, extra);
    },
    error(message, extra) {
      write("error", base, message, extra);
    },
    child(context: LogPayload) {
      return createLogger({ ...base, ...context });
    }
  };
}

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
}

export function createRequestLogger(
  request: Request,
  context: LogPayload = {}
): { logger: Logger; requestId: string } {
  const existingId = request.headers.get("x-request-id");
  const requestId = existingId ?? randomUUID();
  let path: string | undefined;

  try {
    const url = new URL(request.url);
    path = url.pathname;
  } catch {
    path = undefined;
  }

  const logger = createLogger({
    requestId,
    method: request.method,
    path,
    ...context
  });

  return { logger, requestId };
}

export function ensureRequestId(headers: Headers | undefined): string {
  const existing = headers?.get("x-request-id");
  return existing ?? randomUUID();
}
