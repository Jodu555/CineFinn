export interface MyAsianSeries {
    url: string;
    title: string;
    informations: MyAsianInformations;
    episodes: MyAsianEpisode[];
}

export interface MyAsianInformations {
    year: string;
    status: string;
    genres: string[];
    description: string;
    image: string;
}

export interface MyAsianEpisode {
    number: number;
    slug: string;
    url: string;
    title: string;
    langs: ('Subtitle' | 'Raw')[];
    year: string;
}
