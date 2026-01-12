import { setupConfigurationManagment } from "@cinefinn/configuration-manager";

const cliOptions = [['identifier', 'I'], ['entrypoint', 'E'], ['port', 'P'], ['endpoint'], ['core-url'], ['core-token']];

interface Config {
    version: string;
    PORT: number;
    CORE: {
        URL: string;
        AUTH_TOKEN: string;
    };
    SCRAPER_TOKEN: string;
    SCRAPER_CLIENT_TOKEN: string;
}

const defaultConfig: Config = {
    version: '1.0.0',
    PORT: 4000,
    CORE: {
        URL: 'http://localhost:3000',
        AUTH_TOKEN: 'SUPER-SECURE-CORE-TOKEN',
    },
    SCRAPER_TOKEN: 'SUPER-SECURE-SCRAPER-TOKEN',
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