type AuthEventLevel = "info" | "warn" | "error";

interface AuthEventInput {
  event: string;
  level?: AuthEventLevel;
  requestId?: string;
  userId?: string;
  details?: Record<string, string | number | boolean | null | undefined>;
}

function sanitizeDetails(details: AuthEventInput["details"]) {
  if (!details) return {};

  const sanitized: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(details)) {
    if (value === undefined) continue;

    if (typeof value === "string") {
      const valueLower = value.toLowerCase();
      if (valueLower.includes("token") || valueLower.includes("secret") || valueLower.includes("key")) {
        sanitized[key] = "[redacted]";
      } else {
        sanitized[key] = value.slice(0, 180);
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function logAuthEvent(input: AuthEventInput) {
  const payload = {
    domain: "auth",
    event: input.event,
    requestId: input.requestId || null,
    userId: input.userId || null,
    timestamp: new Date().toISOString(),
    details: sanitizeDetails(input.details),
  };

  const line = JSON.stringify(payload);

  switch (input.level || "info") {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    default:
      console.info(line);
  }
}
