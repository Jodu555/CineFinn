import type { timestamped } from "../shared/utilities.js";
import type { Movie, WatchableEntity } from "./media.js";

export interface FranchiseContentMovie {
    type: 'movie';
    id: string;
    poster: string;
    year: number;
    description: string;
}

export interface FranchiseContentSeries {
    type: 'series';
    id: string;
}

export type FranchiseContentMovieExtened = FranchiseContentMovie &
{
    item: (Movie & timestamped);
    watchableEntities: (WatchableEntity & timestamped)[]
};

export type FranchiseContent = FranchiseContentMovie | FranchiseContentSeries;

export type FranchiseContentExtended = FranchiseContentMovieExtened | FranchiseContentSeries;

export interface SubFranchise {
    id: string;
    name: string;
    description: string;
    logo: string;
    content: FranchiseContent[];
}

export type SubFranchiseExtended = Omit<SubFranchise, 'content'> & { content: FranchiseContentExtended[] };

export interface FranchiseData {
    id: string;
    name: string;
    description: string;
    backgroundImage: string;
    logo: string;
    subFranchises: SubFranchise[];
    mainContent: FranchiseContent[];
}

export interface FranchiseDataExtended extends Omit<FranchiseData, 'mainContent' | 'subFranchises'> {
    mainContent: FranchiseContentExtended[];
    subFranchises: SubFranchiseExtended[];
    totalContent: number;
}