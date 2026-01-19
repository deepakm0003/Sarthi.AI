'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isOverloaded(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return msg.includes('503') || msg.includes('overloaded') || msg.includes('service unavailable');
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const maxAttempts = 4;
  const baseDelayMs = 600;
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      if (!isOverloaded(err) || attempt === maxAttempts) {
        throw err;
      }
      const jitter = Math.floor(Math.random() * 250);
      await sleep(baseDelayMs * 2 ** (attempt - 1) + jitter);
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('Model overloaded');
}

const SunitaModeInputSchema = z.object({
  classLevel: z.enum(['3', '4', '5']),
  subject: z.enum(['Math', 'Hindi', 'EVS']),
  problemType: z.enum(['concept_confusion', 'classroom_chaos', 'mixed_ability', 'behavioral_issue']),
  language: z.enum(['English', 'Hindi']).default('English'),
  contextNote: z.string().optional(),
});

const SunitaModeOutputSchema = z.object({
  headline: z.string(),
  quickRead: z.string(),
  justInTimeSteps: z.array(z.string()),
  groupingPlan: z.array(z.string()).optional(),
  activityTweak: z.string().optional(),
  followUp: z.array(z.string()).optional(),
});

export type SunitaModeInput = z.infer<typeof SunitaModeInputSchema>;
export type SunitaModeOutput = z.infer<typeof SunitaModeOutputSchema>;

export async function generateSunitaModeAdvice(input: SunitaModeInput): Promise<SunitaModeOutput> {
  const { output } = await withRetry(() => ai.generate({
    prompt: `
You are "Sunita Mode" — an offline-first, voice-friendly AI classroom companion.
Return concise, action-ready advice for the teacher in ${input.language}.

Class: ${input.classLevel}
Subject: ${input.subject}
Problem type: ${input.problemType}
Extra context: ${input.contextNote ?? 'None'}

Structure the response as:
- headline: 1-line rallying message
- quickRead: 2-3 sentences summarizing the plan
- justInTimeSteps: 4-6 bullet steps the teacher can do in the next 10 minutes
- groupingPlan: (optional) 2-3 bullets on how to group students quickly
- activityTweak: (optional) 1-2 sentences to tweak the ongoing activity
- followUp: (optional) 2-3 bullets for the next class

Keep it practical, time-bound, and classroom-realistic.`,
    output: { schema: SunitaModeOutputSchema },
  }));

  if (!output) {
    throw new Error('No advice returned');
  }
  return output;
}

const SnapshotInputSchema = z.object({
  language: z.enum(['English', 'Hindi']).default('English'),
  description: z.string().min(10),
});

const SnapshotOutputSchema = z.object({
  strategy: z.string(),
  grouping: z.array(z.string()),
  activityTweak: z.string(),
  followUpCheck: z.array(z.string()),
});

export type SnapshotInput = z.infer<typeof SnapshotInputSchema>;
export type SnapshotOutput = z.infer<typeof SnapshotOutputSchema>;

export async function generateSnapshotAdvice(input: SnapshotInput): Promise<SnapshotOutput> {
  const { output } = await withRetry(() => ai.generate({
    prompt: `
Classroom Snapshot analysis in ${input.language}.
Context (teacher described): ${input.description}

Return concise guidance:
- strategy: 2-3 sentences targeting the described situation
- grouping: 2-3 bullet actions to regroup students fast (mixed-ability ready)
- activityTweak: 1-2 sentences to adjust the ongoing task
- followUpCheck: 2-3 bullets the teacher can check in the next 15 minutes
Keep it practical for low-connectivity classrooms.`,
    output: { schema: SnapshotOutputSchema },
  }));

  if (!output) {
    throw new Error('No snapshot advice returned');
  }
  return output;
}

// Image-based snapshot analysis
const SnapshotImageInputSchema = z.object({
  language: z.enum(['English', 'Hindi']).default('English'),
  description: z.string().optional(),
  imageData: z.string().min(50, 'Image data is required'),
});

const SnapshotImageOutputSchema = z.object({
  summary: z.string(),
  engagementScore: z.number().min(0).max(100),
  focusAreas: z.array(
    z.object({
      label: z.string(),
      score: z.number().min(0).max(100),
    })
  ),
  grouping: z.array(z.string()),
  strategies: z.array(z.string()),
  activityTweak: z.string(),
});

export type SnapshotImageInput = z.infer<typeof SnapshotImageInputSchema>;
export type SnapshotImageOutput = z.infer<typeof SnapshotImageOutputSchema>;

export async function analyzeSnapshotImage(input: SnapshotImageInput): Promise<SnapshotImageOutput> {
  const { output } = await withRetry(() => ai.generate({
    prompt: `
You are analyzing a classroom snapshot (image) in ${input.language}.
The teacher may also provide a note: ${input.description ?? 'None'}.

Return:
- summary: 2-3 sentences about engagement/behavior/mixed ability signals
- engagementScore: 0-100 (estimated engagement)
- focusAreas: 3 items with scores 0-100 (e.g., "Attention", "On-task behavior", "Participation")
- grouping: 3 bullet suggestions to regroup students quickly
- strategies: 4-5 bullet actionable steps for the next 10 minutes
- activityTweak: 1-2 sentences to adjust the current activity

Keep it concise and classroom-realistic.
`,
    input: [
      {
        inlineData: {
          mimeType: 'image/png',
          data: input.imageData.split(',').pop() ?? '',
        },
      },
    ],
    output: { schema: SnapshotImageOutputSchema },
  }));

  if (!output) {
    throw new Error('No image analysis returned');
  }
  return output;
}
