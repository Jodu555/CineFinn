import { randomUUID } from "crypto";

const generateID = () => {
    return randomUUID().split('-')[0];
};

export const generateSeriesID = () => {
    return `S-${generateID()}`;
};

export const generateSeasonID = () => {
    return `SE-${generateID()}`;
};

export const generateMovieID = () => {
    return `MO-${generateID()}`;
};

export const generateEpisodeID = () => {
    return `EP-${generateID()}`;
};

export const generateEntityID = () => {
    return `WE-${generateID()}`;
};