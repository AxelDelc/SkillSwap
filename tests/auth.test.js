const request = require('supertest');
const app = require('../app');
const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');

jest.mock('../lib/prisma');
jest.mock('bcrypt');

const post = (path, data) => request(app).post(path).type('form').send(data);

describe('POST /register', () => {

    it('redirige vers /profile après une inscription réussie', async () => {
        bcrypt.hash.mockResolvedValue('hashed_pw');
        prisma.user.create.mockResolvedValue({ id: 1, username: 'alice', email: 'alice@test.com' });

        const res = await post('/register', { username: 'alice', email: 'alice@test.com', password: 'secret' });
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/profile');
    });

    it('retourne une erreur si des champs sont manquants', async () => {
        const res = await post('/register', { username: 'alice' });
        expect(res.status).toBe(200);
        expect(res.text).toContain('Champs manquants');
        expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("retourne une erreur si l'utilisateur existe déjà", async () => {
        bcrypt.hash.mockResolvedValue('hashed_pw');
        prisma.user.create.mockRejectedValue(new Error('Unique constraint'));

        const res = await post('/register', { username: 'alice', email: 'alice@test.com', password: 'secret' });
        expect(res.text).toContain('déjà existant');
    });
});

describe('POST /login', () => {

    it('redirige vers / après une connexion réussie', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'alice@test.com', passwordHash: 'hashed' });
        bcrypt.compare.mockResolvedValue(true);

        const res = await post('/login', { email: 'alice@test.com', password: 'secret' });
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/');
    });

    it('retourne une erreur si le mot de passe est incorrect', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'alice@test.com', passwordHash: 'hashed' });
        bcrypt.compare.mockResolvedValue(false);

        const res = await post('/login', { email: 'alice@test.com', password: 'wrong' });
        expect(res.text).toContain('incorrect');
    });

    it("retourne une erreur si l'utilisateur n'existe pas", async () => {
        prisma.user.findUnique.mockResolvedValue(null);

        const res = await post('/login', { email: 'nobody@test.com', password: 'secret' });
        expect(res.text).toContain('non trouvé');
    });

    it('retourne une erreur si des champs sont manquants', async () => {
        const res = await post('/login', { email: 'alice@test.com' });
        expect(res.text).toContain('Champs manquants');
    });
});

describe('GET /logout', () => {

    it('redirige vers /login', async () => {
        const res = await request(app).get('/logout');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/login');
    });
});
