```
npm install
npm run dev
```

```
open http://localhost:3000
```

## Feautre Parity

> After giving it some more thought getting Feature Parity might not be what i want at least not 1:1 the same responses
> Since i already Completely reworked the whole crawler and the whole indexing system the same json response would be actually careless
> Sicne i would throw so much data away that would be highly useful to the 

I changed my mind again... Feature Parity is an illusion.
I will build out this backend the way i see fit and then will just Build a new Frontend for it.
No bending over backwards to have it behave and expect the same responses as the old one.

### Routes

#### Static
/images

#### Proxys
- [ ] /segments
- [ ] /bullboard
- [ ] /anidb
- [ ] /imageRewriteSSL
- [ ] /MAIN_PROXY

#### Video Streaming Route
/video
- [ ] GET /video

#### JSON
/status
- [ ] GET /status

/managment
- [ ] GET /managment/jobs/info
- [ ] GET /managment/job/img/generate
- [ ] GET /managment/job/checkForUpdates-smart
- [ ] GET /managment/job/checkForUpdates-old
- [ ] GET /managment/job/crawl

/news
- [ ] GET /news
POST /news

/index
- [ ] GET /index
- [ ] POST /index
- [ ] GET /index/all
- [ ] GET /index/:ID
- [ ] PATCH /index/:ID
- [ ] POST /index/:ID/cover

/previewImages
- [ ] POST /previewImages/createPresignedURL
- [ ] POST /previewImages/deletePresignedURL
- [ ] POST /previewImages/upload

/watch
- [ ] GET /watch/info
- [ ] GET /watch/mark/:seriesID/season/:seasonID/:bool => POST /watch/toggleSeason {seriesID: string, seasonID: number, toggle: boolean}
- [ ] GET /watch/mark/:seriesID/season/:seasonID/:bool
- [ ] 												   => POST /watch/updateTime {WEID: string, time: number}

/recommendation
- [ ] GET /recommendation

/room
- [ ] GET /room
- [ ] GET /room/:id
- [ ] GET /room/:id/headsup

/todo

- [ ] GET /todo
- [ ] GET /todo/permittedAccounts

/ignorelist
- [ ] GET /ignorelist
- [ ] PUT /ignorelist/item
- [ ] DELETE /ignorelist/item/:ID


/admin
- [ ] GET /admin/accounts
- [ ] GET /admin/subsystems
- [ ] DELETE /admin/subsystems/movingItem
- [ ] POST /admin/subsystems/movingItem
- [ ] GET /admin/overview


### Concepts
- [x] Auth (Login, Logout, Register, Info)
- [ ] Indexing
- [ ] WatchTime
- [ ] SyncSystem
- [ ] Admin
    - [ ] Overview
    - [ ] Accounts
    - [ ] Jobs
    - [ ] SubSystems
    - [ ] IgnoreList
- [ ] Recommendation
- [ ] PreviewImages
- [ ] Video Streaming