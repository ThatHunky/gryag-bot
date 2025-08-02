// Simple test script for throttling service
const throttleService = require("./src/bot/services/throttle");

console.log("🧪 Testing Throttle Service\n");

// Test user cooldowns
const testUserId = 123456789;
const testChatId = 987654321;

console.log("📊 Initial stats:", throttleService.getStats());
console.log();

async function runTests() {
  console.log("🔹 Testing user cooldown (private chat):");
  for (let i = 1; i <= 5; i++) {
    const result = throttleService.canProcessMessage(
      testUserId,
      testChatId,
      "private"
    );
    console.log(
      `  Attempt ${i}:`,
      result.allowed
        ? "✅ Allowed"
        : `❌ Blocked (${result.reason}): ${throttleService.formatTimeLeft(result.timeLeft || 0)}`
    );

    if (!result.allowed) {
      console.log(`    Waiting 1 second...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log("\n🔹 Testing admin user (reduced cooldown):");
  // Mock admin check
  const originalIsAdmin = throttleService.isAdmin;
  throttleService.isAdmin = () => true;

  for (let i = 1; i <= 3; i++) {
    const result = throttleService.canProcessMessage(
      testUserId + 1,
      testChatId,
      "group"
    );
    console.log(
      `  Admin attempt ${i}:`,
      result.allowed ? "✅ Allowed" : `❌ Blocked (${result.reason})`
    );
  }

  // Restore original function
  throttleService.isAdmin = originalIsAdmin;

  console.log("\n📊 Final stats:", throttleService.getStats());
  console.log("\n🧪 Test completed!");
}

runTests().catch(console.error);
