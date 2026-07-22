function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Counts down from `seconds` to 0, calling onTick each second, and bails
 * out early if stopRef.current becomes true between ticks.
 */
export async function runCooldown(
  seconds: number,
  onTick: (remaining: number) => void,
  stopRef: { current: boolean }
): Promise<void> {
  for (let s = seconds; s > 0; s--) {
    if (stopRef.current) {
      onTick(0)
      return
    }
    onTick(s)
    await sleep(1000)
  }
  onTick(0)
}
