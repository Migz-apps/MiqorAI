import { config } from "../config.js";
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

  if (config.nodeEnv === "production") {
    throw serviceUnavailable("SMS delivery is not configured", {
      provider: config.sms.provider || "unknown",
      recipient: normalized,
    });
  }

  logger.info("SMS (dev/log mode)", { phone: normalized, message });
  return { sent: true, channel: "sms" };
}

export async function assertSmsDeliveryReady(): Promise<void> {
  if (config.nodeEnv !== "production") return;

  const configured =
    config.sms.provider === "twilio" &&
    Boolean(config.sms.accountSid) &&
    Boolean(config.sms.authToken) &&
    Boolean(config.sms.fromNumber);

  if (!configured) {
    throw serviceUnavailable("SMS delivery is not configured", {
      provider: config.sms.provider || "unknown",
    });
  }
}
