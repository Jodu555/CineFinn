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

## Tech Stack

- Front-end: Vue.js + Vuex + Vue-Router + Bootstrap + Vue-SweetAlert-2 + Socket.io + Fontawesome
- Back-end: MySql + Node.js + Express + Socket.io + ffmpeg(for Video encoding/transcoding)

## Code I Joinked

### The Full Video Player (Highly changed and customized by myself + integrated into the Vue Eco System)

- [Web Dev Simplified](https://www.youtube.com/watch?v=ZeNyjnneq_w)
- [His Repository](https://github.com/WebDevSimplified/youtube-video-player-clone)

### The Bootstrap 5 Autocomplete (Moderately changed and customized by myself + integrated into the Vue Eco System)

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
- [x] Add the control information modal
- [ ] Add the series information modal
- [x] Add the full series watched information dropdown
- [x] Implement a method to un watch a specific series or season
- [ ] Anime Preview (10 - 15 sec.)
- [x] Implement the command manager and some basic command (session = to list current sockets, info = to show series infos and space infos, reload = to reload the series from their file)
- [x] IMPORTANT: **Finally Upgrade to TypeScript so i do not have this fucking pain in my ass!!!**
- [ ] IMPORTANT: **Finally Upgrade the client to TypeScript so adding new features gets easier!!!**
- [x] Rewrite the crawler to remove some stupid old stuff
- [ ] Remove my Networking library cause it lags some stuff, and replace it with axios
- [x] Implement the sharing also with movies
- [x] Implement the sharing to include the language
- [ ] Use a vue integrated modal instead of the bootstrap javascript one (get's confused on HMR)
  - [ ] For the ShareModal
  - [ ] For the ControlsInformationModal
  - [ ] For the RMVCModal
  - [ ] For the Settings Side Drawer
- [ ] Maybe add a brightness control to the video element with CSS Property"filter: brightness(0.7);"
- [x] Implement a job-cli system to run a pre specified job with the cli
  - [ ] Change ID Job : A Job for which i can change an ID instant wihout any problems
  - [ ] Obtain Side-Infos : To Obtain the series image and infos as well as start & end date
  - [x] Delete Preview Images: To Instantly delete all Preview Images
- [x] ReThink the current series store
- [x] Rework the whole watch page and use code splitting smart indexing and much more
  - [x] Basically rewirte the whole watch page
- [x] Think about maybe on GET /index to not send so mch data over the wire
- [x] Make the website more mobile accessibill
- [x] Rework the image directory structure
- [x] Change in the Navigation search (if you hold CTRL + Enter then open the selected series in a new tab)
- [x] Add some more controls
  - [x] 0 - 9 for video percentage skip
    - [x] Add a nice skip animation
  - [x] . & , for 1 frame more and less
- [ ] Add an Primy like sidebar with the characters
- [ ] Add Playlists for users e.g. (Watchlist)
  - [ ] Let the user create its own playlists with names
- [x] Think about a way on how to make it work to add an intro skip button
- [x] Show the Approx. Intro in the timeline
- [x] Implement a Intro Skip button
- [x] Collect the Intro Skip Informations from an External API
- [x] Implement a native (so called todo list) to see wich series are still not ripped/downloaded/uploaded and maybe also with sorting
  - [x] Add an confirmation Dialog on Using a Todo
  - [x] Add an confirmation Dialog on Deleting a Todo
- [x] Implement a clean entity switch even if the video is finished playing
- [x] Update the Client Navigation Search to use native vue for better data updates
- [x] Port the client application to vite for faster builds and better HMR
- [x] Add a PATCH /index/ID route to update single anime informations
- [ ] Port vuex to pinia
- [x] Think about how to display if only movies are present for example for (Rush Hour/Star Wars)
- [ ] Add better mobile accessbillity for scrubbing
- [x] Add Loading Indicators
  - [x] Initial Page Load
  - [x] News Form POST and GET
  - [x] Watch route
  - [x] Video Buffering
- [x] Move "Previous & Title & Languages & Next" to its own Componen, maybe called entity infoControls cause the ent is one single video and it displays informations and controls
- [ ] Show an Image in the search bar with

```html
<input
	type="text"
	class="form-control dropdown-toggle show"
	placeholder="Search for a series..."
	autocomplete="off"
	style="width: 20rem;"
	data-bs-toggle="dropdown"
	aria-expanded="true"
/>
<img src="cover.jpg" style="width: 15%; height: auto; margin-right: 0.5rem;" />
```

- [ ] Add a Setting to toggle the card images (for lower bandwidth)
- [x] Update the preview images to be language specific (preview images for every language an episode is in) cause if the episode is longer or shorter
- [x] Implement the update check for EngDub Series
- [x] Implement the update check for sto series
- [x] Implement my own hover so when the mouse is still over, but has'nt moved since hide the menu
- [ ] Account/Authentication System Update
  - [ ] Implement a password change in the settings
  - [ ] Implement Email Change in the settings
  - [x] Implement IP and last Handshake logging
  - [x] Restrict accounts so they cannot trigger certain jobs / Only Show the jobs an account is permitted to execute
  - [x] Save the audio volume number in state, and maybe also in account
  - [x] Implement User Settings to toggle specific infos
    - [x] the stuff thats always hardcoded in the state
      - [x] Bring it also to the Settings Drawer

## v2

The language Devision version
This Version introduces and overwrited filename parser system
and an Language Integration system

## v3

This Version introduces the RMVC (Remote Video Control) System the Upgraded Video Player
(Enhanced One Screen Mouse Over) the Sharing Functionallity and the improved account settings

## v4

This Version introduces the account restriction idea
although the general permission system and therefore the account restrictions and the ToDo Setting

## v5 (TODO)

This version should introduce the Sync System and the new HomePage

## Stretch

- [ ] implement a cron job which automatically checks all downloaded series for updates and writes them to a list
- [x] Add the downloader and scraping service into ext. services
- [ ] Implement a way to sync watch animes smth. like SyncTube for YT or Watchtogether
- [ ] **ForYou Page** instead of the basic list with dropdown
  - [ ] Last Watched
    - [ ] Not currently possible cause there is no timestamp in the watchList
  - [ ] Newly Added
    - [ ] Not currently possible since there is no tracking for updated series
  - [ ] You Might Like
    - [ ] For the start this can just be a simple tag ranking system no biggie
- [ ] **Adaptive Bitrate Streaming** and Choosable Quality (Yes i said it a pretty big deal for me to learn and wrap my head around) (maybe with a fallback to the normal streaming)
  - [ ] No Pre transcoding Necessary cause it would use more space and to be honest it's just too easy to implement
  - [ ] So **Live Transcoding** it is using ffmpeg which we already use for the image generation and later for the intro detection
    - [ ] No Librarys at least for core functionality so parser or something is okay but not a lib that just does the stuff
- [ ] **Intro/Outro Detection** a reliable fast pipeline to process intros and outros in the episodes
  - [ ] There are some libs in python that do this farely well and it would be interesting to implement those libraries into node with rest (has a bit from microservices)
  - [ ] Add a Setting to toggle auto intro/outro (segment) skip
