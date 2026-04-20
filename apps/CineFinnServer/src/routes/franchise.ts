import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { HTTPException } from "hono/http-exception";
import z from "zod";
import type { FranchiseContent, FranchiseContentExtended, FranchiseContentMovieExtened, FranchiseData, FranchiseDataExtended, SubFranchiseExtended } from "@cinefinn/types/models/franchise";
import { franchiseTable, moviesTable, watchableEntitysTable } from "../database.js";


//This is so cool. basically a Union in ZOD thats crazy
const ContentSchema = z.discriminatedUnion(
    'type',
    [
        z.object({
            type: z.literal('movie'),
            id: z.string().min(1, "Content ID is required"),
            year: z.number().int(),
            description: z.string(),
            poster: z.string(),
        }),
        z.object({
            type: z.literal('series'),
            id: z.string().min(1, "Content ID is required"),
        })
    ]
);

const SubFranchiseSchema = z.object({
    id: z.string().min(1, "Sub-franchise ID is required"),
    name: z.string().min(1, "Sub-franchise name is required"),
    description: z.string(),
    logo: z.string(),
    content: z.array(ContentSchema),
});

const FranchiseDataSchema = z.object({
    id: z.string().min(1, "Franchise ID is required"),
    name: z.string().min(1, "Franchise name is required"),
    description: z.string(),
    backgroundImage: z.string(),
    logo: z.string(),
    subFranchises: z.array(SubFranchiseSchema),
    mainContent: z.array(ContentSchema),
});

// const franchiseData: Record<string, FranchiseData> = {
//     // starwars: {
//     //     id: 'starwars',
//     //     name: 'Star Wars',
//     //     description: 'An epic space opera franchise created by George Lucas, spanning the rise and fall of the Jedi Order, the battle between the light and dark sides of the Force, and the ultimate redemption of the galaxy across multiple generations.',
//     //     backgroundImage: 'https://kimi-web-img.moonshot.cn/img/lumiere-a.akamaihd.net/9cf371f2cd64c9c1629e79564c391cfe23daf80b.jpeg',
//     //     logo: 'https://kimi-web-img.moonshot.cn/img/upload.wikimedia.org/2631a51c7b63c3304653c6aeb400449bf220c1e9.png',
//     //     totalContent: 12,
//     //     subFranchises: [
//     //         {
//     //             id: 'skywalker-saga',
//     //             name: 'The Skywalker Saga',
//     //             description: 'The nine-episode episodic series following the Skywalker family and their impact on the galaxy, from the fall of the Republic through the rise and fall of the Empire and beyond.',
//     //             logo: 'https://kimi-web-img.moonshot.cn/img/cdn.freebiesupply.com/1369c48d0e9fbadb3f3f46826c052dc097f0ad9f.png',
//     //             content: [
//     //                 {
//     //                     id: 'sw-episode-iv',
//     //                     title: 'Star Wars: Episode IV - A New Hope',
//     //                     year: 1977,
//     //                     rating: 8.6,
//     //                     duration: '2h 1m',
//     //                     description: 'Luke Skywalker joins forces with a Jedi Knight, a cocky pilot, a Wookiee and two droids to save the galaxy from the Empire\'s world-destroying battle station, while also attempting to rescue Princess Leia from the mysterious Darth Vader.',
//     //                     poster: 'https://kimi-web-img.moonshot.cn/img/cdn.displate.com/c1cb670620c1586b344ea455c459dcc278c9189d.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Sci-Fi', 'Adventure', 'Fantasy', 'Action']
//     //                 },
//     //                 {
//     //                     id: 'sw-episode-v',
//     //                     title: 'Star Wars: Episode V - The Empire Strikes Back',
//     //                     year: 1980,
//     //                     rating: 8.7,
//     //                     duration: '2h 4m',
//     //                     description: 'After the Rebels are brutally overpowered by the Empire on the ice planet Hoth, Luke Skywalker begins Jedi training with Yoda, while his friends are pursued across the galaxy by Darth Vader and bounty hunter Boba Fett.',
//     //                     poster: 'https://kimi-web-img.moonshot.cn/img/i.ebayimg.com/5d3f12c5062c44cb51f19633b72e1e5c325145a5.JPG',
//     //                     type: 'movie',
//     //                     genre: ['Sci-Fi', 'Adventure', 'Fantasy', 'Action']
//     //                 },
//     //                 {
//     //                     id: 'sw-episode-vi',
//     //                     title: 'Star Wars: Episode VI - Return of the Jedi',
//     //                     year: 1983,
//     //                     rating: 8.3,
//     //                     duration: '2h 11m',
//     //                     description: 'After a daring mission to rescue Han Solo from Jabba the Hutt, the Rebels dispatch to Endor to destroy the second Death Star. Meanwhile, Luke struggles to help Darth Vader back from the dark side without falling into the Emperor\'s trap.',
//     //                     poster: 'https://kimi-web-img.moonshot.cn/img/i.ebayimg.com/a0d5c34dcc0b458b214271ed21eea2f5191caf9b.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Sci-Fi', 'Adventure', 'Fantasy', 'Action']
//     //                 },
//     //                 {
//     //                     id: 'sw-episode-i',
//     //                     title: 'Star Wars: Episode I - The Phantom Menace',
//     //                     year: 1999,
//     //                     rating: 6.5,
//     //                     duration: '2h 16m',
//     //                     description: 'Two Jedi escape a hostile blockade to find allies and come across a young boy who may bring balance to the Force, but the long dormant Sith resurface to claim their original glory.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/6wkfovpn7Eq8dYNKaG5PY3q2oq6.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Sci-Fi', 'Adventure', 'Fantasy', 'Action']
//     //                 },
//     //                 {
//     //                     id: 'sw-episode-vii',
//     //                     title: 'Star Wars: Episode VII - The Force Awakens',
//     //                     year: 2015,
//     //                     rating: 7.8,
//     //                     duration: '2h 18m',
//     //                     description: 'Three decades after the Empire\'s defeat, a new threat arises in the militant First Order. Defected stormtrooper Finn and the scavenger Rey are caught up in the Resistance\'s search for the missing Luke Skywalker.',
//     //                     poster: 'https://kimi-web-img.moonshot.cn/img/lumiere-a.akamaihd.net/9cf371f2cd64c9c1629e79564c391cfe23daf80b.jpeg',
//     //                     type: 'movie',
//     //                     genre: ['Sci-Fi', 'Adventure', 'Fantasy', 'Action']
//     //                 }
//     //             ]
//     //         },
//     //         {
//     //             id: 'disney-plus-originals',
//     //             name: 'Disney+ Original Series',
//     //             description: 'Live-action series exploring new corners of the galaxy, from the outer rim adventures of a lone gunfighter to the investigations of a former Jedi Knight.',
//     //             logo: 'https://kimi-web-img.moonshot.cn/img/upload.wikimedia.org/2631a51c7b63c3304653c6aeb400449bf220c1e9.png',
//     //             content: [
//     //                 {
//     //                     id: 'mandalorian-s1',
//     //                     title: 'The Mandalorian',
//     //                     year: 2019,
//     //                     rating: 9.0,
//     //                     duration: '8 episodes',
//     //                     description: 'The travels of a lone bounty hunter in the outer reaches of the galaxy, far from the authority of the New Republic. Din Djarin, a Mandalorian gunfighter, protects a mysterious child with Force abilities.',
//     //                     poster: 'https://kimi-web-img.moonshot.cn/img/lumiere-a.akamaihd.net/0530f5a2502a2dc16187dd4b4ecf7d69a9483d72.jpeg',
//     //                     type: 'series',
//     //                     genre: ['Sci-Fi', 'Western', 'Adventure', 'Action']
//     //                 },
//     //                 {
//     //                     id: 'ahsoka-s1',
//     //                     title: 'Ahsoka',
//     //                     year: 2023,
//     //                     rating: 8.5,
//     //                     duration: '8 episodes',
//     //                     description: 'Former Jedi knight Ahsoka Tano investigates an emerging threat to a vulnerable galaxy, hunting for Grand Admiral Thrawn and searching for her lost friend Ezra Bridger.',
//     //                     poster: 'https://kimi-web-img.moonshot.cn/img/www.movieposters.com/a2a7f907104023eff3b06b5ccbec714bdae8046b.jpg',
//     //                     type: 'series',
//     //                     genre: ['Sci-Fi', 'Adventure', 'Fantasy', 'Action']
//     //                 }
//     //             ]
//     //         },
//     //         {
//     //             id: 'standalone-films',
//     //             name: 'Standalone Stories',
//     //             description: 'Anthology films that explore unique perspectives within the Star Wars universe, from the soldiers who stole the Death Star plans to the smugglers who navigate the galaxy\'s underworld.',
//     //             logo: 'https://kimi-web-img.moonshot.cn/img/upload.wikimedia.org/2631a51c7b63c3304653c6aeb400449bf220c1e9.png',
//     //             content: [
//     //                 {
//     //                     id: 'rogue-one',
//     //                     title: 'Rogue One: A Star Wars Story',
//     //                     year: 2016,
//     //                     rating: 7.8,
//     //                     duration: '2h 13m',
//     //                     description: 'In a time of conflict, a group of unlikely heroes band together on a mission to steal the plans to the Death Star, the Empire\'s ultimate weapon of destruction.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/5jX3p0apUG5bkMHtnKzchDjStbS.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Sci-Fi', 'War', 'Adventure', 'Action']
//     //                 },
//     //                 {
//     //                     id: 'solo',
//     //                     title: 'Solo: A Star Wars Story',
//     //                     year: 2018,
//     //                     rating: 6.9,
//     //                     duration: '2h 15m',
//     //                     description: 'During an adventure into the criminal underworld, Han Solo meets his future co-pilot Chewbacca and encounters Lando Calrissian years before joining the Rebellion.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/4oD6VEccFkorEBTEDX3pKgmre8G.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Sci-Fi', 'Western', 'Adventure', 'Action']
//     //                 }
//     //             ]
//     //         }
//     //     ],
//     //     mainContent: [
//     //         {
//     //             id: 'sw-episode-iv-main',
//     //             title: 'Star Wars: Episode IV - A New Hope',
//     //             year: 1977,
//     //             rating: 8.6,
//     //             duration: '2h 1m',
//     //             description: 'The film that started it all. Luke Skywalker\'s journey from farm boy to galactic hero defined the modern blockbuster and created a cultural phenomenon that spans generations.',
//     //             poster: 'https://kimi-web-img.moonshot.cn/img/cdn.displate.com/c1cb670620c1586b344ea455c459dcc278c9189d.jpg',
//     //             type: 'movie',
//     //             genre: ['Sci-Fi', 'Adventure', 'Fantasy']
//     //         },
//     //         {
//     //             id: 'mandalorian-main',
//     //             title: 'The Mandalorian',
//     //             year: 2019,
//     //             rating: 9.0,
//     //             duration: '8 episodes',
//     //             description: 'The groundbreaking series that launched the Disney+ era of Star Wars, introducing the world to Grogu (Baby Yoda) and redefining Star Wars storytelling for the streaming age.',
//     //             poster: 'https://kimi-web-img.moonshot.cn/img/lumiere-a.akamaihd.net/0530f5a2502a2dc16187dd4b4ecf7d69a9483d72.jpeg',
//     //             type: 'series',
//     //             genre: ['Sci-Fi', 'Western', 'Adventure']
//     //         }
//     //     ]
//     // },

//     // mcu: {
//     //     id: 'mcu',
//     //     name: 'Marvel Cinematic Universe',
//     //     description: 'A groundbreaking multimedia franchise and shared universe centered on a series of superhero films produced by Marvel Studios, featuring characters from Marvel Comics. The franchise includes comic books, short films, television series, and digital series.',
//     //     backgroundImage: 'https://kimi-web-img.moonshot.cn/img/images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/adb85f89578abfceece3f6086b80effd2deafe0b.jpg',
//     //     logo: 'https://kimi-web-img.moonshot.cn/img/images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/9c809f1e1e4156d71b87c16408ad992e5e270e36.png',
//     //     totalContent: 37,
//     //     subFranchises: [
//     //         {
//     //             id: 'phase-one',
//     //             name: 'Phase One: Avengers Assembled',
//     //             description: 'The beginning of the Infinity Saga, introducing the core Avengers team and establishing the interconnected nature of the MCU. These films built the foundation for the cinematic universe.',
//     //             logo: 'https://kimi-web-img.moonshot.cn/img/images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/9c809f1e1e4156d71b87c16408ad992e5e270e36.png',
//     //             content: [
//     //                 {
//     //                     id: 'iron-man',
//     //                     title: 'Iron Man',
//     //                     year: 2008,
//     //                     rating: 9.4,
//     //                     duration: '2h 6m',
//     //                     description: 'After being held captive in an Afghan cave, billionaire engineer Tony Stark creates a unique weaponized suit of armor to fight evil. The film that launched the MCU and redefined superhero cinema.',
//     //                     poster: 'https://kimi-web-img.moonshot.cn/img/image.tmdb.org/eb86257a1b1381c27be4bfd79da04b0f39e4e7fd.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Action', 'Sci-Fi', 'Adventure', 'Superhero']
//     //                 },
//     //                 {
//     //                     id: 'the-avengers',
//     //                     title: 'The Avengers',
//     //                     year: 2012,
//     //                     rating: 9.1,
//     //                     duration: '2h 23m',
//     //                     description: 'Earth\'s mightiest heroes must come together and learn to fight as a team if they are going to stop the mischievous Loki and his alien army from enslaving humanity.',
//     //                     poster: 'https://kimi-web-img.moonshot.cn/img/i.ebayimg.com/ee3bde88fc204a88dafc3ce729821413a6bb17d8.JPG',
//     //                     type: 'movie',
//     //                     genre: ['Action', 'Sci-Fi', 'Adventure', 'Superhero']
//     //                 },
//     //                 {
//     //                     id: 'captain-america-first-avenger',
//     //                     title: 'Captain America: The First Avenger',
//     //                     year: 2011,
//     //                     rating: 6.9,
//     //                     duration: '2h 4m',
//     //                     description: 'Steve Rogers, a rejected military soldier, transforms into Captain America after taking a dose of a "Super-Soldier serum". But being Captain America comes at a price as he attempts to take down a war monger and a terrorist organization.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/vSNxAJTlD0r02V9sPYpOjqDZXUK.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Action', 'Sci-Fi', 'Adventure', 'Superhero', 'War']
//     //                 }
//     //             ]
//     //         },
//     //         {
//     //             id: 'phase-three',
//     //             name: 'Phase Three: The Infinity Saga Climax',
//     //             description: 'The highest-rated phase of the MCU, featuring the epic conclusion of the Thanos storyline and introducing groundbreaking films like Black Panther and Captain Marvel.',
//     //             logo: 'https://kimi-web-img.moonshot.cn/img/images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/9c809f1e1e4156d71b87c16408ad992e5e270e36.png',
//     //             content: [
//     //                 {
//     //                     id: 'black-panther',
//     //                     title: 'Black Panther',
//     //                     year: 2018,
//     //                     rating: 9.6,
//     //                     duration: '2h 14m',
//     //                     description: 'T\'Challa, heir to the hidden but advanced kingdom of Wakanda, must step forward to lead his people into a new future and must confront a challenger from his country\'s past.',
//     //                     poster: 'https://kimi-web-img.moonshot.cn/img/filmartgallery.com/7aa54f78203206ab8d2f88a406e22344c505c412.jpeg',
//     //                     type: 'movie',
//     //                     genre: ['Action', 'Sci-Fi', 'Adventure', 'Superhero']
//     //                 },
//     //                 {
//     //                     id: 'avengers-endgame',
//     //                     title: 'Avengers: Endgame',
//     //                     year: 2019,
//     //                     rating: 9.4,
//     //                     duration: '3h 1m',
//     //                     description: 'After the devastating events of Avengers: Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more in order to reverse Thanos\' actions and restore balance to the universe.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Action', 'Sci-Fi', 'Adventure', 'Superhero', 'Drama']
//     //                 },
//     //                 {
//     //                     id: 'thor-ragnarok',
//     //                     title: 'Thor: Ragnarok',
//     //                     year: 2017,
//     //                     rating: 9.3,
//     //                     duration: '2h 10m',
//     //                     description: 'Imprisoned on the planet Sakaar, Thor must race against time to return to Asgard and stop Ragnarök, the destruction of his world, at the hands of the powerful and ruthless villain Hela.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/rzRwTcFvttcN1eaXMqFR5vOZw2n.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Action', 'Sci-Fi', 'Adventure', 'Superhero', 'Comedy']
//     //                 },
//     //                 {
//     //                     id: 'guardians-galaxy-vol3',
//     //                     title: 'Guardians of the Galaxy Vol. 3',
//     //                     year: 2023,
//     //                     rating: 8.2,
//     //                     duration: '2h 30m',
//     //                     description: 'Still reeling from the loss of Gamora, Peter Quill must rally his team to defend the universe and protect one of their own. If the mission is not completely successful, it could possibly lead to the end of the Guardians as we know them.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/r2J02Z2OpVRv2OvDVGyRwkw4nAu.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Action', 'Sci-Fi', 'Adventure', 'Superhero', 'Comedy']
//     //                 }
//     //             ]
//     //         },
//     //         {
//     //             id: 'phase-five',
//     //             name: 'Phase Five: The Multiverse Saga',
//     //             description: 'The current phase of the MCU, exploring the multiverse concept and introducing new characters like the Thunderbolts while dealing with the aftermath of Kang\'s emergence.',
//     //             logo: 'https://kimi-web-img.moonshot.cn/img/images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/9c809f1e1e4156d71b87c16408ad992e5e270e36.png',
//     //             content: [
//     //                 {
//     //                     id: 'deadpool-wolverine',
//     //                     title: 'Deadpool & Wolverine',
//     //                     year: 2024,
//     //                     rating: 7.8,
//     //                     duration: '2h 8m',
//     //                     description: 'Deadpool is offered a place in the Marvel Cinematic Universe by the Time Variance Authority, but instead recruits a Wolverine from another universe to save his universe from extinction.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Action', 'Sci-Fi', 'Adventure', 'Superhero', 'Comedy']
//     //                 },
//     //                 {
//     //                     id: 'thunderbolts',
//     //                     title: 'Thunderbolts*',
//     //                     year: 2025,
//     //                     rating: 8.8,
//     //                     duration: '2h 7m',
//     //                     description: 'Yelena Belova reunites with her surrogate father Red Guardian and teams up with the Winter Soldier, Ghost, Taskmaster, and John Walker after finding themselves trapped in a death trap set by Valentina Allegra de Fontaine.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/2Zdnm9Pm5qy2gjKJFGufn5sQ02R.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Action', 'Sci-Fi', 'Adventure', 'Superhero', 'Thriller']
//     //                 }
//     //             ]
//     //         }
//     //     ],
//     //     mainContent: [
//     //         {
//     //             id: 'avengers-endgame-main',
//     //             title: 'Avengers: Endgame',
//     //             year: 2019,
//     //             rating: 9.4,
//     //             duration: '3h 1m',
//     //             description: 'The epic conclusion to the Infinity Saga, becoming the highest-grossing film of all time and providing a satisfying end to the stories of Iron Man and Captain America.',
//     //             poster: 'https://image.tmdb.org/t/p/original/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
//     //             type: 'movie',
//     //             genre: ['Action', 'Sci-Fi', 'Adventure', 'Superhero']
//     //         },
//     //         {
//     //             id: 'black-panther-main',
//     //             title: 'Black Panther',
//     //             year: 2018,
//     //             rating: 9.6,
//     //             duration: '2h 14m',
//     //             description: 'The highest-rated MCU film on Rotten Tomatoes, celebrating African culture and becoming a landmark moment for representation in superhero cinema.',
//     //             poster: 'https://kimi-web-img.moonshot.cn/img/filmartgallery.com/7aa54f78203206ab8d2f88a406e22344c505c412.jpeg',
//     //             type: 'movie',
//     //             genre: ['Action', 'Sci-Fi', 'Adventure', 'Superhero']
//     //         },
//     //         {
//     //             id: 'iron-man-main',
//     //             title: 'Iron Man',
//     //             year: 2008,
//     //             rating: 9.4,
//     //             duration: '2h 6m',
//     //             description: 'The film that started the most successful cinematic universe in history, with Robert Downey Jr.\'s iconic performance as Tony Stark.',
//     //             poster: 'https://kimi-web-img.moonshot.cn/img/image.tmdb.org/eb86257a1b1381c27be4bfd79da04b0f39e4e7fd.jpg',
//     //             type: 'movie',
//     //             genre: ['Action', 'Sci-Fi', 'Adventure', 'Superhero']
//     //         }
//     //     ]
//     // },

//     // barbie: {
//     //     id: 'barbie',
//     //     name: 'Barbie',
//     //     description: 'The world\'s most iconic fashion doll comes to life in animated adventures that span fairy tales, modern high school dramas, and interstellar voyages. Since 2001, Barbie has starred in over 40 animated films that emphasize empowerment, friendship, and imagination.',
//     //     backgroundImage: 'https://kimi-web-img.moonshot.cn/img/i.ebayimg.com/fc2c7a99890536ce9e4b890c8c69bab699566f77.jpg',
//     //     logo: 'https://kimi-web-img.moonshot.cn/img/supernovasites.com/b13f3803185120e84ba2d67abc43021d5b16515b.png',
//     //     totalContent: 44,
//     //     subFranchises: [
//     //         {
//     //             id: 'classic-fairy-tales',
//     //             name: 'Classic Fairy Tales',
//     //             description: 'Early Barbie films adapted classic literature and fairy tales, featuring Barbie as characters in The Nutcracker, Rapunzel, and Swan Lake. These films established the template for Barbie movies with their emphasis on music, magic, and moral lessons.',
//     //             logo: 'https://kimi-web-img.moonshot.cn/img/supernovasites.com/b13f3803185120e84ba2d67abc43021d5b16515b.png',
//     //             content: [
//     //                 {
//     //                     id: 'barbie-nutcracker',
//     //                     title: 'Barbie in the Nutcracker',
//     //                     year: 2001,
//     //                     rating: 6.8,
//     //                     duration: '1h 18m',
//     //                     description: 'Barbie stars as Clara, a young girl who receives a wooden nutcracker as a Christmas gift. That night, the toy comes alive to protect her from the evil Mouse King, leading to a magical adventure in the world of the Sugarplum Princess.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/something.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Animation', 'Family', 'Fantasy', 'Musical']
//     //                 },
//     //                 {
//     //                     id: 'barbie-rapunzel',
//     //                     title: 'Barbie as Rapunzel',
//     //                     year: 2002,
//     //                     rating: 6.7,
//     //                     duration: '1h 24m',
//     //                     description: 'Long, long ago, in a time of magic and dragons, there lived a girl named Rapunzel who had the most beautiful radiant hair the world had ever seen. But Rapunzel\'s life was far from wonderful, trapped in a tower by an evil witch.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/something.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Animation', 'Family', 'Fantasy']
//     //                 },
//     //                 {
//     //                     id: 'barbie-princess-pauper',
//     //                     title: 'Barbie as The Princess and the Pauper',
//     //                     year: 2004,
//     //                     rating: 7.0,
//     //                     duration: '1h 25m',
//     //                     description: 'In her first musical, Barbie stars in the dual role of Princess Anneliese and the humble seamstress Erika. The two switch places to save the kingdom from an evil schemer, discovering that friendship is the true treasure.',
//     //                     poster: 'https://kimi-web-img.moonshot.cn/img/media-cache.cinematerial.com/5560e069304913e310aa2224e8807fd39e99c82a.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Animation', 'Family', 'Musical', 'Comedy']
//     //                 },
//     //                 {
//     //                     id: 'barbie-swan-lake',
//     //                     title: 'Barbie of Swan Lake',
//     //                     year: 2003,
//     //                     rating: 6.5,
//     //                     duration: '1h 21m',
//     //                     description: 'Barbie comes to life in her third animated movie, based on the beloved ballet. She stars as Odette, a young baker\'s daughter who follows a unicorn into an enchanted forest and is transformed into a swan by an evil wizard.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/something.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Animation', 'Family', 'Fantasy', 'Musical']
//     //                 }
//     //             ]
//     //         },
//     //         {
//     //             id: 'fairytopia-collection',
//     //             name: 'Fairytopia Collection',
//     //             description: 'An original fantasy universe where Barbie plays Elina, a wingless fairy who saves the magical realm of Fairytopia from various threats. This was the first original Barbie franchise with multiple interconnected stories.',
//     //             logo: 'https://kimi-web-img.moonshot.cn/img/supernovasites.com/b13f3803185120e84ba2d67abc43021d5b16515b.png',
//     //             content: [
//     //                 {
//     //                     id: 'barbie-fairytopia',
//     //                     title: 'Barbie: Fairytopia',
//     //                     year: 2005,
//     //                     rating: 6.2,
//     //                     duration: '1h 10m',
//     //                     description: 'Elina is a wingless fairy who lives in the magical land of Fairytopia. When the evil Laverna poisons the guardian fairies, Elina must embark on a journey to save her home and discover that what makes you different makes you special.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/something.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Animation', 'Family', 'Fantasy', 'Adventure']
//     //                 },
//     //                 {
//     //                     id: 'barbie-mermaidia',
//     //                     title: 'Barbie Fairytopia: Mermaidia',
//     //                     year: 2006,
//     //                     rating: 6.3,
//     //                     duration: '1h 15m',
//     //                     description: 'Elina travels to Mermaidia to save her friend Nalu, the merman Prince, who has been kidnapped by Laverna\'s henchmen. To save him, she must transform into a mermaid and trust her true self.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/something.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Animation', 'Family', 'Fantasy', 'Adventure']
//     //                 },
//     //                 {
//     //                     id: 'barbie-mariposa',
//     //                     title: 'Barbie: Mariposa and Her Butterfly Fairy Friends',
//     //                     year: 2008,
//     //                     rating: 6.1,
//     //                     duration: '1h 15m',
//     //                     description: 'Mariposa is a butterfly fairy who lives in the protected realm of Flutterfield. When the evil fairy Henna poisons the queen, Mariposa must journey beyond the safety of Flutterfield to find the antidote.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/something.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Animation', 'Family', 'Fantasy', 'Adventure']
//     //                 }
//     //             ]
//     //         },
//     //         {
//     //             id: 'modern-adventures',
//     //             name: 'Modern Adventures (2010-2016)',
//     //             description: 'Barbie enters the modern era with contemporary settings including fashion industries, surfing competitions, spy missions, and video game worlds. These films introduced new animation styles and pop culture references.',
//     //             logo: 'https://kimi-web-img.moonshot.cn/img/supernovasites.com/b13f3803185120e84ba2d67abc43021d5b16515b.png',
//     //             content: [
//     //                 {
//     //                     id: 'barbie-mermaid-tale',
//     //                     title: 'Barbie in A Mermaid Tale',
//     //                     year: 2010,
//     //                     rating: 6.4,
//     //                     duration: '1h 15m',
//     //                     description: 'Merliah Summers is a champion surfer who discovers she\'s actually a mermaid princess. She travels to the underwater kingdom of Oceana to save her mother Calissa and learn that what makes you different is your greatest strength.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/something.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Animation', 'Family', 'Fantasy', 'Sports']
//     //                 },
//     //                 {
//     //                     id: 'barbie-fashion-fairytale',
//     //                     title: 'Barbie: A Fashion Fairytale',
//     //                     year: 2010,
//     //                     rating: 6.3,
//     //                     duration: '1h 19m',
//     //                     description: 'Barbie travels to Paris to visit her aunt\'s fashion house, only to find it closing. With the help of magical fairies and her friends, she works to save the business and learns that magic happens when you believe in yourself.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/something.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Animation', 'Family', 'Fantasy', 'Comedy']
//     //                 },
//     //                 {
//     //                     id: 'barbie-spy-squad',
//     //                     title: 'Barbie: Spy Squad',
//     //                     year: 2016,
//     //                     rating: 5.8,
//     //                     duration: '1h 15m',
//     //                     description: 'Barbie and her best friends Teresa and Renee are gymasts who get recruited by a secret intelligence agency. Using their athletic skills, they must stop a cat burglar in this action-packed adventure.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/something.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Animation', 'Family', 'Action', 'Adventure']
//     //                 }
//     //             ]
//     //         },
//     //         {
//     //             id: 'dreamhouse-era',
//     //             name: 'Dreamhouse Era (2017-Present)',
//     //             description: 'The Netflix era of Barbie movies, featuring contemporary settings tied to the Barbie: Dreamhouse Adventures series. These films emphasize friendship, career exploration, and family bonds in Malibu and beyond.',
//     //             logo: 'https://kimi-web-img.moonshot.cn/img/supernovasites.com/b13f3803185120e84ba2d67abc43021d5b16515b.png',
//     //             content: [
//     //                 {
//     //                     id: 'barbie-dolphin-magic',
//     //                     title: 'Barbie: Dolphin Magic',
//     //                     year: 2017,
//     //                     rating: 5.6,
//     //                     duration: '1h 3m',
//     //                     description: 'Barbie and her sisters visit Ken at his marine biology internship. They befriend a mermaid named Isla and work together to save the local dolphins from a greedy research facility.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/something.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Animation', 'Family', 'Adventure']
//     //                 },
//     //                 {
//     //                     id: 'barbie-big-city',
//     //                     title: 'Barbie: Big City, Big Dreams',
//     //                     year: 2021,
//     //                     rating: 6.5,
//     //                     duration: '1h 4m',
//     //                     description: 'Barbie Roberts from Malibu meets Barbie Roberts from Brooklyn at a performing arts school in New York. The two become fast friends and compete for the spotlight while learning that collaboration is better than competition.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/something.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Animation', 'Family', 'Musical', 'Drama']
//     //                 },
//     //                 {
//     //                     id: 'barbie-skipper-babysitting',
//     //                     title: 'Barbie: Skipper and the Big Babysitting Adventure',
//     //                     year: 2023,
//     //                     rating: 6.2,
//     //                     duration: '1h',
//     //                     description: 'Skipper takes a summer job at a water park but her babysitting business hits a snag. She uses her babysitting skills to save a nearly-collapsed birthday party and starts a babysitting squad with new friends.',
//     //                     poster: 'https://image.tmdb.org/t/p/original/something.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Animation', 'Family', 'Comedy']
//     //                 }
//     //             ]
//     //         },
//     //         {
//     //             id: 'live-action',
//     //             name: 'Live Action Collection',
//     //             description: 'The definitive live-action Barbie movie directed by Greta Gerwig, offering a meta-commentary on the Barbie legacy while celebrating the iconic doll\'s cultural impact.',
//     //             logo: 'https://kimi-web-img.moonshot.cn/img/supernovasites.com/b13f3803185120e84ba2d67abc43021d5b16515b.png',
//     //             content: [
//     //                 {
//     //                     id: 'barbie-2023',
//     //                     title: 'Barbie',
//     //                     year: 2023,
//     //                     rating: 7.0,
//     //                     duration: '1h 54m',
//     //                     description: 'Barbie and Ken are having the time of their lives in the colorful and seemingly perfect world of Barbie Land. However, when they get a chance to go to the real world, they soon discover the joys and perils of living among humans.',
//     //                     poster: 'https://kimi-web-img.moonshot.cn/img/i.ebayimg.com/fc2c7a99890536ce9e4b890c8c69bab699566f77.jpg',
//     //                     type: 'movie',
//     //                     genre: ['Comedy', 'Adventure', 'Fantasy']
//     //                 }
//     //             ]
//     //         }
//     //     ],
//     //     mainContent: [
//     //         {
//     //             id: 'barbie-2023-main',
//     //             title: 'Barbie (2023)',
//     //             year: 2023,
//     //             rating: 7.0,
//     //             duration: '1h 54m',
//     //             description: 'The billion-dollar live-action phenomenon starring Margot Robbie and Ryan Gosling, directed by Greta Gerwig. A cultural milestone that brought Barbie back to mainstream relevance with its satirical take on perfection.',
//     //             poster: 'https://kimi-web-img.moonshot.cn/img/i.ebayimg.com/fc2c7a99890536ce9e4b890c8c69bab699566f77.jpg',
//     //             type: 'movie',
//     //             genre: ['Comedy', 'Adventure', 'Fantasy']
//     //         },
//     //         {
//     //             id: 'barbie-princess-pauper-main',
//     //             title: 'Barbie as The Princess and the Pauper',
//     //             year: 2004,
//     //             rating: 7.0,
//     //             duration: '1h 25m',
//     //             description: 'Widely considered the best of the animated Barbie films, featuring a classic Mark Twain story with original songs and dual roles for Barbie. A fan favorite that defines the golden age of Barbie animation.',
//     //             poster: 'https://kimi-web-img.moonshot.cn/img/media-cache.cinematerial.com/5560e069304913e310aa2224e8807fd39e99c82a.jpg',
//     //             type: 'movie',
//     //             genre: ['Animation', 'Family', 'Musical']
//     //         }
//     //     ]
//     // }
//     'mahouka': {
//         id: 'Mahouka',
//         name: 'Mahouka Kokkou no Rettusei',
//         description: 'The World of Magic in the Mahouka Universe explore all the intrigues and follow Tatsuya and Miyuki around the School and theyre personal Life.',
//         backgroundImage: 'https://static.animecorner.me/2020/09/lasto-e1599669219322.jpg',
//         logo: 'https://ih1.redbubble.net/image.1901501011.2665/st,small,507x507-pad,600x600,f8f8f8.jpg',
//         mainContent: [

//         ],
//         subFranchises: [
//             {
//                 id: 'Main Series',
//                 name: 'Main Series',
//                 description: 'The main series of Mahouka Kokkou no Rettusei, featuring the adventures of Tatsuya and Miyuki.',
//                 logo: 'https://ih1.redbubble.net/image.1901501011.2665/st,small,507x507-pad,600x600,f8f8f8.jpg',
//                 content: [
//                     {
//                         type: 'movie',
//                         id: 'MO-57987539',
//                         // title: 'The Irregular at Magic High School: Reminiscence Arc',
//                         year: 2021,
//                         // rating: 9.9,
//                         // duration: '1h 11m',
//                         description: 'Looking at Miyuki and Tatsuya now, it might be hard to imagine them as anything other than loving siblings. But it wasn\'t always this way - Three years ago, Miyuki was always uncomfortable around her older brother. The rest of their family treated him no better than a lowly servant, even though he was the perfect Guardian, watching over Miyuki while she lived a normal middle school life. But what really bothered her was that he never showed any emotions or thoughts of his own. However, when danger comes calling during a fateful trip to Okinawa, their relationship as brother and sister will change forever.',
//                         poster: 'https://m.media-amazon.com/images/M/MV5BYjY3MmM5NzYtMmEyMS00ODk0LWIxNmUtYmY3NzMwMmQzNjI1XkEyXkFqcGc@._V1_QL75_UX190_CR0,2,190,281_.jpg',
//                         // genre: ['Action', 'Sci-Fi', 'Adventure', 'Superhero'],
//                     },
//                     //@ts-ignore
//                     {
//                         type: 'series',
//                         id: 'S-b868dbeb'
//                     },
//                     //@ts-ignore
//                     {
//                         type: 'series',
//                         id: 'S-0f8c129f'
//                     },
//                     {
//                         type: 'movie',
//                         id: 'MO-95c16179',
//                         // title: 'The Irregular at Magic High School: The Girl Who Calls the Stars',
//                         year: 2017,
//                         // rating: 9.7,
//                         // duration: '1h 30m',
//                         description: 'In the story, the seasons have changed and it will soon be the second spring. Tatsuya and Miyuki have finished their first year at First Magic High School and are on their spring break. The two go to their villa on the Ogasawara Island archipelago. After only a small moment of peace a lone young woman named Kokoa appears before them. She has abandoned the Naval base and she tells Tatsuya her one wish.',
//                         poster: 'https://m.media-amazon.com/images/M/MV5BNjRlNWFjNjYtNjZiMy00MDBlLWE4YzctNzA0NDA3MDBiYTVlXkEyXkFqcGc@._V1_QL75_UX190_CR0,4,190,281_.jpg',
//                         // genre: ['Action', 'Sci-Fi', 'Adventure', 'Superhero'],
//                     }
//                 ]
//             },
//             {
//                 id: 'Specials',
//                 name: 'Specials',
//                 description: 'The specials of Mahouka Kokkou no Rettusei, featuring the adventures of Tatsuya and Miyuki.',
//                 logo: 'https://ih1.redbubble.net/image.1901501011.2665/st,small,507x507-pad,600x600,f8f8f8.jpg',
//                 content: [
//                     //@ts-ignore
//                     {
//                         type: 'series',
//                         id: 'S-ed77be6f'
//                     },
//                 ]
//             },
//         ]
//     }
// };

// };

async function augmentFranchiseData(data: FranchiseData): Promise<FranchiseDataExtended> {
    const extended = data as FranchiseDataExtended;

    const augmentFranchiseContent = async (c: FranchiseContent): Promise<FranchiseContentExtended> => {
        if (c.type === 'movie') {
            const movie = await moviesTable.getOne({ UUID: c.id });
            if (!movie) throw new Error(`Movie with UUID ${c.id} not found`);
            return {
                ...c,
                item: movie,
                watchableEntities: await watchableEntitysTable.get({ watchable_UUID: c.id })!,
            } satisfies FranchiseContentMovieExtened;
        }
        return c;
    };

    extended.mainContent = await Promise.all(data.mainContent.map(async c => {
        return await augmentFranchiseContent(c);
    }));
    extended.subFranchises = await Promise.all(data.subFranchises.map(async s => {
        return {
            ...s,
            content: await Promise.all(s.content.map(async c => {
                return await augmentFranchiseContent(c);
            })),
        } satisfies SubFranchiseExtended;
    }));

    extended.totalContent = data.mainContent.length + data.subFranchises.flatMap(s => s.content).length;

    return extended;
}

const router = new Hono()
    .get('/', authMiddleware, async (c) => {
        const franchises = await franchiseTable.get();
        const localFranchiseData = await Promise.all(franchises.map(async f => await augmentFranchiseData(f)));
        const obj = {} as Record<string, FranchiseDataExtended>;
        for (const franchise of localFranchiseData) {
            obj[franchise.id] = franchise;
        }
        return c.json(obj);
    })
    .get('/:slug', authMiddleware, async (c) => {
        const { slug } = c.req.param();
        const franchise = await franchiseTable.getOne({ id: slug.toLowerCase() });
        if (!franchise) {
            throw new HTTPException(404, {
                message: `Franchise with slug '${slug}' not found`,
            });
        }

        return c.json(await augmentFranchiseData(franchise));
    })
    .get('/query/:movieID', authMiddleware, async (c) => {
        const { movieID } = c.req.param();
        const movie = await moviesTable.getOne({ UUID: movieID });

        if (!movie) {
            throw new HTTPException(404, {
                message: `Movie with UUID '${movieID}' not found`,
            });
        }

        return c.json({
            item: movie,
            watchableEntitys: await watchableEntitysTable.get({ watchable_UUID: movieID })!,
        });
    })
    .post('/', authMiddleware, async (c) => {
        const body = await c.req.json();
        const result = FranchiseDataSchema.safeParse(body);

        if (!result.success) {
            return c.json(
                {
                    message: "Validation failed",
                    errors: z.treeifyError(result.error),
                },
                400
            );
        }

        const data = result.data;
        const key = data.id.toLowerCase();

        if (await franchiseTable.getOne({ id: key }) != undefined) {
            throw new HTTPException(409, {
                message: `Franchise with id '${data.id}' already exists`,
            });
        }
        await franchiseTable.create(data);
        return c.json(data, 201);
    })
    .put('/:id', authMiddleware, async (c) => {
        const { id } = c.req.param();
        const key = id.toLowerCase();

        if (franchiseTable.getOne({ id: key }) == undefined) {
            throw new HTTPException(404, {
                message: `Franchise with id '${id}' not found`,
            });
        }

        const body = await c.req.json();
        const result = FranchiseDataSchema.safeParse(body);

        if (!result.success) {
            return c.json(
                {
                    message: "Validation failed",
                    errors: z.treeifyError(result.error),
                },
                400
            );
        }

        const data = result.data;
        const newKey = data.id.toLowerCase();
        await franchiseTable.update({ id: key }, data);
        return c.json(data);
    })
    .delete('/:id', authMiddleware, async (c) => {
        const { id } = c.req.param();
        const key = id.toLowerCase();

        if (franchiseTable.getOne({ id: key }) == undefined) {
            throw new HTTPException(404, {
                message: `Franchise with id '${id}' not found`,
            });
        }

        await franchiseTable.delete({ id: key });
        return c.body(null, 204);
    });

export { router as franchiseRouter };