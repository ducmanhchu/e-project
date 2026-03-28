import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: null,
  authToken:
    "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",
  defaultHeaders: {
    "anthropic-dangerous-direct-browser-access": "true",
    "anthropic-beta": "oauth-2025-04-20",  
  },
});

const message = await client.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(message.content[0].text);
