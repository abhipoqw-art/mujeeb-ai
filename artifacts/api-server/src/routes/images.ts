import { Router, type IRouter } from "express";
import { GenerateImageBody, GenerateImageResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const DEFAULT_MODEL = "openai/gpt-image-2.5-sunburst";
const ALLOWED_MODELS = new Set([
  "openai/gpt-image-2.5-sunburst",
  "openai/gpt-image-2",
  "bytedance-seed/seedream-5-0-lite",
  "bytedance-seed/seedream-5-0-pro",
]);

router.post("/images/generate", async (req, res) => {
  const parsed = GenerateImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please provide a valid image prompt." });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Image generation is not configured yet." });
    return;
  }

  const { prompt, aspectRatio, style, useReference, model } = parsed.data;
  const selectedModel =
    model && ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;
  const enrichedPrompt = [
    prompt.trim(),
    style ? `Visual direction: ${style}.` : "",
    useReference
      ? "Use the attached Abban reference portrait as the identity and composition reference while keeping the result fictional and playful."
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const providerResponse = await fetch("https://openrouter.ai/api/v1/images", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://replit.com",
        "X-Title": "Mujeeb AI",
      },
      body: JSON.stringify({
        model: selectedModel,
        prompt: enrichedPrompt,
        n: 1,
        quality: "high",
        aspect_ratio: aspectRatio,
      }),
    });

    const payload = (await providerResponse.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
      created?: number;
      usage?: { cost?: number };
      error?: { message?: string };
    };

    if (!providerResponse.ok) {
      req.log.warn(
        { status: providerResponse.status, model: selectedModel },
        "OpenRouter image generation failed",
      );
      res.status(providerResponse.status === 402 ? 402 : 502).json({
        error:
          payload.error?.message ??
          "OpenRouter could not generate that image. Try again with a simpler prompt.",
      });
      return;
    }

    const generated = payload.data?.[0];
    if (!generated?.b64_json && !generated?.url) {
      req.log.warn({ model: selectedModel }, "OpenRouter returned no image");
      res
        .status(502)
        .json({ error: "The image provider returned no usable image." });
      return;
    }

    const result = GenerateImageResponse.parse({
      imageDataUrl: generated.b64_json
        ? `data:image/png;base64,${generated.b64_json}`
        : generated.url,
      model: selectedModel,
      created: payload.created ?? Math.floor(Date.now() / 1000),
      cost: payload.usage?.cost ?? null,
    });
    res.json(result);
  } catch (error) {
    req.log.error({ err: error }, "Image generation request failed");
    res
      .status(502)
      .json({ error: "The image provider is temporarily unavailable." });
  }
});

export default router;