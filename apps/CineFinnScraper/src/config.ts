import { setupConfigurationManagment } from "@cinefinn/configuration-manager";

const cliOptions = [['identifier', 'I'], ['entrypoint', 'E'], ['port', 'P'], ['endpoint'], ['core-url'], ['core-token']];

interface Config {
    version: string;
    CORE: {
        URL: string;
        AUTH_TOKEN: string;
    };
    SCRAPER_TOKEN: string;
}

const defaultConfig: Config = {
    version: '1.0.0',
    CORE: {
        URL: 'http://localhost:3000',
        AUTH_TOKEN: 'SUPER-SECURE-CORE-TOKEN',
    },
    SCRAPER_TOKEN: 'SUPER-SECURE-SCRAPER-TOKEN',
};

let config: Config;

export function getConfig() {
    if (config == undefined) {
        console.log('setted up config');

        config = setupConfigurationManagment<Config>(defaultConfig, cliOptions);
    }
    return config;
}