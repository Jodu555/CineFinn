const langDetails = {
	gerdub: {
		title: 'Deutsch/German',
		alt: 'Deutsche Sprache, Deutsche Flagge, Flagge, Flag',
	},
	gersub: {
		title: 'Mit deutschen Untertiteln',
		alt: 'Deutsche Flagge, Flagge, Untertitel, Flag',
	},
	engdub: {
		title: 'Englisch/English',
		alt: 'Englische Sprache, Englische Flagge, Flagge, Flag',
	},
	engsub: {
		title: 'Mit englischen Untertiteln',
		alt: 'Englische Flagge, Flagge, Untertitel, Flag',
	},
	japdub: {
		title: 'Japanisch/Japanese',
		alt: 'Japanische Flagge, Flagge, Original, Flag',
	},
} as Record<string, { title: string; alt: string }>;

function roleIDToName(id: number) {
	switch (id) {
		case 1:
			return 'User';
		case 2:
			return 'Moderator';
		case 3:
			return 'Administrator';
	}
}

export { langDetails, roleIDToName };
