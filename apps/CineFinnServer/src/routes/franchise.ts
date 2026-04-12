import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";

const router = new Hono()
    .get('/', authMiddleware, async (c) => {
        return c.json([
            {
                slug: 'star-wars',
                name: 'Star Wars',
                description: 'A long time ago in a galaxy far, far away... Experience the epic space saga that changed cinema forever.',
                backgroundImage: 'https://cinema.jodu555.de/test/star-wars-space-battle-scene-with-starships.jpg',
                logo: 'https://cinema.jodu555.de/test/star-wars-logo.jpg',
            }
        ]);
    });

export { router as franchiseRouter };