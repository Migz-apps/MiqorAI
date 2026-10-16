/**
 * Codes produced by generateSixDigitCode during a test file. Populated by a
 * vi.mock of src/shared/utils/one-time-code.js declared in the test file:
 *
 *   vi.mock("../src/shared/utils/one-time-code.js", async (importOriginal) =>
 *     recordingOneTimeCodeModule(await importOriginal()));
 *
 * Production code always generates random codes; tests read the real code here.
 */
const issued: string[] = [];

export function recordingOneTimeCodeModule<T extends { generateSixDigitCode: () => string }>(actual: T): T {
  return {
    ...actual,
    generateSixDigitCode: () => {
      const code = actual.generateSixDigitCode();
      issued.push(code);
      return code;
    },
  };
}

export function lastOneTimeCode(): string {
  const code = issued.at(-1);
  if (!code) throw new Error("No one-time code has been generated yet");
  return code;
}
