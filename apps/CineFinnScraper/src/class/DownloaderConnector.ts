import type { ExtendedEpisodeDownload, ScraperToServerEvents, ServerToScraperEvents } from "@cinefinn/types";
import { msToReadable } from "@cinefinn/utilities/time";
import { tryCatch } from "@cinefinn/utilities/tryCatch";
import axios, { type AxiosInstance } from "axios";
import type { Socket } from "socket.io-client";
import { getConfig } from "../config.js";

export class DownloaderConnector {

    private jobUUID: string;
    private socket: Socket<ServerToScraperEvents, ScraperToServerEvents>;
    private timingMap = new Map<string, number>();

    private axiosInstance: AxiosInstance;

    constructor(jobUUID: string, socket: Socket<ServerToScraperEvents, ScraperToServerEvents>) {
        this.jobUUID = jobUUID;
        this.socket = socket;

        this.axiosInstance = axios.create({
            baseURL: getConfig().ANI_DL.HOST,
            headers: {
                token: getConfig().ANI_DL.TOKEN,
            },
            timeout: 1000 * 60 * 15, // 15 minutes Timeout for each request
        });
    }

    private log(...args: any[]) {
        this.socket.emit('job:log', this.jobUUID, ...args);
        console.log(`[${this.jobUUID}]`, ...args);
    }

    private time(label: string) {
        this.timingMap.set(label, Date.now());
    }

    private timeEnd(label: string) {
        const time = this.timingMap.get(label);
        if (time == undefined) return;
        this.timingMap.delete(label);
        this.log(`[${label}] Took ${msToReadable(Date.now() - time)}`);
    }

    async upload(list: ExtendedEpisodeDownload[]): Promise<string | undefined> {
        this.time('Upload');
        const { data: uploadData, error: uploadError } = await tryCatch(() => this.axiosInstance.post<{ ID: string }>(`/upload`,
            {
                data: list,
            }
        ));
        if (uploadError) {
            this.log('Error uploading', uploadError);
            return;
        }
        const ID = uploadData.data.ID;
        this.timeEnd('Upload');
        return ID;
    }

    async collect(ID: string) {
        this.time('Collect');
        const { data: collectData, error: collectError } = await tryCatch(() => this.axiosInstance.get<ExtendedEpisodeDownload[]>(`/collect/${ID}`));
        if (collectError) {
            this.log('Error collecting', collectError);
            return;
        }
        this.timeEnd('Collect');
        return collectData;
    }

    async download(ID: string) {
        this.time('Download');
        const { data: downloadData, error: downloadError } = await tryCatch(() => this.axiosInstance.get<ExtendedEpisodeDownload[]>(`/download/${ID}`));
        if (downloadError) {
            this.log('Error downloading', downloadError);
            return;
        }
        this.timeEnd('Download');
        return downloadData;
    }

    async finish(ID: string) {
        this.time('Finish');
        const { data: finishData, error: finishError } = await tryCatch(() => this.axiosInstance.get(`/finish/${ID}`));
        if (finishError) {
            this.log('Error finishing', finishError);
            return;
        }
        this.timeEnd('Finish');
    }

    async kickOffAniDl(list: ExtendedEpisodeDownload[]) {
        try {
            const ID = await this.upload(list);
            if (ID == undefined) {
                return;
            }
            await this.collect(ID);
            await this.download(ID);
            await this.finish(ID);
        } catch (error) {
            this.log('ERROR:', error);
        }
    }
}