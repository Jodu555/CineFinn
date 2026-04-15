import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";
import { HTTPException } from "hono/http-exception";

interface Content {
    id: string;
    title: string;
    year: number;
    rating: number;
    duration: string;
    description: string;
    poster: string;
    type: 'movie' | 'series';
    genre: string[];
}

interface SubFranchise {
    id: string;
    name: string;
    description: string;
    logo: string;
    content: Content[];
}

interface FranchiseData {
    id: string;
    name: string;
    description: string;
    backgroundImage: string;
    logo: string;
    totalContent: number;
    subFranchises: SubFranchise[];
    mainContent: Content[];
}

// Data remains the same as your original
const franchiseData: Record<string, FranchiseData> = {
    'star-wars': {
        id: 'star-wars',
        name: 'Star Wars',
        description: 'A long time ago in a galaxy far, far away... Experience the epic space saga that changed cinema and timelines forever.',
        backgroundImage: 'https://cinema.jodu555.de/test/star-wars-space-battle-scene-with-starships.jpg',
        logo: 'https://cinema.jodu555.de/test/star-wars-logo.jpg',
        totalContent: 12,
        subFranchises: [
            {
                id: 'original-trilogy',
                name: 'Original Trilogy',
                description: 'The classic trilogy that started it all',
                logo: 'https://cinema.jodu555.de/test/star-wars-original-trilogy-logo.jpg',
                content: [
                    {
                        id: 'sw-4',
                        title: 'A New Hope',
                        year: 1977,
                        rating: 8.6,
                        duration: '2h 1m',
                        description: 'Luke Skywalker joins forces with a Jedi Knight, a cocky pilot, a Wookiee and two droids to save the galaxy.',
                        poster: 'https://cinema.jodu555.de/test/placeholder.svg?height=346&width=230&query=Star Wars A New Hope movie poster',
                        type: 'movie',
                        genre: ['Sci-Fi', 'Adventure'],
                    },
                    {
                        id: 'sw-5',
                        title: 'The Empire Strikes Back',
                        year: 1980,
                        rating: 8.7,
                        duration: '2h 4m',
                        description: 'The Empire strikes back against the Rebel Alliance.',
                        poster: 'https://cinema.jodu555.de/test/star-wars-empire-strikes-back-movie-poster.jpg',
                        type: 'movie',
                        genre: ['Sci-Fi', 'Adventure'],
                    },
                ],
            },
            {
                id: 'prequel-trilogy',
                name: 'Prequel Trilogy',
                description: "The story of Anakin Skywalker's fall to the dark side",
                logo: 'https://cinema.jodu555.de/test/star-wars-prequel-trilogy-logo.jpg',
                content: [
                    {
                        id: 'sw-1',
                        title: 'The Phantom Menace',
                        year: 1999,
                        rating: 6.5,
                        duration: '2h 16m',
                        description: 'Young Anakin Skywalker is discovered and begins his journey.',
                        poster: 'https://cinema.jodu555.de/test/placeholder.svg?height=346&width=230&query=Star Wars Phantom Menace movie poster',
                        type: 'movie',
                        genre: ['Sci-Fi', 'Adventure'],
                    },
                ],
            },
        ],
        mainContent: [
            {
                id: 'mandalorian',
                title: 'The Mandalorian',
                year: 2019,
                rating: 8.8,
                duration: '3 Seasons',
                description: 'A lone bounty hunter in the outer reaches of the galaxy.',
                poster: 'https://cinema.jodu555.de/test/the-mandalorian-poster.png',
                type: 'series',
                genre: ['Sci-Fi', 'Western'],
            },
        ],
    },
    // 'star-wars': {
    //     id: 'star-wars',
    //     name: 'Star Wars',
    //     description: 'A long time ago in a galaxy far, far away... Experience the epic space saga that changed cinema and timelines forever.',
    //     backgroundImage: 'https://cinema.jodu555.de/test/star-wars-space-battle-scene-with-starships.jpg',
    //     logo: 'https://cinema.jodu555.de/test/star-wars-logo.jpg',
    //     totalContent: 12,
    //     subFranchises: [
    //         {
    //             id: 'original-trilogy',
    //             name: 'Original Trilogy',
    //             description: 'The classic trilogy that started it all',
    //             logo: 'https://cinema.jodu555.de/test/star-wars-original-trilogy-logo.jpg',
    //             content: [
    //                 {
    //                     id: 'sw-4',
    //                     title: 'A New Hope',
    //                     year: 1977,
    //                     rating: 8.6,
    //                     duration: '2h 1m',
    //                     description: 'Luke Skywalker joins forces with a Jedi Knight, a cocky pilot, a Wookiee and two droids to save the galaxy.',
    //                     poster: 'https://cinema.jodu555.de/test/placeholder.svg?height=346&width=230&query=Star Wars A New Hope movie poster',
    //                     type: 'movie',
    //                     genre: ['Sci-Fi', 'Adventure'],
    //                 },
    //                 {
    //                     id: 'sw-5',
    //                     title: 'The Empire Strikes Back',
    //                     year: 1980,
    //                     rating: 8.7,
    //                     duration: '2h 4m',
    //                     description: 'The Empire strikes back against the Rebel Alliance.',
    //                     poster: 'https://cinema.jodu555.de/test/star-wars-empire-strikes-back-movie-poster.jpg',
    //                     type: 'movie',
    //                     genre: ['Sci-Fi', 'Adventure'],
    //                 },
    //             ],
    //         },
    //         {
    //             id: 'prequel-trilogy',
    //             name: 'Prequel Trilogy',
    //             description: "The story of Anakin Skywalker's fall to the dark side",
    //             logo: 'https://cinema.jodu555.de/test/star-wars-prequel-trilogy-logo.jpg',
    //             content: [
    //                 {
    //                     id: 'sw-1',
    //                     title: 'The Phantom Menace',
    //                     year: 1999,
    //                     rating: 6.5,
    //                     duration: '2h 16m',
    //                     description: 'Young Anakin Skywalker is discovered and begins his journey.',
    //                     poster: 'https://cinema.jodu555.de/test/placeholder.svg?height=346&width=230&query=Star Wars Phantom Menace movie poster',
    //                     type: 'movie',
    //                     genre: ['Sci-Fi', 'Adventure'],
    //                 },
    //             ],
    //         },
    //     ],
    //     mainContent: [
    //         {
    //             id: 'mandalorian',
    //             title: 'The Mandalorian',
    //             year: 2019,
    //             rating: 8.8,
    //             duration: '3 Seasons',
    //             description: 'A lone bounty hunter in the outer reaches of the galaxy.',
    //             poster: 'https://cinema.jodu555.de/test/the-mandalorian-poster.png',
    //             type: 'series',
    //             genre: ['Sci-Fi', 'Western'],
    //         },
    //     ],
    // },
    // barbie: {
    //     id: 'barbie',
    //     name: 'Barbie',
    //     description: 'Enter the pink world of Barbie with movies, specials, and animated adventures.',
    //     backgroundImage: 'https://cinema.jodu555.de/test/barbie-pink-dreamhouse-fantasy-world.jpg',
    //     logo: 'https://cinema.jodu555.de/test/barbie-logo-pink.jpg',
    //     totalContent: 8,
    //     subFranchises: [
    //         {
    //             id: 'barbie-movies',
    //             name: 'Barbie Movies',
    //             description: 'Feature-length Barbie adventures',
    //             logo: 'https://cinema.jodu555.de/test/barbie-movies-logo-pink.jpg',
    //             content: [
    //                 {
    //                     id: 'barbie-2023',
    //                     title: 'Barbie',
    //                     year: 2023,
    //                     rating: 7.0,
    //                     duration: '1h 54m',
    //                     description: 'Barbie and Ken are having the time of their lives in the colorful world of Barbie Land.',
    //                     poster: 'https://cinema.jodu555.de/test/placeholder.svg?height=346&width=230&query=Barbie 2023 movie poster pink',
    //                     type: 'movie',
    //                     genre: ['Comedy', 'Fantasy'],
    //                 },
    //             ],
    //         },
    //     ],
    //     mainContent: [
    //         {
    //             id: 'barbie-dreamhouse',
    //             title: 'Barbie: Dreamhouse Adventures',
    //             year: 2018,
    //             rating: 6.2,
    //             duration: '4 Seasons',
    //             description: 'Follow Barbie and her sisters in their Malibu adventures.',
    //             poster: 'https://cinema.jodu555.de/test/barbie-dreamhouse-adventures-series-poster.jpg',
    //             type: 'series',
    //             genre: ['Animation', 'Family'],
    //         },
    //     ],
    // },
    // mcu: {
    //     id: 'mcu',
    //     name: 'Marvel Cinematic Universe',
    //     description: 'The interconnected universe of Marvel superheroes spanning movies and series.',
    //     backgroundImage: 'https://cinema.jodu555.de/test/marvel-superheroes-action-scene.jpg',
    //     logo: 'https://cinema.jodu555.de/test/marvel-studios-logo.jpg',
    //     totalContent: 35,
    //     subFranchises: [
    //         {
    //             id: 'spider-man',
    //             name: 'Spider-Man',
    //             description: 'Your friendly neighborhood Spider-Man',
    //             logo: '/spider-man-logo-red-blue.jpg',
    //             content: [
    //                 {
    //                     id: 'spiderman-homecoming',
    //                     title: 'Spider-Man: Homecoming',
    //                     year: 2017,
    //                     rating: 7.4,
    //                     duration: '2h 13m',
    //                     description: 'Peter Parker balances his life as Spider-Man with his high school life.',
    //                     poster: '/placeholder.svg?height=346&width=230&query=Spider-Man Homecoming movie poster',
    //                     type: 'movie',
    //                     genre: ['Action', 'Adventure'],
    //                 },
    //                 {
    //                     id: 'spiderman-ffh',
    //                     title: 'Spider-Man: Far From Home',
    //                     year: 2019,
    //                     rating: 7.4,
    //                     duration: '2h 9m',
    //                     description: 'Spider-Man swings into action in Europe.',
    //                     poster: '/images/spiderman.png',
    //                     type: 'movie',
    //                     genre: ['Action', 'Adventure'],
    //                 },
    //             ],
    //         },
    //         {
    //             id: 'avengers',
    //             name: 'Avengers',
    //             description: "Earth's Mightiest Heroes",
    //             logo: '/avengers-logo-marvel.jpg',
    //             content: [
    //                 {
    //                     id: 'avengers-1',
    //                     title: 'The Avengers',
    //                     year: 2012,
    //                     rating: 8.0,
    //                     duration: '2h 23m',
    //                     description: "Earth's mightiest heroes must come together to stop an alien invasion.",
    //                     poster: '/placeholder.svg?height=346&width=230&query=The Avengers 2012 movie poster',
    //                     type: 'movie',
    //                     genre: ['Action', 'Sci-Fi'],
    //                 },
    //                 {
    //                     id: 'avengers-endgame',
    //                     title: 'Avengers: Endgame',
    //                     year: 2019,
    //                     rating: 8.4,
    //                     duration: '3h 1m',
    //                     description: "The Avengers assemble once more to reverse Thanos' actions.",
    //                     poster: '/avengers-endgame-inspired-poster.png',
    //                     type: 'movie',
    //                     genre: ['Action', 'Drama'],
    //                 },
    //             ],
    //         },
    //     ],
    //     mainContent: [
    //         {
    //             id: 'iron-man',
    //             title: 'Iron Man',
    //             year: 2008,
    //             rating: 7.9,
    //             duration: '2h 6m',
    //             description: 'Tony Stark becomes the armored superhero Iron Man.',
    //             poster: '/iron-man-2008-movie-poster-red-gold.jpg',
    //             type: 'movie',
    //             genre: ['Action', 'Sci-Fi'],
    //         },
    //         {
    //             id: 'loki',
    //             title: 'Loki',
    //             year: 2021,
    //             rating: 8.2,
    //             duration: '2 Seasons',
    //             description: "The God of Mischief steps out of his brother's shadow.",
    //             poster: '/loki-tv-series-poster-green-gold.jpg',
    //             type: 'series',
    //             genre: ['Action', 'Fantasy'],
    //         },
    //     ],
    // },
};

const router = new Hono()
    .get('/', authMiddleware, async (c) => {
        return c.json(franchiseData);
    })
    .get('/:slug', authMiddleware, async (c) => {
        const { slug } = c.req.param();
        const franchise = franchiseData[slug];

        if (!franchise) {
            throw new HTTPException(404, {
                message: `Franchise with slug '${slug}' not found`,
            });
        }

        return c.json(franchise);
    });

export { router as franchiseRouter };