import { config } from "../config.js";
import { logger } from "../lib/logger.js";

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
      throw new Error("SMS delivery failed");
    }
    const data = (await res.json()) as { sid?: string };
    return { sent: true, channel: "sms", sid: data.sid };
  }

  logger.info("SMS (dev/log mode)", { phone: normalized, message });
  return { sent: true, channel: "sms" };
}
