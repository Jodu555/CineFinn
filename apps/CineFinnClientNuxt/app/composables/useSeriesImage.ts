import type { FrontendSeries } from '@cinefinn/types/database';

export function useSeriesImage() {
  const apiURL = useAPIURL();
  const authStore = useAuthStore();

  const decideSeriesImage = (series: FrontendSeries, randomNumber?: string | number) => {
    if (series.infos.image) {
      const url = new URL(`${apiURL}/images/${series.UUID}/cover.jpg`);
      url.searchParams.append('auth-token', authStore.authToken);
      return url.href;
    } else if (series.infos.imageURL) {
      return series.infos.imageURL;
    } else {
      return `https://picsum.photos/seed/movie${randomNumber}/300/400`;
    }
  };

  return { decideSeriesImage };
}