import type { JobType, Job as IJob, timestamped } from "@cinefinn/types/database";
import { jobsTable } from "../database.js";
import { getIO } from "../utils.js";

export class Job {
    UUID: string;
    type: JobType;
    data: any;
    logs: string[];
    result: any;
    failed_at: number;
    finished_at: number;
    created_at: number;

    timers: Map<string, number> = new Map();
    queuedSaved = false;
    queuedSaveTimeout: NodeJS.Timeout | null = null;
    constructor(UUID: string, type: JobType, data: any, logs: string[], result: any, failed_at: number, finished_at: number, created_at: number) {
        this.UUID = UUID;
        this.type = type;
        this.data = data;
        this.logs = logs;
        this.result = result;
        this.failed_at = failed_at;
        this.finished_at = finished_at;
        this.created_at = created_at;
    }

    static fromDB(dbJob: IJob & timestamped) {
        return new Job(dbJob.UUID, dbJob.type, dbJob.data, dbJob.logs, dbJob.result, dbJob.failed_at, dbJob.finished_at, dbJob.created_at);
    }
    static async fromDBUUID(UUID: string) {
        const dbJob = await jobsTable.getOne({ UUID });
        if (dbJob == undefined) {
            throw new Error('Job not found');
        }
        return Job.fromDB(dbJob);
    }

    toDB(): IJob & timestamped {
        return {
            UUID: this.UUID,
            type: this.type,
            data: this.data,
            logs: this.logs,
            result: this.result,
            failed_at: this.failed_at,
            finished_at: this.finished_at,
            created_at: this.created_at,
            updated_at: Date.now(),
        };
    }

    async save(immediate = true) {

        //TODO: Broadcast to allegebale clients
        getIO().emit('jobUpdate', this.toDB());

        if (immediate == false) {
            if (this.queuedSaved) {
                return;
            }
            this.queuedSaved = true;
            if (this.queuedSaveTimeout != null) {
                clearTimeout(this.queuedSaveTimeout);
            }
            this.queuedSaveTimeout = setTimeout(() => {
                this.queuedSaved = false;
                this.save(true);
            }, 900);
            return;
        } else {
            this.queuedSaved = false;
            if (this.queuedSaveTimeout != null) {
                clearTimeout(this.queuedSaveTimeout);
            }
        }

        await jobsTable.update({ UUID: this.UUID }, {
            data: this.data,
            logs: this.logs,
            result: this.result,
            failed_at: this.failed_at,
            finished_at: this.finished_at,
        });
    }

    async log(...args: any[]) {

        let partialLine = '';

        for (const arg of args) {
            if (typeof arg === 'object') {
                partialLine += `${JSON.stringify(arg)} `;
                continue;
            }
            partialLine += `${arg} `;
        }

        const logLine = `[${this.type}] ${this.UUID.split('-')[0]}: ${partialLine}`;
        console.log(logLine);
        this.logs.push(logLine);
        await this.save(false);
        return logLine;
    }

    time(label: string) {
        this.timers.set(label, Date.now());
    }

    async timeEnd(label: string) {
        const start = this.timers.get(label);
        if (start == undefined) {
            throw new Error('Timer not found');
        }
        const end = Date.now();
        this.timers.delete(label);
        await this.log(`[${label}] Took ${end - start}ms`);
    }

    async setData(data: any) {
        this.data = data;
        await this.save(false);
    }

    async setResult(result: any) {
        this.result = result;
        await this.save(false);
    }

    async success() {
        this.failed_at = 0;
        this.finished_at = Date.now();
        await this.save();
    }

    async fail() {
        this.failed_at = Date.now();
        await this.save();
    }
}