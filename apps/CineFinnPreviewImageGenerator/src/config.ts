import { setupConfigurationManagment } from "@cinefinn/configuration-manager";

export interface Config {
    version: string;
    generatorName: string;
    redisConnection: {
        host: string;
        port: number;
        password: string;
    };
    concurrentGenerators: number;
    useReadRate: boolean;
    useExperimentalAPIUpload: boolean;
    tempImagePath: string;
    pathRemapper: Record<string, string>;
}

const defaultConfig: Config = {
    version: '1.0.3',
    generatorName: 'previewImageGenerator',
    redisConnection: {
        host: 'localhost',
        port: 6379,
        password: '',
    },
    concurrentGenerators: 5,
    useReadRate: false,
    useExperimentalAPIUpload: false,
    tempImagePath: '/tmp/previewImageGenerator',
    pathRemapper: {
        '/media/all/CineFinn-data': '/mnt/test',
    },
};

let config: Config;

export function getConfig() {
    if (config == undefined) {
        config = setupConfigurationManagment(defaultConfig, []);
    }
    return config;
}