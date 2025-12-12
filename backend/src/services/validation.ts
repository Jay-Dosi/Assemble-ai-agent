import { IncidentRecord, ValidationResult } from '../types.js';
import { runSandbox } from './sandbox.js';
import { dbStore } from '../db.js';
import { recordReward } from './repairPlanner.js';
import { log } from '../util/logger.js';

export async function validatePatch(
  incident: IncidentRecord,
  attempt: number,
): Promise<ValidationResult> {
  const result = await runSandbox(incident.dependency);
  const validation: ValidationResult = {
    incidentId: incident.id,
    success: !result.crashed,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    newErrors: result.crashed ? result.stacktrace : undefined,
  };
  dbStore.insertValidation(validation);
  const reward = validation.success ? 1 : 0;
  recordReward({ incidentId: incident.id, attempt, reward });
  log.info(`Validation ${validation.success ? 'passed' : 'failed'} for ${incident.id}`);
  return validation;
}

