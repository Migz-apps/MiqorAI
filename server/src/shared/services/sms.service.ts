import { config } from "../../config.js";
import { logger } from "../lib/logger.js";
import { serviceUnavailable } from "../utils/errors.js";

export const SMS_TIMEOUT_MS = 10_000;

export interface SmsResult {
  sent: boolean;
  channel: "sms";
  sid?: string;
  /** Set when the message was not delivered without an error being thrown. */
  reason?: "log_mode" | "not_configured";
}

/**
 * Sends an SMS. Throws 503 when delivery fails (provider error, timeout) and,
 * in production, when the requested provider is not configured, so callers
 * that need delivery (OTP) fail loudly. `bestEffort` callers (patient
 * notifications) get `{ sent: false, reason: "not_configured" }` and a warning
 * instead of the not-configured error.
 */
export async function sendSms(
  phone: string,
  message: string,
  options: { bestEffort?: boolean; timeoutMs?: number } = {},
): Promise<SmsResult> {
  const normalized = phone.replace(/\s/g, "");

  if (
    config.sms.provider === "twilio" &&
    config.sms.accountSid &&
    config.sms.authToken &&
    config.sms.fromNumber
  ) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.sms.accountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: normalized,
      From: config.sms.fromNumber,
      Body: message,
    });
    const auth = Buffer.from(`${config.sms.accountSid}:${config.sms.authToken}`).toString("base64");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? SMS_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        signal: controller.signal,
      });
    } catch (err) {
      const timedOut = controller.signal.aborted;
      logger.error("Twilio SMS request failed", {
        timedOut,
        err: err instanceof Error ? err.message : String(err),
      });
      throw serviceUnavailable(timedOut ? "SMS delivery timed out" : "SMS delivery failed", {
        provider: "twilio",
        recipient: normalized,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      const errText = await res.text();
      logger.error("Twilio SMS failed", { status: res.status, err: errText });
      throw serviceUnavailable("SMS delivery failed", {
        provider: "twilio",
        recipient: normalized,
      });
    }
    const data = (await res.json()) as { sid?: string };
    return { sent: true, channel: "sms", sid: data.sid };
  }

  if (config.sms.provider === "log") {
    // Explicitly configured log mode: valid in any environment (single-operator /
    // demo deployments that opt out of a paid SMS provider). Messages are logged,
    // not delivered, and reported as not sent.
    logger.info("SMS (log mode — not delivered)", { phone: normalized, message });
    return { sent: false, channel: "sms", reason: "log_mode" };
  }

  if (config.nodeEnv === "production") {
    if (options.bestEffort) {
      logger.warn("SMS not delivered: provider is not configured", {
        provider: config.sms.provider || "unknown",
      });
      return { sent: false, channel: "sms", reason: "not_configured" };
    }
    // A real provider was requested but is misconfigured (e.g. missing Twilio creds).
    throw serviceUnavailable("SMS delivery is not configured", {
      provider: config.sms.provider || "unknown",
      recipient: normalized,
    });
  }

  logger.info("SMS (dev/log mode)", { phone: normalized, message });
  return { sent: true, channel: "sms" };
}

