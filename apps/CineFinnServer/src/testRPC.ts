import type { ServerAppType } from './index.js';
import { hc } from 'hono/client'

const client = hc<ServerAppType>('http://localhost:8787/', {
    init: {
        headers: {
            'auth-token': 'SECR-DEV',
        }
    }
})

const response = await client.index.$get();

const json = await response.json();

// json[0].