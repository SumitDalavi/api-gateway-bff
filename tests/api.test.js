const request = require('supertest');
const { app, cache, userBreaker, orderBreaker, adBreaker } = require('../index');

describe('API Gateway BFF', () => {
    let token;

    beforeAll(async () => {
        const res = await request(app).post('/auth/login').send({ userId: 'u1' });
        token = res.body.token;
    });

    beforeEach(() => {
        cache.clear();
        userBreaker.state = 'CLOSED';
        userBreaker.failures = 0;
        orderBreaker.state = 'CLOSED';
        orderBreaker.failures = 0;
        adBreaker.state = 'CLOSED';
        adBreaker.failures = 0;
    });

    it('should reject unauthenticated requests', async () => {
        const res = await request(app).get('/dashboard');
        expect(res.statusCode).toBe(401);
    });

    it('should aggregate data successfully and fallback ads', async () => {
        const res = await request(app)
            .get('/dashboard')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.source).toBe('live');
        expect(res.body.user.name).toBe('Alice');
        expect(res.body.orders.length).toBe(2);
        // Ads should fail-open and return fallback
        expect(res.body.ads[0].id).toBe('fallback');
    });

    it('should cache successful responses', async () => {
        await request(app).get('/dashboard').set('Authorization', `Bearer ${token}`);
        
        // Second request should hit cache
        const res = await request(app).get('/dashboard').set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.source).toBe('cache');
    });

    it('should fail entirely if critical user service fails', async () => {
        const token2Res = await request(app).post('/auth/login').send({ userId: 'fail-user' });
        const token2 = token2Res.body.token;

        const res = await request(app)
            .get('/dashboard')
            .set('Authorization', `Bearer ${token2}`);

        expect(res.statusCode).toBe(503);
        expect(res.body.error).toBe('Critical service unavailable');
    });

    it('should fail-open and return empty orders if order service fails', async () => {
        const token3Res = await request(app).post('/auth/login').send({ userId: 'fail-order' });
        const token3 = token3Res.body.token;

        const res = await request(app)
            .get('/dashboard')
            .set('Authorization', `Bearer ${token3}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.user.name).toBe('Alice');
        // Fail-open means orders is an empty array instead of crashing
        expect(res.body.orders).toEqual([]); 
    });

    it('should open circuit breaker after threshold failures', async () => {
        // Ads fail threshold is 2
        await request(app).get('/dashboard').set('Authorization', `Bearer ${token}`);
        cache.clear(); // Clear cache so the next request actually hits the breaker
        await request(app).get('/dashboard').set('Authorization', `Bearer ${token}`);
        
        // By now adBreaker should have failed 2 times, meaning it is OPEN
        const healthRes = await request(app).get('/health');
        expect(healthRes.body.adCircuit).toBe('OPEN');
    });
});
