// src/ai/flows/generate-visual-aids.ts
'use server';

/**
 * @fileOverview Generates simple line drawings or charts (as SVG) based on a teacher's description,
 * for use as visual aids on a blackboard.
 *
 * - generateVisualAid - A function that handles the visual aid generation process.
 * - GenerateVisualAidInput - The input type for the generateVisualAid function.
 * - GenerateVisualAidOutput - The return type for the generateVisualAid function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateVisualAidInputSchema = z.object({
  description: z
    .string()
    .describe('A description of the visual aid to generate.'),
});
export type GenerateVisualAidInput = z.infer<typeof GenerateVisualAidInputSchema>;

const GenerateVisualAidOutputSchema = z.object({
  visualAidDataUri: z
    .string()
    .describe(
      "The generated visual aid as an SVG data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:image/svg+xml;base64,<encoded_data>'."
    ),
});
export type GenerateVisualAidOutput = z.infer<typeof GenerateVisualAidOutputSchema>;

export async function generateVisualAid(input: GenerateVisualAidInput): Promise<GenerateVisualAidOutput> {
  return generateVisualAidFlow(input);
}

const GenerateVisualAidSvgOutputSchema = z.object({
  svg: z
    .string()
    .describe(
      'A complete SVG document string (starting with <svg ...>) representing a simple black-and-white line drawing or chart.'
    ),
});

function svgToDataUri(svg: string): string {
  const trimmed = svg.trim();
  const base64 = Buffer.from(trimmed, 'utf8').toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function isModelOverloadedError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message ?? '';
  return message.includes('503') || message.toLowerCase().includes('overloaded');
}

async function generateSvgWithRetry(prompt: string): Promise<string> {
  const modelsToTry: ReadonlyArray<string | undefined> = [
    // Prefer the app default model; only use explicit fallbacks if needed.
    undefined,
    'googleai/gemini-2.0-flash',
  ];

  // Exponential backoff with small jitter, per model.
  const maxAttemptsPerModel = 4;
  const baseDelayMs = 500;

  let lastError: unknown = null;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt += 1) {
      try {
        const {output} = await ai.generate({
          ...(model ? {model} : {}),
          prompt,
          output: {schema: GenerateVisualAidSvgOutputSchema},
        });

        if (!output?.svg) {
          throw new Error('Model returned no SVG output.');
        }

        return output.svg;
      } catch (err: unknown) {
        lastError = err;

        // Only retry overload-type failures; otherwise fail fast.
        if (!isModelOverloadedError(err)) {
          throw err;
        }

        const jitterMs = Math.floor(Math.random() * 200);
        const delayMs = baseDelayMs * 2 ** (attempt - 1) + jitterMs;
        await sleep(delayMs);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to generate visual aid: model overloaded.');
}

const generateVisualAidFlow = ai.defineFlow(
  {
    name: 'generateVisualAidFlow',
    inputSchema: GenerateVisualAidInputSchema,
    outputSchema: GenerateVisualAidOutputSchema,
  },
  async input => {
    // Gemini image-generation models/methods differ by API version and availability.
    // To make this production-reliable, we generate a standards-based SVG via text output.
    const fullPrompt = `You create simple, black-and-white chalkboard-friendly visuals for teachers.

Generate a COMPLETE SVG (no Markdown, no code fences) that is a simple line drawing or chart based on the description below.

Requirements:
- Output must be a single valid SVG document string starting with "<svg" and ending with "</svg>".
- Use only black strokes on transparent/white background (no colors, no gradients).
- Keep it minimal and easy to replicate on a blackboard.
- Use a viewBox and reasonable width/height (e.g. 800x600).
- Do NOT embed external images or fonts.

Description: ${input.description}`;

    const svg = await generateSvgWithRetry(fullPrompt);

    return {visualAidDataUri: svgToDataUri(svg)};
  }
);
