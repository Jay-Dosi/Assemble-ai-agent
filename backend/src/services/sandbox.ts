import path from 'path';
import fs from 'fs-extra';
import { execa } from 'execa';
import { config } from '../config.js';
import { DependencyUpdate } from '../types.js';
import { log } from '../util/logger.js';

interface SandboxResult {
  crashed: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  stacktrace?: string;
  file?: string;
  line?: number;
  api?: string;
  command: string;
}

function buildInstallCommand(update: DependencyUpdate): string {
  if (update.kind === 'npm') {
    return `npm install ${update.name}@${update.latestVersion}`;
  }
  return `pip install ${update.name}==${update.latestVersion}`;
}

export async function runSandbox(
  update: DependencyUpdate,
): Promise<SandboxResult> {
  const sandboxDir = path.join(config.workspaceRoot, '.doctor-sandboxes', update.name);
  await fs.ensureDir(sandboxDir);

  const workdir = path.join(sandboxDir, 'project');
  await fs.remove(workdir);
  await fs.ensureDir(workdir);
  // mirror project files
  await fs.copy(config.workspaceRoot, workdir, {
    filter: (src) => !src.includes('.doctor-sandboxes') && !src.includes('node_modules'),
  });

  const installCmd = buildInstallCommand(update);
  const testCmd = config.projectCommand;
  const shellCommand = `${installCmd} && ${testCmd}`;

  log.info(`Running sandbox for ${update.name}: ${shellCommand}`);
  try {
    const { stdout, stderr, exitCode } = await execa(
      'docker',
      [
        'run',
        '--rm',
        '-v',
        `${workdir}:${config.sandboxWorkdir}`,
        '-w',
        config.sandboxWorkdir,
        config.sandboxImage,
        'bash',
        '-lc',
        shellCommand,
      ],
      { timeout: 15 * 60 * 1000 },
    );
    return {
      crashed: false,
      stdout,
      stderr,
      exitCode,
      command: shellCommand,
    };
  } catch (err) {
    const e = err as any;
    const stdout = e.stdout || '';
    const stderr = e.stderr || '';
    const stacktrace = parseStack(stderr) || parseStack(stdout);
    return {
      crashed: true,
      stdout,
      stderr,
      exitCode: e.exitCode ?? null,
      stacktrace: stacktrace?.stack,
      file: stacktrace?.file,
      line: stacktrace?.line,
      api: stacktrace?.api,
      command: shellCommand,
    };
  }
}

function parseStack(output: string):
  | { stack: string; file?: string; line?: number; api?: string }
  | null {
  const lines = output.split('\n').filter(Boolean);
  const stack = lines.slice(-25).join('\n');
  for (const line of lines) {
    const match = line.match(/([/\\w.\\-\\/]+):(\\d+)/);
    if (match) {
      return {
        stack,
        file: match[1],
        line: Number(match[2]),
      };
    }
    const apiMatch = line.match(/deprecated (\\w+)/i);
    if (apiMatch) {
      return { stack, api: apiMatch[1] };
    }
  }
  return { stack };
}

