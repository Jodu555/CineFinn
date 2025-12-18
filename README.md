# CineFinn v2

This is the repository for my personal project CineFinn v2, a Movie Series / Anime Streaming Platform.
it is the successor to the CineFinn v1 Project which is now deprecated and will not be updated anymore.

## MVP Disclaimer

> The v1 Had a lot of Features that will greatly overpower the basic MVP
> I want to at first implement a basic MVP with only the most important features
> and then slowly add more features over time so that the v2 is a more complete version that has kind feature parity with the v1
> although the v2 has a complete database model overhaul and a completely reworked frontend so they cant be interchangeable used
> Technically all the MVP features are Server & Client side since I decided to rewrite both from scratch

- [x] User Authentication (Login, Register, Logout)
  - [x] Fix the Cookie issue on token expiration
  - [x] Implement the Settings System
    - [ ] Implement all the settings handling in the frontend (all that's possible at least)
- [x] Home Page to find Series
- [ ] Job system to handle jobs
  - [x] Crawling
  - [x] Generate Preview Images
  - [ ] Check for Updates
    - [ ] Smart Check
    - [ ] Old Check
- [x] Series Indexing
- [x] Watching Videos
- [x] Series Watch Page
- [x] Same VideoPlayer as in v1
- [x] Create ConfigugrationManager package
- [ ] Use the configugrationManager in all the app's
  - [x] Server
  - [x] Scraper
  - [ ] PreviewImageGenerator
  - [x] SubSystem

Note: The JobSystem does not mean to already write the consumers for the jobs. It just means that the server will create a necessary job!

When all the boxes are checked, I will deploy the MVP to a testing environment and then start only using this! To find out if the MVP is working as expected, and eliminate any bugs.

> Immediately after the MVP I want to implement the following features:

- [ ] Preview Image Generation
- [ ] Scraper
- [x] SubSystem
- [ ] Admin System
  - [ ] Make Most of the Config Values like register and register token configurable
  - [ ] Have a way to view emails and the status of them
- [x] Playlist System
- [ ] Sync System

## Word Explanation:

- Series: A Series is a Collection of Movies and or Seasons (S-UUID)
- Movie: A Movie is a single Movie (MO-UUID)
- Season: A Season is a Collection of Episodes (SE-UUID)
- Episode: An Episode is a single Episode (EP-UUID)
- Watchable: A Watchable is a single Movie or Episode (EP-UUID or MO-UUID)
- Watchable Entity: A Watchable Entity is a Watchable's File. Common difference between same Watchable is the SubSystem or the Language (WE-UUID)
- Watch History: A Watch History is a single Watch Time for a Watchable

## Thoughts and Considerations

- I am currently thinking about caching the full index and the partial index in memory. Something like redis. Meaning that the /index/all and /index/S-ID would get a significant speedup and the /index also with the partial index cache. When implementing this i need to think about how to handle the cache invalidation. But sinde the recrawl is deterministic, i can just invalidate the cache when the recrawl is done. And maybe already refill the cache with the new data when the recrawl is done. So that the user does not have to wait for the next request.
- I need to consider which in memory cache to use. Redis or something else. Or maybe just use the Server Memory or write the cache to disk. Whatever happens to be faster and more reliable.

## Code I Joinked

### The Full Video Player (Highly changed and customized by myself + integrated into the Vue Eco System)

- [Web Dev Simplified](https://www.youtube.com/watch?v=ZeNyjnneq_w)
- [His Repository](https://github.com/WebDevSimplified/youtube-video-player-clone)

### The Bootstrap 5 Autocomplete (Moderately changed and customized by myself + integrated into the Vue Eco System)

- [gch1p](https://github.com/gch1p)
- [His Repository](https://github.com/gch1p/bootstrap-5-autocomplete)

### The SVG Circle Generator (Slightly changed and customized by myself + integrated into the Vue Eco System)

- [nikitahl](https://github.com/nikitahl)
- [The Repository](https://github.com/nikitahl/svg-circle-progress-generator)
- [The Specific Script Itself](https://github.com/nikitahl/svg-circle-progress-generator/blob/main/script.js)

### The Idea for the Transition Phase between v1 and v2

- The v1 site will be accessible under the normal domain!
- After I am comfortable with the v2 I will migrate the v1 site to the new domain
  - Comfortable means that the v2 has at least feature parity with the v1 and is stable enough
  - Until then the v2 site will be accessible using the normal domain suffixed with v2 (e.g. normaldomain.domain.com => v2.normaldomain.domain.com)
