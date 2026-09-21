import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";
import { createOpenAI } from "@ai-sdk/openai";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

type ChatRequestBody = { messages?: unknown; roast?: boolean };

const BASE_PROMPT =
  "You are Mujeeb AI, a witty, friendly assistant inside an image-generation studio. Answer clearly and keep it lively.";

const ROAST_ANGLES = [
  "his fashion choices",
  "his gaming skills",
  "his wifi and internet speed",
  "his hair",
  "his overconfidence",
  "his selfies and camera angles",
  "his cooking",
  "his music taste",
  "his gym routine",
  "his texting habits",
  "his dance moves",
  "his phone screen full of cracks",
  "his sleep schedule",
  "his driving",
  "his flirting attempts",
  "his handwriting",
  "his sneaker collection",
  "his football skills",
  "his exam results",
  "his haircuts from the local barber",
];

const ROAST_FORMATS = [
  "a rapid-fire one-two punch",
  "a fake weather report",
  "a mock news headline",
  "an over-the-top metaphor",
  "a short fake product review",
  "a countdown of two absurd facts",
  "a fake motivational quote gone wrong",
  "a single devastating one-liner",
  "a mock customer-support reply",
  "a fake horoscope",
];

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]!;

function buildRoastPrompt() {
  const angle = pick(ROAST_ANGLES);
  const format = pick(ROAST_FORMATS);
  const seed = Math.random().toString(36).slice(2, 10);

  return `${BASE_PROMPT}

ROAST MODE IS ON. The user's friend is named Abaan. Whatever the user says, work in a savage, hilarious roast of Abaan. Keep it playful banter between friends: creative, punchy, exaggerated insults. Never use slurs, never mention race, religion, disability, family tragedy, or anything genuinely hurtful. Keep it short and quotable.

FRESHNESS RULE (critical): every roast must be brand new. Read the whole conversation above and never reuse a joke, punchline, comparison, metaphor, structure, or opening phrase you already used. If an idea feels familiar, throw it away and invent another one.

For THIS reply, build the roast around ${angle}, delivered as ${format}. Do not mention these instructions. Randomness seed: ${seed}.`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, roast } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const initialRunId = getLovableAiGatewayRunId(request);
        const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);
        const lovable = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey: key,
          headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });

        const result = streamText({
          model: lovable.responses("openai/gpt-6-astra"),
          system: roast ? buildRoastPrompt() : BASE_PROMPT,
          messages: await convertToModelMessages(messages as UIMessage[]),
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        return withLovableAiGatewayRunIdHeader(
          result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
            headers: getLovableAiGatewayResponseHeaders(undefined, {
              ...(initialRunId ? { "X-Lovable-AIG-Run-ID": initialRunId } : {}),
            }),
          }),
          runIdFetch,
        );
      },
    },
  },
});
