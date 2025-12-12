import fs from 'fs';
import path from 'path';
import axios from 'axios';
import semver from 'semver';
import fg from 'fast-glob';
import { v4 as uuid } from 'uuid';
import { config } from '../config.js';
import { DependencyUpdate, IncidentRecord } from '../types.js';
import { runSandbox } from './sandbox.js';
import { log } from '../util/logger.js';

const npmManifestFiles = ['package.json'];
const pythonManifestFiles = ['requirements.txt', 'pyproject.toml'];

async function fetchNpmLatest(name: string): Promise<string | null> {
  const res = await axios.get(`https://registry.npmjs.org/${name}`, {
    timeout: config.registryTimeoutMs,
  });
  return res.data?.['dist-tags']?.latest ?? null;
}

async function fetchPypiLatest(name: string): Promise<string | null> {
  const res = await axios.get(`https://pypi.org/pypi/${name}/json`, {
    timeout: config.registryTimeoutMs,
  });
  return res.data?.info?.version ?? null;
}

function parseNpmDependencies(manifestPath: string): DependencyUpdate[] {
  const pkg = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  return Object.entries(deps)
    .map(([name, version]) => ({
      name,
      currentVersion: String(version).replace(/^[^0-9]*/, ''),
      latestVersion: '',
      kind: 'npm' as const,
      manifestPath,
    }))
    .filter((d) => semver.valid(d.currentVersion));
}

function parsePythonRequirements(manifestPath: string): DependencyUpdate[] {
  const lines = fs.readFileSync(manifestPath, 'utf8').split('\n');
  return lines
    .map((line) => line.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes('=='))
    .map((line) => {
      const [name, version] = line.split('==');
      return {
        name,
        currentVersion: version,
        latestVersion: '',
        kind: 'pypi' as const,
        manifestPath,
      };
    })
    .filter((d) => semver.valid(d.currentVersion));
}

export async function detectUpdates(
  root: string,
): Promise<DependencyUpdate[]> {
  const matches = await fg(
    [...npmManifestFiles, ...pythonManifestFiles].map((f) => `**/${f}`),
    { cwd: root, ignore: ['**/node_modules/**', '**/.venv/**'] },
  );

  const deps: DependencyUpdate[] = [];
  for (const file of matches) {
    const full = path.join(root, file);
    if (npmManifestFiles.includes(path.basename(file))) {
      deps.push(...parseNpmDependencies(full));
    } else {
      deps.push(...parsePythonRequirements(full));
    }
  }

  const results: DependencyUpdate[] = [];
  for (const dep of deps) {
    try {
      const latest =
        dep.kind === 'npm'
          ? await fetchNpmLatest(dep.name)
          : await fetchPypiLatest(dep.name);
      if (!latest) continue;
      if (semver.lt(dep.currentVersion, latest)) {
        results.push({ ...dep, latestVersion: latest });
      }
    } catch (err) {
      log.error(`Failed to fetch latest for ${dep.name}`, err);
    }
  }
  return results;
}

export async function simulateUpgrade(
  update: DependencyUpdate,
): Promise<IncidentRecord | null> {
  const sandboxResult = await runSandbox(update);
  if (!sandboxResult.crashed) return null;

  const record: IncidentRecord = {
    id: uuid(),
    dependency: update,
    stacktrace: sandboxResult.stacktrace ?? sandboxResult.stderr,
    file: sandboxResult.file,
    line: sandboxResult.line,
    api: sandboxResult.api,
    command: sandboxResult.command,
    exitCode: sandboxResult.exitCode,
    stdout: sandboxResult.stdout,
    stderr: sandboxResult.stderr,
    createdAt: new Date().toISOString(),
    status: 'DETECTED',
  };
  log.info(`Incident detected for ${update.name}: ${record.id}`);
  return record;
}

