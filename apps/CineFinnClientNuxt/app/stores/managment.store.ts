import type { Job, JobType, timestamped } from '@cinefinn/types/database';
import { defineStore } from 'pinia';

import type { FetchError } from 'ofetch';

export const useManagmentStore = defineStore('managment', {
    state: () => ({
        loading: false,
        error: '',
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
            this.error = '';
            const { data: response, error } = await tryCatch<Promise<(Job & timestamped)[]>, FetchError>(() => $fetch<(Job & timestamped)[]>(useAPIURL() + '/managment/jobs/info', {
                headers: {
                    'auth-token': useAuthStore().authToken || '',
                }
            }));
            this.loading = false;
            if (error) {
                this.error = error.message || 'An unknown error occurred.';
                return;
            }
            this.jobs = response;
        },
        updateJob(job: (Job & timestamped)) {
            // console.log('Updating Job', job);
            const index = this.jobs.findIndex((j) => j.UUID === job.UUID);
            if (index !== -1) {
                this.jobs[index] = { ...this.jobs[index], ...job };
            } else {
                this.jobs.push({ ...job });
            }
        },
        async deleteJob(jobUUID: string) {
            this.error = '';
            this.loading = true;
            const { data, error } = await tryCatch<Promise<void>, FetchError>(() => $fetch<void>(useAPIURL() + '/managment/jobs/delete/' + jobUUID, {
                method: 'DELETE',
                headers: {
                    'auth-token': useAuthStore().authToken,
                }
            }));
            this.loading = false;
            if (error) {
                this.error = error.data || 'An unknown error occurred.';
                return;
            } else {
                this.jobs = this.jobs.filter((job) => job.UUID !== jobUUID);
            }
        },
    }
});
