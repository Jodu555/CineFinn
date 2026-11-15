export default function useAPIURL() {
    const config = useRuntimeConfig();
    const API_URL = config.public.apiBaseURL + '';
    // const API_URL = 'https://v2.cinema-api.jodu555.de/';
    return API_URL;
};