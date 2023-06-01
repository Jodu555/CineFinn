const defaultSettings = {
	preferredLanguage: { title: 'Your Preffered Language', value: 'GerDub' },
	showVideoTitleContainer: { title: 'Show the Video Title Container?', type: 'checkbox', value: true },
	showLatestWatchButton: { title: 'Show the latest watch button?', type: 'checkbox', value: true },
	developerMode: { title: 'Show the developer Infos?', type: 'checkbox', value: false },
	showNewsAddForm: { title: 'Show the Add News Form', type: 'checkbox', value: false },
	autoSkip: { title: 'Auto Skip to next Episode at the end?', type: 'checkbox', value: true },
	volume: { type: 'hide', value: 1 },
};

function compareSettings(settings) {
	const outputSettings = {};
	for (const setting in defaultSettings) {
		if (settings?.[setting]) {
			outputSettings[setting] = settings[setting];
		} else {
			outputSettings[setting] = defaultSettings[setting];
		}
	}
	return outputSettings;
}

module.exports = {
	defaultSettings,
	compareSettings,
};
