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

export const generateEmailID = () => {
    return `MAIL-${generateID()}`;
};

export const generateWatchHistoryID = () => {
    return `WH-${generateID()}`;
};

export const generateJobID = () => {
    return `JOB-${generateID()}`;
};

export const generatePlaylistID = () => {
    return `PL-${generateID()}`;
};