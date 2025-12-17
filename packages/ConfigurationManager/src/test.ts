import { setupConfigurationManagment } from "./index.js";

interface Config {
    version: string;
    foo: string;
    bar: string;
    baz: {
        foo: string;
        bar: string;
    }
}

const defaultConfig: Config = {
    version: '1.0.0',
    foo: 'foo',
    bar: 'bar',
    baz: {
        foo: 'foo',
        bar: 'bar',
    }
}

const cfg = setupConfigurationManagment<Config>(defaultConfig, []);

console.log(cfg);
