// One retry owner: SDK, route and browser must not multiply upstream attempts.
export async function runAIWithRetry<T>(
  operation: (attempt: number) => Promise<T>,
  wait: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms)),
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try { return await operation(attempt); }
    catch (error: any) {
      const status = Number(error?.status || error?.statusCode || 0);
      const temporary = [408, 500, 502, 503, 504].includes(status) ||
        ['AbortError', 'TimeoutError'].includes(error?.name) ||
        (error instanceof TypeError && /fetch|network/i.test(error.message));
      // Quota exhaustion, authorization, configuration and invalid output need action,
      // not extra quota-consuming calls. Only transient transport failures retry.
      if (attempt >= 2 || !temporary) throw error;
      await wait(750 + Math.floor(Math.random() * 250));
    }
  }
}
