import { createClient } from 'valkey'; // Or 'redis' depending on your package npm

const valkey = createClient({
  url: process.env.VALKEY_URL // Your Aiven/RedisCloud connection string
});

valkey.on('error', (err) => console.error('Valkey Client Error', err));

// Connect ONCE when the app starts
await valkey.connect(); 

export default valkey;