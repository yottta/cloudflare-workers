import { config } from './config';
import { GitHubClient } from './github';
import type { Env, MonitoringConfig, WorkflowConfig } from './types';

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    // Manual trigger endpoint
    if (url.pathname === '/trigger') {
      // Manually trigger the scheduled handler
      ctx.waitUntil(checkAllWorkflows(env));
      return new Response('Monitor triggered', { status: 200 });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    return new Response('GitHub Actions Monitor\n\nEndpoints:\n- /trigger - Manually trigger the monitor\n- /health - Health check\n- POST /reset-alerts - Clear all stored alerts', { status: 200 });
  },

  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    await checkAllWorkflows(env);
  }
} satisfies ExportedHandler<Env>;

async function checkAllWorkflows(env: Env): Promise<void> {
  console.log(`=== GitHub Actions enabler ${new Date().toISOString()} ===`);

  try {
    // Initialize clients
    const github = new GitHubClient(env.GITHUB_TOKEN);

    // Check each repository and workflow
    for (const repo of config.monitoring.repositories) {
      for (const workflow of repo.workflows) {
        try {
          await checkWorkflow(env, github, repo, workflow, config);
        } catch (error) {
          console.error(`Error checking workflow ${workflow.name} in ${repo.owner}/${repo.repo}:`, error);
        }
      }
    }

    console.log(`=== Check completed`);
  } catch (error) {
    console.error('Fatal error in monitor:', error);
  }
}

async function checkWorkflow(env: Env, github: GitHubClient, repo: { owner: string; repo: string }, workflow: WorkflowConfig, config: MonitoringConfig): Promise<void> {
  const repoFullName = `${repo.owner}/${repo.repo}`;
  console.log(`Checking ${repoFullName} - ${workflow.name}`);

  await enableWorkflowIfDisabled(github, repo, workflow)
}

async function enableWorkflowIfDisabled(github: GitHubClient, repo: { owner: string; repo: string }, workflow: WorkflowConfig) {
	const ghWorkflow = await github.getWorkflow(repo.owner, repo.repo, workflow.name);
	console.log(`Workflow ${workflow.name} status is ${ghWorkflow?.state}`)
	// if (ghWorkflow?.state == "disabled_inactivity") {
	if (!ghWorkflow) {
		return
	}
	await github.enableWorkflow(repo.owner, repo.repo, workflow.name)
	// }
}
