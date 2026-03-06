// src/server.ts
import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import {router} from './api/index.js';
import { setupSwagger } from './config/swagger.config.js';
import { connectRedis } from './utils/redis.js';
import prisma from './utils/prisma.js'
import 'dotenv/config'

const app: Application = express();

const BASE_URL = process.env.BASE_URL || 'http://localhost';
const PORT = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
  res.send('Express with TypeScript Server is running!');
});

const createServer = async () => {
    // CORS configuration
    const corsOptions = {
        origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3001'],
        credentials: true,
        optionsSuccessStatus: 200
    };
    app.use(cors(corsOptions));

    connectRedis().then(() => {
        console.log('Connected to Redis');
    }).catch((err) => {
        console.error('Failed to connect to Redis', err);
    });

    await prisma.$connect().then(() => {
        console.log('Connected to Database');
    }).catch((err) => {
        console.error('Failed to connect to PostgreSQL', err);
    });

    app.use(cookieParser());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    setupSwagger(app);

    app.use('/api', router);
    
    app.listen(PORT, () => {
        console.log(`API docs: ${BASE_URL}:${PORT}/api-docs`);
        console.log(`Server is running at ${BASE_URL}:${PORT}`);
    });
}



export default createServer