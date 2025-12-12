import Database from 'better-sqlite3';
import path from 'path';
import { config } from './config.js';
import { IncidentRecord, RepairPlan, RewardSignal, ValidationResult } from './types.js';

const db = new Database(path.join(config.workspaceRoot, 'dependency-doctor.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS plans (
    incident_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS validations (
    incident_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS rewards (
    incident_id TEXT NOT NULL,
    attempt INTEGER NOT NULL,
    reward INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    incident_id TEXT,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

export const dbStore = {
  upsertIncident(record: IncidentRecord) {
    db.prepare(
      `INSERT INTO incidents (id, payload, status, created_at)
       VALUES (@id, @payload, @status, @created_at)
       ON CONFLICT(id) DO UPDATE SET payload=@payload, status=@status`,
    ).run({
      id: record.id,
      payload: JSON.stringify(record),
      status: record.status,
      created_at: record.createdAt,
    });
  },
  insertEvent(type: string, incidentId: string | null, payload: unknown) {
    db.prepare(
      `INSERT INTO events (type, incident_id, payload, created_at) VALUES (@type, @incident_id, @payload, @created_at)`,
    ).run({
      type,
      incident_id: incidentId,
      payload: JSON.stringify(payload),
      created_at: new Date().toISOString(),
    });
  },
  listEvents(limit = 200) {
    return db
      .prepare(
        `SELECT type, incident_id, payload, created_at FROM events ORDER BY id DESC LIMIT ?`,
      )
      .all(limit)
      .map((r) => ({
        type: r.type,
        incidentId: r.incident_id,
        payload: JSON.parse(r.payload),
        createdAt: r.created_at,
      }));
  },
  insertPlan(plan: RepairPlan) {
    db.prepare(
      `INSERT INTO plans (incident_id, payload, created_at) VALUES (@incident_id, @payload, @created_at)`,
    ).run({
      incident_id: plan.incidentId,
      payload: JSON.stringify(plan),
      created_at: new Date().toISOString(),
    });
  },
  insertValidation(result: ValidationResult) {
    db.prepare(
      `INSERT INTO validations (incident_id, payload, created_at) VALUES (@incident_id, @payload, @created_at)`,
    ).run({
      incident_id: result.incidentId,
      payload: JSON.stringify(result),
      created_at: new Date().toISOString(),
    });
  },
  insertReward(signal: RewardSignal) {
    db.prepare(
      `INSERT INTO rewards (incident_id, attempt, reward, created_at) VALUES (@incident_id, @attempt, @reward, @created_at)`,
    ).run({
      incident_id: signal.incidentId,
      attempt: signal.attempt,
      reward: signal.reward,
      created_at: new Date().toISOString(),
    });
  },
  latestReward(incidentId: string): RewardSignal | null {
    const row = db
      .prepare(
        `SELECT incident_id, attempt, reward, created_at FROM rewards WHERE incident_id=? ORDER BY attempt DESC LIMIT 1`,
      )
      .get(incidentId);
    if (!row) return null;
    return {
      incidentId: row.incident_id,
      attempt: row.attempt,
      reward: row.reward,
    };
  },
  listIncidents(): IncidentRecord[] {
    return db
      .prepare(`SELECT payload FROM incidents ORDER BY created_at DESC LIMIT 200`)
      .all()
      .map((r) => JSON.parse(r.payload));
  },
};

