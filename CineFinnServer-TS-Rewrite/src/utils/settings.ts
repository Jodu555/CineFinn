import { SettingsObject } from '../types/session';

const defaultSettings: SettingsObject = {
	preferredLanguage: { title: 'Your Preffered Language', value: 'GerDub' },
	showVideoTitleContainer: { title: 'Show the Video Title Container?', type: 'checkbox', value: true },
	showLatestWatchButton: { title: 'Show the latest watch button?', type: 'checkbox', value: true },
	developerMode: { title: 'Show the developer Infos?', type: 'checkbox', value: false },
	showNewsAddForm: { title: 'Show the Add News Form', type: 'checkbox', value: false },
	autoSkip: { title: 'Auto Skip to next Episode at the end?', type: 'checkbox', value: true },
	skipSegments: { title: 'Skip Segments?', type: 'checkbox', value: false },
	enableBetaFeatures: { title: 'Enable Beta Features?', type: 'checkbox', value: false },
	volume: { type: 'hide', value: 1 },
};

function compareSettings(settings: SettingsObject) {
	const outputSettings = { ...settings };
	for (const setting in defaultSettings) {
		if (settings?.[setting]) {
			outputSettings[setting] = settings[setting];
		} else {
			outputSettings[setting] = defaultSettings[setting];
		}
	}
	return outputSettings;
}

export { defaultSettings, compareSettings };
