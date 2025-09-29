import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initIO } from './src/lib/socketio';
import { initializeJobSystem } from './src/lib/queue/init';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url!, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('Internal server error');
        }
    });

    initIO(server);

    // Initialize AI Job Processing System
    try {
        initializeJobSystem();
        console.log('✅ AI Job Processing System ready');
    } catch (error) {
        console.error('❌ Failed to initialize AI Job Processing System:', error);
    }

    server.listen(port, () => {
        console.log(
            `> Server listening at http://${hostname}:${port} as ${dev ? 'development' : process.env.NODE_ENV
            }`
        );
    });
});