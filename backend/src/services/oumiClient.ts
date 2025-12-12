import axios from 'axios';
import { config } from '../config.js';
import { IncidentRecord, RepairPlan } from '../types.js';
import { log } from '../util/logger.js';
import { z } from 'zod';

const SYSTEM_PROMPT = `
You are Oumi, an autonomous dependency doctor.
Given an incident record, produce a JSON repair plan with fields:
summary, confidence (0-1), rationale, and patchset (array of {path,instructions,patch}).
The patch must be a unified diff that can be applied with patch -p0 from repo root.
Explain why the change addresses the breaking change.
`;

const planSchema = z.object({
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  patchset: z
    .array(
      z.object({
        path: z.string(),
        instructions: z.string(),
        patch: z.string(),
      }),
    )
    .nonempty(),
});

export async function reasonAboutIncident(
  incident: IncidentRecord,
  attempt: number,
  recentReward: number | null,
): Promise<RepairPlan> {
  const payload = {
    model: config.oumiModel,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: JSON.stringify({
          incident,
          attempt,
          reward: recentReward,
        }),
      },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  };

  const headers =
    config.oumiApiKey?.trim().length > 0
      ? { Authorization: `Bearer ${config.oumiApiKey}` }
      : undefined;

  const res = await axios.post(config.oumiBaseUrl, payload, {
    headers,
    timeout: 20000,
  });

  const text: string = res.data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Oumi returned empty content');
  const parsed = planSchema.parse(JSON.parse(text));
  const plan: RepairPlan = {
    incidentId: incident.id,
    summary: parsed.summary,
    confidence: parsed.confidence,
    rationale: parsed.rationale,
    patchset: parsed.patchset,
  };
  log.info(`Oumi produced plan for ${incident.id} with confidence ${plan.confidence}`);
  return plan;
}

