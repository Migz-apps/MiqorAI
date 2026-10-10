import type { TokenPayload } from "../shared/utils/crypto.js";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export {};
