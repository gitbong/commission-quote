import type { RequestHandler } from "express";

const toChunk = (chunk: unknown, encoding?: unknown): Buffer | undefined => {
  if (chunk == null || typeof chunk === "function") return undefined;
  if (Buffer.isBuffer(chunk)) return chunk;
  if (typeof chunk === "string") {
    return Buffer.from(chunk, typeof encoding === "string" ? (encoding as BufferEncoding) : "utf8");
  }
  if (chunk instanceof Uint8Array) return Buffer.from(chunk);
  return undefined;
};

const parseBody = (raw: string): unknown => {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const isEmpty = (body: unknown): boolean =>
  body === undefined ||
  body === "" ||
  (typeof body === "object" && body !== null && Object.keys(body).length === 0);

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();
  const chunks: Buffer[] = [];

  const originalWrite = res.write.bind(res) as (...args: unknown[]) => boolean;
  const originalEnd = res.end.bind(res) as (...args: unknown[]) => typeof res;

  res.write = ((chunk: unknown, ...rest: unknown[]) => {
    const buf = toChunk(chunk, rest[0]);
    if (buf) chunks.push(buf);
    return originalWrite(chunk, ...rest);
  }) as typeof res.write;

  res.end = ((chunk?: unknown, ...rest: unknown[]) => {
    const buf = toChunk(chunk, rest[0]);
    if (buf) chunks.push(buf);
    return originalEnd(chunk, ...rest);
  }) as typeof res.end;

  res.on("finish", () => {
    const duration = Date.now() - startedAt;

    console.log("\n→ Request");
    console.table([
      {
        method: req.method,
        url: req.originalUrl,
        body: isEmpty(req.body) ? "-" : JSON.stringify(req.body),
      },
    ]);

    console.log(`← Response ${res.statusCode} ${req.method} ${req.originalUrl} (${duration}ms)`);
    const responseBody = parseBody(Buffer.concat(chunks).toString("utf8"));
    if (responseBody !== undefined) console.dir(responseBody, { depth: null });
  });

  next();
};
