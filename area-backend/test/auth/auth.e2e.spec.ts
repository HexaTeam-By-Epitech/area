import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { faker } from '@faker-js/faker';

describe('Auth e2e', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/auth/register + /auth/login (success)', async () => {
        const email = faker.internet.email();
        const password = 'SuperSecret123';

        // Register
        const reg = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email, password })
            .expect(201);
        expect(reg.body.userId).toBeDefined();

        // Login
        const login = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email, password })
            .expect(201);
        expect(login.body.userId).toBeDefined();
    });

    it('/auth/register (duplicate)', async () => {
        const email = faker.internet.email();
        const password = 'SuperSecret123';

        await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email, password })
            .expect(201);

        await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email, password })
            .expect(409);
    });
});
