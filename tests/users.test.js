const request = require('supertest');
const app = require('../app');
const prisma = require('../lib/prisma');
const { authAgent } = require('./helpers');

jest.mock('../lib/prisma');
jest.mock('bcrypt');

describe('GET /profile', () => {

    it('redirige vers /login si non connecté', async () => {
        const res = await request(app).get('/profile');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/login');
    });

    it('retourne la page de profil si connecté', async () => {
        const agent = await authAgent();
        prisma.user.findUnique.mockResolvedValue({
            id: 1, username: 'alice', email: 't@t.com',
            credits: { balance: 3 },
            userSkills: [],
        });
        prisma.exchange.count.mockResolvedValue(2);

        const res = await agent.get('/profile');
        expect(res.status).toBe(200);
        expect(res.text).toContain('alice');
    });
});

describe('POST /add-skill', () => {

    it('redirige vers /login si non connecté', async () => {
        const res = await request(app).post('/add-skill').type('form').send({ skillName: 'JS', type: 'offer' });
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/login');
    });

    it('ajoute une compétence et redirige vers /profile', async () => {
        const agent = await authAgent();
        prisma.skill.upsert.mockResolvedValue({ id: 1, name: 'JavaScript' });
        prisma.userSkill.create.mockResolvedValue({ id: 1 });

        const res = await agent.post('/add-skill').type('form').send({ skillName: 'JavaScript', type: 'offer' });
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/profile');
        expect(prisma.userSkill.create).toHaveBeenCalledWith({
            data: { userId: 1, skillId: 1, type: 'offer' }
        });
    });

    it('retourne une erreur si des champs sont manquants', async () => {
        const agent = await authAgent();
        const res = await agent.post('/add-skill').type('form').send({ skillName: 'JS' });
        expect(res.text).toContain('Champs manquants');
    });
});

describe('POST /remove-skill', () => {

    it('supprime une compétence et redirige vers /profile', async () => {
        const agent = await authAgent();
        prisma.userSkill.deleteMany.mockResolvedValue({ count: 1 });

        const res = await agent.post('/remove-skill').type('form').send({ skillId: '5' });
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/profile');
        expect(prisma.userSkill.deleteMany).toHaveBeenCalledWith({
            where: { userId: 1, skillId: 5 }
        });
    });
});

describe('GET /users', () => {

    it('redirige vers /login si non connecté', async () => {
        const res = await request(app).get('/users');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/login');
    });

    it('retourne la liste des compétences disponibles', async () => {
        const agent = await authAgent();
        prisma.userSkill.findMany.mockResolvedValue([
            { user: { id: 2, username: 'bob' }, skill: { id: 1, name: 'Python' } }
        ]);

        const res = await agent.get('/users');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Python');
        expect(res.text).toContain('bob');
    });
});
