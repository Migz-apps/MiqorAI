import type { TokenPayload } from "../shared/utils/crypto.js";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      /** Set by the partner API key middleware (/api/partner/v1). */
      partner?: { keyId: string; insurerId: string };
      /** Access token verified earlier in the chain (rate limiter), reused by authenticate. */
      verifiedAccessToken?: { token: string; payload: TokenPayload };
    }
  }
}

export {};
