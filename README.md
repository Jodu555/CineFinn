# CineFinn

This is meant to be a super simple alternative to Plex but of course much simpler and mainly to get Hands on with Video Processing Vue and other cool stuff

## To Run Certain Jobs

```bash
npm run job -- --name jobname
```

## Defaults for jobs

```bash
# For the propsToSeries concatenation job
npm run job -- --name propsToSeries --model model.json --input in.json --output out.json
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
- [x] Show the current time while scrubbing through the video
- [x] Show a back to top Button on the List page (or maybe make the navbar sticky)
- [x] Extract the Video stuff into own component
- [ ] Add the control information modal
- [ ] Add the series information modal
- [ ] Add the full series watched information modal
- [ ] Implement a method to un watch a specific series or season
- [ ] Anime Preview (10 - 15 sec.)
- [ ] Implement the command manager and some basic command (session = to list current sockets, info = to show series infos and space infos, reload = to reload the series from their file)
- [x] Implement a job-cli system to run a pre specified job with the cli
  - [ ] Change ID Job : A Job for which i can change an ID instant wihout any problems
  - [ ] Obtain Side-Infos : To Obtain the series image and infos as well as start & end date
  - [ ] Write a job to re calculate the watch list to the episode and season numbers (1 based)
- [x] ReThink the current series store
- [x] Rework the whole watch page and use code splitting smart indexing and much more
  - [x] Basically rewirte the whole watch page
- [ ] Add an Primy like sidebar with the characters
- [ ] Add Playlists for users e.g. (Watchlist)
  - [ ] Let the user create its own playlists with names
- [ ] Think about a way on how to make it work to add an intro skip button
- [x] Change in the Navigation search (if you hold CTRL + Enter then open the selected series in a new tab)
- [ ] Implement a native (so called todo list) to see wich series are still not ripped/downloaded/uploaded and maybe also with sorting
- [x] Make the website more mobile accessibill
- [ ] Add some more controls
  - [ ] 0 - 9 for video percentage skip
  - [ ] . & , for 1 frame more and less
- [ ] Account/Authentication System Update
  - [ ] Restrict accounts so they cannot trigger certain jobs / Only Show the jobs an account is permitted to execute
  - [ ] Save the audio volume number in state, and maybe also in account
  - [ ] Implement User Settings to toggle specific infos
    - [ ] the stuff thats always hardcoded in the state
      - [ ] Bring it also to the Settings Drawer

## v2

The language Devision version
This Version introduces and overwrited filename parser system
and an Language Integration system

## v3

This Version introduces the playlist idea and the account information/settings idea

## Stretch

- [ ] implement a cron job which automatically checks all downloaded series for updates and writes them to a list
- [ ] Add the downloader and scraping service into ext. services
- [ ] Implement a way to sync watch animes smth. like SyncTube for YT or Watchtogether
