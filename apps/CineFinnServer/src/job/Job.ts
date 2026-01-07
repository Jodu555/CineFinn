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
    lastLogLineLength = 0;
    lastSave = 0;
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
    static fromDummy(type: JobType) {
        return new Job(crypto.randomUUID(), type, {}, [], {}, 0, 0, -1);
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

    async sendSocketUpdate(immediate = false) {
        //TODO: Broadcast to allegebale clients
        const socketJob = JSON.parse(JSON.stringify(this.toDB()));
        socketJob.data = {};
        socketJob.logs = socketJob.logs.slice(-10);
        (await getIO().fetchSockets()).forEach(socket => {
            if (socket.data.auth.type === 'client') {
                if (immediate) {
                    console.log('Sending Socket Update ', socket.data.auth.user.username)
                    socket.emit('jobUpdate', socketJob);
                    // getIO().emit('jobUpdate', socketJob);
                } else {
                    // getIO().volatile.emit('jobUpdate', socketJob);
                }

            }
        });
        // getIO().emit('jobUpdate', socketJob);
        if (immediate) {
            // getIO().emit('jobUpdate', socketJob);
        } else {
            // getIO().volatile.emit('jobUpdate', socketJob);
        }
    }

    async save(immediate = true) {
        if (this.created_at == -1) return;

        // if (immediate == false) {
        //     const socketJob = JSON.parse(JSON.stringify(this.toDB()));
        //     socketJob.logs = socketJob.logs.slice(-10);
        //     getIO().emit('jobUpdate', socketJob);
        //     console.log('SENT jobUpdate to socket');
        // } else {
        //     getIO().emit('jobUpdate', this.toDB());
        //     console.log('SENT jobUpdate to socket');
        // }

        this.sendSocketUpdate(immediate);

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
            }, 800);
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
        // await this.saveLogLine();
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
        await this.save(true);
    }

    async setResult(result: any) {
        this.result = result;
        await this.save(true);
    }

    async success() {
        this.failed_at = 0;
        this.finished_at = Date.now();
        await this.save(true);
    }

    async fail() {
        this.failed_at = Date.now();
        await this.save(true);
    }
}