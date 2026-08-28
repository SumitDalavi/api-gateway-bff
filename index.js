const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const JWT_SECRET = 'bff-super-secret';

// --- Local Memory Cache ---
const cache = new Map();
function getCache(key) {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
        cache.delete(key);
        return null;
    }
    return item.value;
}
function setCache(key, value, ttlMs) {
    cache.set(key, { value, expiry: Date.now() + ttlMs });
}

// --- Circuit Breaker ---
class CircuitBreaker {
    constructor(action, failureThreshold = 3, resetTimeout = 5000) {
        this.action = action;
        this.failureThreshold = failureThreshold;
        this.resetTimeout = resetTimeout;
        this.failures = 0;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.nextAttempt = null;
    }

    async fire(...args) {
        if (this.state === 'OPEN') {
            if (Date.now() > this.nextAttempt) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('CircuitBreaker is OPEN');
            }
        }

        try {
            const result = await this.action(...args);
            this.failures = 0;
            this.state = 'CLOSED';
            return result;
        } catch (error) {
            this.failures++;
            if (this.failures >= this.failureThreshold) {
                this.state = 'OPEN';
                this.nextAttempt = Date.now() + this.resetTimeout;
            }
            throw error;
        }
    }
}

// --- Downstream Service Mocks (For standalone execution & tests) ---
const userService = async (userId) => {
    if (userId === 'fail-user') throw new Error('User Service Down');
    return { id: userId, name: 'Alice', email: 'alice@example.com' };
};

const orderService = async (userId) => {
    if (userId === 'fail-order') throw new Error('Order Service Down');
    return [{ id: 'o1', total: 100 }, { id: 'o2', total: 250 }];
};

const adService = async () => {
    // We simulate an ad-service that fails often to test circuit breaker
    throw new Error('Ad Service Timeout');
};

const userBreaker = new CircuitBreaker(userService, 2, 2000);
const orderBreaker = new CircuitBreaker(orderService, 2, 2000);
const adBreaker = new CircuitBreaker(adService, 2, 2000); // Fails frequently

// --- JWT Auth Middleware ---
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        res.status(403).json({ error: 'Invalid Token' });
    }
}

// Helper to get a token for testing
app.post('/auth/login', (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    const token = jwt.sign({ userId, role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

// --- BFF Aggregation Endpoint ---
app.get('/dashboard', authMiddleware, async (req, res) => {
    const userId = req.user.userId;

    // 1. Caching layer
    const cacheKey = `dashboard:${userId}`;
    const cached = getCache(cacheKey);
    if (cached) {
        return res.json({ ...cached, source: 'cache' });
    }

    // 2. Parallel fan-out orchestration with Circuit Breakers
    const [userRes, ordersRes, adsRes] = await Promise.allSettled([
        userBreaker.fire(userId),
        orderBreaker.fire(userId),
        adBreaker.fire() // Ad service is expected to fail
    ]);

    // 3. Fallback / Fail-Open Logic
    if (userRes.status === 'rejected') {
        // Critical dependency failed
        return res.status(503).json({ error: 'Critical service unavailable', detail: userRes.reason.message });
    }

    const payload = {
        user: userRes.value,
        orders: ordersRes.status === 'fulfilled' ? ordersRes.value : [], // Fail-open (empty orders if down)
        ads: adsRes.status === 'fulfilled' ? adsRes.value : [{ id: 'fallback', text: 'Check out our new items!' }] // Fallback ad
    };

    // 4. Update Cache
    setCache(cacheKey, payload, 5000); // 5 sec TTL

    res.json({ ...payload, source: 'live' });
});

app.get('/health', (req, res) => {
    res.json({
        userCircuit: userBreaker.state,
        orderCircuit: orderBreaker.state,
        adCircuit: adBreaker.state
    });
});

if (require.main === module) {
    app.listen(3000, () => console.log('BFF listening on port 3000'));
}

module.exports = { app, userBreaker, orderBreaker, adBreaker, JWT_SECRET, cache };
