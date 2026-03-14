import { setupConfigurationManagment } from "@cinefinn/configuration-manager";

interface Config {
    version: string;
    identifier: string;
    entrypoint: string;
    port: number;
    endpoint: string | false;
    bandwidth: number; // in MB/s
    core: {
        url: string;
        token: string;
    };
}

const defaultConfig: Config = {
    version: '1.0.2',
    identifier: 'local-kdrama',
    entrypoint: '/home/Media/K-Drama',
    port: 9999,
    endpoint: false, //If false the subsystem assumes socket streaming! If set to a string, this will be the endpoint to proxy the video too
    bandwidth: 0, // in MB/s
    core: {
        url: 'http://localhost:3100',
        token: 'SUPER-SECURE-CORE-TOKEN',
    },
};

let config: Config;

export function getConfig() {
    if (config == undefined) {
        const cliOptions = [['identifier', 'I'], ['entrypoint', 'E'], ['port', 'P'], ['endpoint'], ['core-url'], ['core-token']];
        config = setupConfigurationManagment(defaultConfig, cliOptions);
    }
    return config;
}