import fs from 'fs';
import path from 'path';
import { execa } from 'execa';
import axios from 'axios';
import { config } from '../config.js';
import { FilePatch, RepairPlan } from '../types.js';
import { log } from '../util/logger.js';

async function applyPatchLocally(root: string, patch: FilePatch) {
  const patchFile = path.join(root, '.doctor-patch.diff');
  fs.writeFileSync(patchFile, patch.patch, 'utf8');
  try {
    await execa('patch', ['--dry-run', '-p0', '-i', patchFile], { cwd: root });
  } catch (err: any) {
    const msg = String(err.stderr || err.message || '');
    if (msg.includes('Reversed (or previously applied) patch detected')) {
      log.info(`Patch already applied for ${patch.path}`);
      fs.unlinkSync(patchFile);
      return;
    }
    throw err;
  }
  try {
    await execa('patch', ['-p0', '-i', patchFile], { cwd: root });
  } finally {
    fs.unlinkSync(patchFile);
  }
}

export async function dispatchCline(plan: RepairPlan, root: string) {
  for (const p of plan.patchset) {
    try {
      // try remote Cline first
      await axios.post(
        config.clineEndpoint,
        {
          mission: `Apply patch to ${p.path}: ${p.instructions}`,
          patch: p.patch,
        },
        { timeout: 15000 },
      );
      log.info(`Sent mission to Cline for ${p.path}`);
    } catch (err) {
      log.warn(`Cline unavailable, applying locally for ${p.path}`, err);
      await applyPatchLocally(root, p);
    }
  }
}

