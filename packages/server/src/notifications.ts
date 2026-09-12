/**
 * External notifications are deliberately opt-in.
 *
 * A topic may be present in a developer's shell for unrelated work, so merely
 * inheriting NTFY_TOPIC must never make a test, demo, or local server send a
 * network request. Both variables are required and the opt-in is exact.
 */
interface NotificationEnv {
  [key: string]: string | undefined;
  SDT_ALLOW_NTFY?: string;
  NTFY_TOPIC?: string;
}

export function resolveNtfyTopic(env: NotificationEnv = process.env): string | null {
  if (env.SDT_ALLOW_NTFY !== "1") return null;
  const topic = env.NTFY_TOPIC?.trim();
  return topic ? topic : null;
}
