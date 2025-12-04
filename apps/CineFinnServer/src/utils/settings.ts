import type { SettingsObject } from "@cinefinn/types/database";

const langsOptions = ['GerDub', 'GerSub', 'EngDub', 'EngSub', 'JapDub', 'EngSubK', 'GerSubK', 'GerSubC', 'EngSubC'];

const defaultSettings: SettingsObject = {
    preferredLanguage: { title: 'Your Preffered Language', type: 'select', value: 'GerDub', options: langsOptions },
    showVideoTitleContainer: { title: 'Show the Video Title Container?', type: 'checkbox', value: true },
    showLatestWatchButton: { title: 'Show the latest watch button?', type: 'checkbox', value: true },
    developerMode: { title: 'Show the developer Infos?', type: 'checkbox', value: false },
    autoSkip: { title: 'Auto Skip to next Episode at the end?', type: 'checkbox', value: true },
    skipSegments: { title: 'Skip Segments?', type: 'checkbox', value: false },
    enableBetaFeatures: { title: 'Enable Beta Features?', type: 'checkbox', value: false },
    volume: { type: 'hide', value: 1 },
};

// function compareSettings(settings: SettingsObject) {
//     const outputSettings = { ...settings } as SettingsObject;
//     for (const _setting in defaultSettings) {
//         const setting = _setting as keyof SettingsObject;
//         if (settings?.[setting]) {
//             //@ts-ignore
//             outputSettings[setting] = settings[setting];
//         } else {
//             //@ts-ignore
//             outputSettings[setting] = defaultSettings[setting];
//         }
//     }
//     return outputSettings;
// }
function compareSettings(settings: any) {
    const defSettings = defaultSettings as any;
    const outputSettings = { ...settings };
    for (const defaultSettingKey in defaultSettings) {
        if (settings[defaultSettingKey] == undefined) {
            outputSettings[defaultSettingKey] = defSettings[defaultSettingKey];
        } else {
            outputSettings[defaultSettingKey] = defSettings[defaultSettingKey];
            outputSettings[defaultSettingKey].value = settings[defaultSettingKey].value;
        }
    }
    return outputSettings;
}

export { defaultSettings, compareSettings };