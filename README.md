# CineFinn

This is meant to be a super simple alternative to Plex but of course much simpler and mainly to get Hands on with Video Processing Vue and other cool stuff

## To Run Certain Jobs

```bash
npm run job -- --name jobname
```

## Code I Joinked

### The Full Video Player (Highly changed and customized by myself + integrated into the Vue Eco System)

- [Web Dev Simplified](https://www.youtube.com/watch?v=ZeNyjnneq_w)
- [His Repository](https://github.com/WebDevSimplified/youtube-video-player-clone)

### The Bootstrap 5 Autocomplete

- [gch1p](https://github.com/gch1p)
- [His Repository](https://github.com/gch1p/bootstrap-5-autocomplete)

## Todo

- [x] Id indexing for series
- [x] Job listings and displaying
  - [x] Job Types: previewImgs-Generation, previewImgs-Check, series-Scrape,
- [x] if user get back to video start playing at last position
- [x] Pregenerate the previewImgs
- [x] add a store for all user watched episodes
  - [x] Think of an elegant way to store those kind of information
- [x] make the debounce server side optimal for multiple clients
- [x] display the title of the movies somewhere
- [x] Add generate Images and parse images also for movies
- [ ] Add the control information modal
- [ ] Add the series information modal
- [ ] Add the full series watched information modal
- [ ] Implement a method to un watch a specific series or season
- [x] Show the current time while scrubbing through the video
- [x] Show a back to top Button on the List page (or maybe make the navbar sticky)
- [ ] Anime Preview (10 - 15 sec.)
- [ ] Implement the command manager and some basic command (session = to list current sockets, info = to show series infos and space infos, reload = to reload the series from their file)
- [ ] Implement a job-cli system to run a pre specified job with the cli
  - [ ] Change ID Job : A Job for which i can change an ID instant wihout any problems
  - [ ] Obtain Side-Infos : To Obtain the series image and infos as well as start & end date
