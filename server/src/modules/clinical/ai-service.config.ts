/** Shared AI service configuration (Colab tunnel / local FastAPI). */
export function getAiServiceConfig() {
  const baseUrl = (
    process.env.AI_SERVICE_BASE_URL ??
    process.env.AI_SERVICE_URL ??
    ""
  )
    .trim()
    .replace(/\/$/, "");

  const enabled = process.env.AI_SERVICE_ENABLED !== "false";
  const mock = process.env.MIQORAI_AI_MOCK === "true";
  const apiKey = (process.env.AI_SERVICE_API_KEY ?? "").trim();
  const timeoutSeconds = parseInt(process.env.AI_SERVICE_TIMEOUT_SECONDS ?? "60", 10);

  return {
    baseUrl,
    enabled,
    mock,
    apiKey,
    timeoutMs: Math.max(5, timeoutSeconds) * 1000,
    isConfigured: Boolean(baseUrl) || mock,
  };
}
