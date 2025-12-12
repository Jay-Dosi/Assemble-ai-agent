import { config } from '../config.js';
import { detectUpdates, simulateUpgrade } from './detection.js';
import { dbStore } from '../db.js';
import { planRepair } from './repairPlanner.js';
import { dispatchCline } from './clineClient.js';
import { validatePatch } from './validation.js';
import { openPullRequest, pushToDashboard } from './reporting.js';
import { log } from '../util/logger.js';
import { IncidentRecord } from '../types.js';

export async function handleDetectionJob() {
  const updates = await detectUpdates(config.workspaceRoot);
  for (const update of updates) {
    const incident = await simulateUpgrade(update);
    if (!incident) continue;
    dbStore.upsertIncident(incident);
    dbStore.insertEvent('incident_detected', incident.id, incident);
    await pushToDashboard({ type: 'incident', incident });
    await handleIncidentJob({ incident });
  }
}

export async function handleIncidentJob({
  incident,
  attempt = 1,
}: {
  incident: IncidentRecord;
  attempt?: number;
}) {
  let currentAttempt = attempt;
  let validationPassed = false;
  let currentIncident = incident;
  while (currentAttempt <= config.maxAttempts && !validationPassed) {
    dbStore.upsertIncident({ ...currentIncident, status: 'ANALYZING' });
    const plan = await planRepair(currentIncident, currentAttempt);
    dbStore.upsertIncident({ ...currentIncident, status: 'PATCHING' });
    await dispatchCline(plan, config.workspaceRoot);
    dbStore.upsertIncident({ ...currentIncident, status: 'VALIDATING' });
    const validation = await validatePatch(currentIncident, currentAttempt);
    validationPassed = validation.success;
    dbStore.insertEvent('attempt', currentIncident.id, {
      attempt: currentAttempt,
      plan,
      validation,
    });
    await pushToDashboard({
      type: 'attempt',
      incidentId: currentIncident.id,
      plan,
      validation,
    });
    if (validationPassed) {
      dbStore.upsertIncident({ ...currentIncident, status: 'FIXED' });
      dbStore.insertEvent('fixed', currentIncident.id, { plan, validation });
      await openPullRequest(currentIncident, plan, validation);
      await pushToDashboard({ type: 'fixed', incidentId: currentIncident.id });
    } else {
      currentAttempt += 1;
    }
  }
  if (!validationPassed) {
    dbStore.upsertIncident({ ...currentIncident, status: 'FAILED' });
    dbStore.insertEvent('failed', currentIncident.id, {});
    log.warn(`Incident ${currentIncident.id} failed after attempts`);
  }
}

