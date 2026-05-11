/**
 * Test exchange Azure Speech key → access token.
 *
 * Run: npx babel-node src/commands/testAzureSpeech.js
 */

import { getSpeechToken } from "@server/services/azure/speechAuthProvider";
import { env } from "@server/config/environment";

async function run() {
  console.log("------------------------------");
  console.log("Region:", env.AZURE_SPEECH_REGION || "(not set)");
  console.log("Key:", env.AZURE_SPEECH_KEY ? "(set, hidden)" : "(not set)");
  console.log("------------------------------");

  try {
    const t1 = Date.now();
    const first = await getSpeechToken();
    console.log(
      `[1st call] OK in ${Date.now() - t1}ms — token len=${first.token.length}, region=${first.region}, expiresAt=${new Date(first.expiresAt).toISOString()}`,
    );
    console.log(`Token preview: ${first.token.slice(0, 24)}...`);

    const t2 = Date.now();
    const second = await getSpeechToken();
    console.log(
      `[2nd call] OK in ${Date.now() - t2}ms — same token? ${second.token === first.token}`,
    );

    console.log("------------------------------");
    console.log("OK ✓ Azure Speech credentials are valid");
  } catch (err) {
    console.error("------------------------------");
    console.error("FAIL ✗", err.statusCode || "", err.message);
    process.exitCode = 1;
  }
}

run();
