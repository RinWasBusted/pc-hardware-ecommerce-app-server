import { createClient } from "redis";
import "dotenv/config";
import client from "./redis.js";

const subscriber = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});
const publisher = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});   
subscriber.on('error', (err) => console.error('Redis Subscriber Error', err));
publisher.on('error', (err) => console.error('Redis Publisher Error', err));

try {
    await subscriber.connect();
    await publisher.connect();
    console.log('Connected to Redis sub/pub successfully');
} catch (err) {
    console.error('Error connecting to Redis:', err);
}

export async function notificationEventListener(user_id: number, callback: (message: string) => void) {
    await subscriber.subscribe(`notifications:${user_id}`, callback);
}

export async function stopListening(user_id: number, callback: (message: string) => void) {
    await subscriber.unsubscribe(`notifications:${user_id}`, callback);
}


export async function markUserAsOnline(user_id: number) {
    const count = await client.get(`markAsOnline:${user_id}`);
    if(!count) await client.set(`markAsOnline:${user_id}`, 1, { EX: 60}); // Expire after 1 minute to handle unexpected disconnects
    else await client.incr(`markAsOnline:${user_id}`);
};

export async function refreshUserOnlineStatus(user_id: number) {
    const count = await client.get(`markAsOnline:${user_id}`);
    if(count) {
        await client.expire(`markAsOnline:${user_id}`, 60); // Refresh TTL to keep user online status
    }
};

export async function markUserAsOffline(user_id: number) {
    const count: number = parseInt(await client.get(`markAsOnline:${user_id}`) || '0');
    if(!count) return;
    if (count > 1) {
        await client.decr(`markAsOnline:${user_id}`);
    } else {
        await client.del(`markAsOnline:${user_id}`);
    }
};

export async function isUserOnline(user_id: number): Promise<boolean> {
    const result = await client.get(`markAsOnline:${user_id}`);
    return !!result;
}

export async function sendOnlineUserNotification(user_id: number, message: string) {
    await publisher.publish(`notifications:${user_id}`, message);
    console.log(`Published notification to user ${user_id} on channel notifications:${user_id}, message: ${message}`);
}
