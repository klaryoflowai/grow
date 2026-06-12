const test = require("node:test");
const assert = require("node:assert/strict");

test("loadEnvFile sets process.env from a file without overwriting existing vars", () => {
  const fs = require("node:fs");
  const os = require("node:os");
  const path = require("node:path");
  const { loadEnvFile } = require("../daily-contact-queue");

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dcq-test-"));
  const envPath = path.join(dir, ".env.local");
  fs.writeFileSync(envPath, "DCQ_TEST_NEW=hello\nDCQ_TEST_EXISTING=should-not-override\n", "utf8");

  process.env.DCQ_TEST_EXISTING = "original";
  delete process.env.DCQ_TEST_NEW;

  loadEnvFile(envPath);

  assert.equal(process.env.DCQ_TEST_NEW, "hello");
  assert.equal(process.env.DCQ_TEST_EXISTING, "original");

  delete process.env.DCQ_TEST_NEW;
  delete process.env.DCQ_TEST_EXISTING;
  fs.rmSync(dir, { recursive: true, force: true });
});
