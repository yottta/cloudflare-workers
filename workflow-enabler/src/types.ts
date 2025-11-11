export interface Env {
  // Secrets
  GITHUB_TOKEN: string;

  // Environment variables
  ENVIRONMENT?: string;
}

export interface WorkflowConfig {
  name: string;
  enableIfDeactivated: boolean;
}

export interface RepositoryConfig {
  owner: string;
  repo: string;
  workflows: WorkflowConfig[];
}

export interface MonitoringConfig {
  monitoring: {
    repositories: RepositoryConfig[];
  };
  worker: {
    scheduleMinutes: number;
  };
}

export interface Workflow {
  id: number;
  name: string;
  path: string;
  state: 'queued' | 'in_progress' | 'completed' | 'disabled_inactivity';
}
