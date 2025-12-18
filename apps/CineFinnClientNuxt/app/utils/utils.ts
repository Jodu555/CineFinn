import type { FrontendSeries } from "@cinefinn/types/database";

export function roleIDToName(id: number) {
    switch (id) {
        case 1:
            return 'User';
        case 2:
            return 'Moderator';
        case 3:
            return 'Administrator';
        default:
            return 'Unknown Role';
    }
}

export const validateEmail = (email: string) => {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
};

export const decideSeriesImage = (series: FrontendSeries) => {
    if (series.infos.image) {
        return `https://cinema-api.jodu555.de/images/${series.UUID}/cover.jpg`;
    } else if (series.infos.imageURL) {
        return series.infos.imageURL;
    } else {
        const randomNumber = useState('randomNumber' + series.UUID, () => Math.floor(Math.random() * 1000));
        return `https://picsum.photos/seed/movie${randomNumber.value}/300/400`;
    }
};

export const langDetails = {
    gerdub: {
        title: 'Deutsch/German',
        alt: 'Deutsche Sprache, Deutsche Flagge, Flagge, Flag',
    },
    gersub: {
        title: 'Japanisch mit deutschen Untertiteln',
        alt: 'Deutsche Flagge, Flagge, Untertitel, Flag',
    },
    engdub: {
        title: 'Englisch/English',
        alt: 'Englische Sprache, Englische Flagge, Flagge, Flag',
    },
    engsub: {
        title: 'Japanisch mit englischen Untertiteln',
        alt: 'Englische Flagge, Flagge, Untertitel, Flag',
    },
    japdub: {
        title: 'Japanisch/Japanese',
        alt: 'Japanische Flagge, Flagge, Original, Flag',
    },
    engsubk: {
        title: 'Koreanisch mit englischen Untertiteln',
        alt: 'Englische Flagge, Flagge, Untertitel, Flag, Koreanisch, Korean',
    },
    gersubk: {
        title: 'Koreanisch mit deutschen Untertiteln',
        alt: 'Deutsche Flagge, Flagge, Untertitel, Flag, Koreanisch, Korean',
    },
    engsubc: {
        title: 'Chinesisch mit englischen Untertiteln',
        alt: 'Englische Flagge, Flagge, Untertitel, Flag, Chinesisch, Chinese',
    },
    gersubc: {
        title: 'Chinesisch mit deutschen Untertiteln',
        alt: 'Deutsche Flagge, Flagge, Untertitel, Flag, Chinesisch, Chinese',
    },
} as Record<string, { title: string; alt: string; }>;