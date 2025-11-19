import type { JobType, Job as IJob } from "@cinefinn/types/database";
import { jobsTable } from "./database.js";

export class Job {
    UUID: string;
    type: JobType;
    data: any;
    logs: string[];
    result: any;
    failed_at: number;
    finished_at: number;

    timers: Map<string, number> = new Map();
    constructor(UUID: string, type: JobType, data: any, logs: string[], result: any, failed_at: number, finished_at: number) {
        this.UUID = UUID;
        this.type = type;
        this.data = data;
        this.logs = logs;
        this.result = result;
        this.failed_at = failed_at;
        this.finished_at = finished_at;
    }

    static fromDB(dbJob: IJob) {
        return new Job(dbJob.UUID, dbJob.type, dbJob.data, dbJob.logs, dbJob.result, dbJob.failed_at, dbJob.finished_at);
    }
    static async fromDBUUID(UUID: string) {
        const dbJob = await jobsTable.getOne({ UUID });
        if (dbJob == undefined) {
            throw new Error('Job not found');
        }
        return Job.fromDB(dbJob);
    }

    async save() {
        await jobsTable.update({ UUID: this.UUID }, {
            data: this.data,
            logs: this.logs,
            result: this.result,
            failed_at: this.failed_at,
            finished_at: this.finished_at,
        });
    }

    async log(...args: any[]) {
        const logLine = `[${this.type}] ${this.UUID}: ${args.join(' ')}`;
        console.log(logLine);
        this.logs.push(logLine);
        await this.save();
    }

    time(label: string) {
        this.timers.set(label, Date.now());
    }

    timeEnd(label: string) {
        const start = this.timers.get(label);
        if (start == undefined) {
            throw new Error('Timer not found');
        }
        const end = Date.now();
        this.timers.delete(label);
        this.log(`[${label}] Took ${end - start}ms`);
    }

    setData() {

    }
}