import { dbStore } from '../db.js';
import { IncidentRecord, RepairPlan, RewardSignal } from '../types.js';
import { log } from '../util/logger.js';
import { reasonAboutIncident } from './oumiClient.js';

export async function planRepair(
  incident: IncidentRecord,
  attempt: number,
): Promise<RepairPlan> {
  const reward = dbStore.latestReward(incident.id);
  const plan = await reasonAboutIncident(incident, attempt, reward?.reward ?? null);
  dbStore.insertPlan(plan);
  return plan;
}

export function recordReward(signal: RewardSignal) {
  dbStore.insertReward(signal);
  log.info(`Reward recorded ${signal.reward} for ${signal.incidentId} attempt ${signal.attempt}`);
}

