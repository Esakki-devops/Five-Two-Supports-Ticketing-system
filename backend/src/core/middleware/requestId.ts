import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Assigns a stable id to every request (honoring an inbound X-Request-Id when
 * present and sane), echoes it back as a response header, and stores it on the
 * request so logs and error responses can correlate to it.
 */
export const requestId: RequestHandler = (req, res, next) => {
  const inbound = req.header(REQUEST_ID_HEADER);
  const id = inbound && inbound.length > 0 && inbound.length <= 200 ? inbound : randomUUID();
  req.requestId = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
};
