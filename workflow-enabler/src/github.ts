import type {Workflow} from './types';

export class GitHubClient {
	private readonly baseUrl = 'https://api.github.com';

	constructor(private token: string) {
	}

	private async fetchWithRetry(url: string, options: RequestInit, maxRetries: number = 4, baseDelay: number = 1000): Promise<Response> {
		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				const response = await fetch(url, options);

				// If it's a 5xx error, we should retry
				if (response.status >= 500 && response.status < 600 && attempt < maxRetries) {
					const delay = baseDelay * 2 ** attempt;
					console.log(`GitHub API 5xx error (${response.status}), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
					await new Promise((resolve) => setTimeout(resolve, delay));
					continue;
				}

				// For non-5xx responses or final attempt, return the response
				return response;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				// Network errors should be retried
				if (attempt < maxRetries) {
					const delay = baseDelay * 2 ** attempt;
					console.log(`Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1}):`, lastError.message);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		// If we get here, all retries failed
		throw lastError || new Error('All retry attempts failed');
	}

	async getWorkflow(owner: string, repo: string, workflowFileName: string): Promise<Workflow | null> {
		const url = `${this.baseUrl}/repos/${owner}/${repo}/actions/workflows/${workflowFileName}`;

		try {
			const response = await this.fetchWithRetry(url, {
				headers: {
					Authorization: `Bearer ${this.token}`,
					Accept: 'application/vnd.github.v3+json',
					'User-Agent': 'OpenTofu-Registry-Monitor'
				}
			});

			if (!response.ok) {
				throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
			}

			const wf = (await response.json()) as Workflow;

			if (wf) {
				console.log(`Found workflow ${workflowFileName} with ID ${wf.id} at path ${wf.path}`);
			} else {
				console.log(
					`Could not find workflow ${workflowFileName}`
				);
			}

			return wf;
		} catch (error) {
			console.error(`Error fetching workflows: ${error}`);
			return null;
		}
	}

	async enableWorkflow(owner: string, repo: string, workflowId: number): Promise<void> {
		console.log(`Enabling ${workflowId}`)
		const url = `${this.baseUrl}/repos/${owner}/${repo}/actions/workflows/${workflowId}/enable`;

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.token}`,
					Accept: 'application/vnd.github.v3+json',
					'User-Agent': 'OpenTofu-Registry-Monitor'
				}
			});

			if (!response || !response.ok) {
				throw new Error(`GitHub API error enabling the workflow ${workflowId}: ${response.status} ${response.statusText}`);
			}
			response.status
		} catch (error) {
			console.error(`Error fetching workflow ${workflowId}: ${error}`);
		}
	}


}
