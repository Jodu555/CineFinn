import { setupConfigurationManagment } from "@cinefinn/configuration-manager";

const cliOptions = [['identifier', 'I'], ['entrypoint', 'E'], ['port', 'P'], ['endpoint'], ['core-url'], ['core-token']];

interface Config {
    version: string;
    PORT: number;
    CORE: {
        URL: string;
        REST_AUTH_TOKEN: string;
        SCRAPER_SOCKET_TOKEN: string;
    };
    ANI_DL: {
        HOST: string;
        TOKEN: string;
    }
    SCRAPER_CLIENT_TOKEN: string;
}

const defaultConfig: Config = {
    version: '1.0.1',
    PORT: 4000,
    CORE: {
        URL: 'http://localhost:3000',
        REST_AUTH_TOKEN: 'SECR-DEV',
        SCRAPER_SOCKET_TOKEN: 'SUPER-SECURE-CORE-TOKEN',
    },
    ANI_DL: {
        HOST: 'http://localhost:8080',
        TOKEN: 'SUPER-SECURE-ANI-DL-TOKEN',
    },
    SCRAPER_CLIENT_TOKEN: 'SUPER_SECURE-SCRAPER_CLIENT_TOKEN',
};

let config: Config;

export function getConfig() {
    if (config == undefined) {
        console.log('setted up config');

        config = setupConfigurationManagment<Config>(defaultConfig, cliOptions);
    }
    return config;
}