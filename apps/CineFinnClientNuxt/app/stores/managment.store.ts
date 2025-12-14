import type { Job, JobType, timestamped } from '@cinefinn/types/database'
import { defineStore } from 'pinia'
import useAPIURL from '~/hooks/useAPIURL';

export const useManagmentStore = defineStore('managment', {
    state: () => ({
        loading: false,
        jobRegistry: {
            crawl: 'Crawl the Archive',
            generatePreviewImages: 'Generate Preview Images',
            'checkForUpdates-old': 'Check for Updates Old',
            'checkForUpdates-smart': 'Check for Updates Smart',
        } as Record<JobType, string>,
        jobs: [] as (Job & timestamped)[],
    }),
    actions: {
        async loadJobs() {
            this.loading = true;
            const response = await $fetch<(Job & timestamped)[]>(useAPIURL() + '/managment/jobs/info', {
                headers: {
                    'auth-token': useAuthStore().authToken || '',
                },
            });
            this.jobs = response;
            this.loading = false;
        },
        updateJob(job: (Job & timestamped)) {
            // console.log('Updating Job', job);
            const index = this.jobs.findIndex((j) => j.UUID === job.UUID)
            if (index !== -1) {
                this.jobs[index] = { ...this.jobs[index], ...job }
            } else {
                this.jobs.push({ ...job })
            }
        }
    }
})
