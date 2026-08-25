const express = require('express');
const axios = require('axios');
const Redis = require('ioredis');
const redis = new Redis();
const app = express();

app.get('/dashboard', async (req, res) => {
    const cacheKey = `dashboard:${req.query.userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    // Parallel fan-out orchestration
    const [userRes, ordersRes, adsRes] = await Promise.allSettled([
        axios.get(`http://user-service/users/${req.query.userId}`),
        axios.get(`http://order-service/orders/${req.query.userId}`),
        axios.get(`http://ad-service/recommendations`, { timeout: 500 }) // Fault-isolated timeout
    ]);

    const payload = {
        user: userRes.status === 'fulfilled' ? userRes.value.data : null,
        orders: ordersRes.status === 'fulfilled' ? ordersRes.value.data : [],
        ads: adsRes.status === 'fulfilled' ? adsRes.value.data : [] // Fail-open
    };

    await redis.set(cacheKey, JSON.stringify(payload), 'EX', 60);
    res.json(payload);
});
if (require.main === module) {
    app.listen(3000, () => console.log('BFF listening on port 3000'));
}
module.exports = app;
