import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveNtfyTopic } from "../notifications.js";

test("ntfy is disabled by default and requires an exact, non-empty opt-in", () => {
  assert.equal(resolveNtfyTopic({ NTFY_TOPIC: "someone-elses-topic" }), null);
  assert.equal(resolveNtfyTopic({ SDT_ALLOW_NTFY: "true", NTFY_TOPIC: "demo" }), null);
  assert.equal(resolveNtfyTopic({ SDT_ALLOW_NTFY: "1", NTFY_TOPIC: "   " }), null);
  assert.equal(resolveNtfyTopic({ SDT_ALLOW_NTFY: "1", NTFY_TOPIC: "  sdt-demo  " }), "sdt-demo");
});
