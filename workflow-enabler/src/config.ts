import type { MonitoringConfig } from './types';

const providers = [
  'ddns'
];

// Generate provider repositories configuration
const providerRepos = providers.map((provider) => ({
  owner: 'yottta',
  repo: provider,
  workflows: [
    {
      name: 'govulncheck.yml',
	  enableIfDeactivated: true
    },
  ]
}));

// Configuration for the GitHub Actions monitor
export const config: MonitoringConfig = {
  monitoring: {
    repositories: providerRepos,
  },
  worker: {
    scheduleMinutes: 5
  }
};
