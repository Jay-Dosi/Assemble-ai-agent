import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';
import axios from 'axios';
import { config } from '../config.js';
import { IncidentRecord, RepairPlan, ValidationResult } from '../types.js';
import { log } from '../util/logger.js';

const git = simpleGit();

async function ensureBranch(branch: string) {
  await git.checkout(['-B', branch]);
}

export async function openPullRequest(
  incident: IncidentRecord,
  plan: RepairPlan,
  validation: ValidationResult,
) {
  if (!config.githubToken || !config.repoFullName) {
    log.warn('GitHub credentials missing; skipping PR creation');
    return;
  }
  const octokit = new Octokit({ auth: config.githubToken });
  const branch = `depdoctor/${incident.dependency.name}-${incident.id.slice(0, 6)}`;
  await ensureBranch(branch);
  await git.add('.');
  await git.commit(`fix: repair ${incident.dependency.name} upgrade`);
  await git.push('origin', branch, ['-f']);

  const [owner, repo] = config.repoFullName.split('/');
  const prTitle = `Fix ${incident.dependency.name} upgrade failure`;
  const prBody = `
## Incident
- Dependency: ${incident.dependency.name} ${incident.dependency.currentVersion} -> ${incident.dependency.latestVersion}
- Stacktrace: \n\`\`\`\n${incident.stacktrace}\n\`\`\`

## Plan
${plan.summary}

## Validation
- Success: ${validation.success}
- Exit code: ${validation.exitCode}
- Stdout: \n\`\`\`\n${validation.stdout}\n\`\`\`
- Stderr: \n\`\`\`\n${validation.stderr}\n\`\`\`
`;

  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    head: branch,
    base: 'main',
    title: prTitle,
    body: prBody,
  });

  try {
    await octokit.pulls.requestReviewers({
      owner,
      repo,
      pull_number: pr.number,
      team_reviewers: ['coderabbitai'],
    });
  } catch (err) {
    log.warn('CodeRabbit request reviewers failed', err);
  }
  log.info(`PR created: ${pr.html_url}`);
}

export async function pushToDashboard(payload: unknown) {
  try {
    await axios.post(`${config.dashboardOrigin}/api/events`, payload);
  } catch (err) {
    log.warn('Dashboard push failed', err);
  }
}

