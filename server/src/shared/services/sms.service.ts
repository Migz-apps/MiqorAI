import { config } from "../../config.js";
import { logger } from "../lib/logger.js";
import { serviceUnavailable } from "../utils/errors.js";

export async function sendSms(
  phone: string,
  message: string,
): Promise<{ sent: boolean; channel: "sms"; sid?: string }> {
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
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
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
    return { sent: false, channel: "sms" };
  }

  if (config.nodeEnv === "production") {
    // A real provider was requested but is misconfigured (e.g. missing Twilio creds).
    throw serviceUnavailable("SMS delivery is not configured", {
      provider: config.sms.provider || "unknown",
      recipient: normalized,
    });
  }

  logger.info("SMS (dev/log mode)", { phone: normalized, message });
  return { sent: true, channel: "sms" };
}

