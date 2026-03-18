export default function useAPIURL() {
    const config = useRuntimeConfig();
    const API_URL = config.public.apiBaseURL + '';
    // const API_URL = 'https://api.mein-haushaltsbuch.com/api';
    // const API_URL = 'http://192.168.178.67:4444/api';
    // const API_URL = 'http://localhost:3600/api';
    return API_URL;
};