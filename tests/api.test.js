const request = require('supertest');
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const Redis = require('ioredis-mock');
const mockRedis = new Redis();

// We need to inject the mock redis into the app before requiring it if it's instantiated globally
jest.mock('ioredis', () => require('ioredis-mock'));

const app = require('../index');

describe('API Gateway BFF', () => {
    let mockAxios;

    beforeAll(() => {
        mockAxios = new MockAdapter(axios);
    });

    afterEach(async () => {
        mockAxios.reset();
        await mockRedis.flushall();
    });

    afterAll(() => {
        mockAxios.restore();
    });

    it('should fetch from microservices and return aggregated payload', async () => {
        mockAxios.onGet('http://user-service/users/123').reply(200, { id: '123', name: 'John Doe' });
        mockAxios.onGet('http://order-service/orders/123').reply(200, [{ orderId: 'abc' }]);
        mockAxios.onGet('http://ad-service/recommendations').reply(200, ['ad1', 'ad2']);

        const res = await request(app).get('/dashboard?userId=123');
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.user.name).toEqual('John Doe');
        expect(res.body.orders.length).toEqual(1);
        expect(res.body.ads.length).toEqual(2);
    });

    it('should fail-open on ad-service timeout', async () => {
        mockAxios.onGet('http://user-service/users/123').reply(200, { id: '123', name: 'John Doe' });
        mockAxios.onGet('http://order-service/orders/123').reply(200, [{ orderId: 'abc' }]);
        mockAxios.onGet('http://ad-service/recommendations').timeout();

        const res = await request(app).get('/dashboard?userId=123');
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.user.name).toEqual('John Doe');
        expect(res.body.ads).toEqual([]); // Fallback
    });
});
