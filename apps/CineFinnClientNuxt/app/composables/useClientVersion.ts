export default function useClientVersion() {
    const config = useRuntimeConfig();
    const CLIENT_VERSION = config.public.clientVersion + '';
    return CLIENT_VERSION;
};