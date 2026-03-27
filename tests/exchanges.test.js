const prisma = require('../lib/prisma');
const { authAgent } = require('./helpers');

jest.mock('../lib/prisma');
jest.mock('bcrypt');

describe('POST /exchange', () => {

    it('retourne une erreur si les données sont manquantes', async () => {
        const agent = await authAgent();
        const res = await agent.post('/exchange').type('form').send({});
        expect(res.text).toContain('manquantes');
    });

    it("retourne une erreur si l'échange est avec soi-même", async () => {
        const agent = await authAgent();
        const res = await agent.post('/exchange').type('form').send({ giverId: '1', skillId: '1' });
        expect(res.text).toContain('vous-même');
    });

    it('retourne une erreur si les crédits sont insuffisants', async () => {
        const agent = await authAgent();
        prisma.credits.findUnique.mockResolvedValue({ balance: 0 });

        const res = await agent.post('/exchange').type('form').send({ giverId: '2', skillId: '1' });
        expect(res.text).toContain('insuffisants');
    });

    it('crée la demande et redirige si les crédits sont suffisants', async () => {
        const agent = await authAgent();
        prisma.credits.findUnique.mockResolvedValue({ balance: 3 });
        prisma.exchange.create.mockResolvedValue({ id: 10 });

        const res = await agent.post('/exchange').type('form').send({ giverId: '2', skillId: '1' });
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/users');
        expect(prisma.exchange.create).toHaveBeenCalledWith({
            data: { giverId: 2, receiverId: 1, skillId: 1, credits: 1, status: 'pending' }
        });
    });
});

describe('POST /exchange/accept', () => {

    it('retourne une erreur si la demande est invalide', async () => {
        const agent = await authAgent();
        prisma.exchange.findFirst.mockResolvedValue(null);

        const res = await agent.post('/exchange/accept').type('form').send({ exchangeId: '999' });
        expect(res.text).toContain('invalide');
    });

    it('retourne une erreur si les crédits du receiver sont insuffisants', async () => {
        const agent = await authAgent();
        prisma.exchange.findFirst.mockResolvedValue({ id: 10, receiverId: 2, giverId: 1, credits: 1 });
        prisma.credits.findUnique.mockResolvedValue({ balance: 0 });

        const res = await agent.post('/exchange/accept').type('form').send({ exchangeId: '10' });
        expect(res.text).toContain('insuffisants');
    });

    it('exécute la transaction et redirige vers /requests', async () => {
        const agent = await authAgent();
        prisma.exchange.findFirst.mockResolvedValue({ id: 10, receiverId: 2, giverId: 3, credits: 1 });
        prisma.credits.findUnique.mockResolvedValue({ balance: 5 });
        prisma.$transaction.mockResolvedValue([]);

        const res = await agent.post('/exchange/accept').type('form').send({ exchangeId: '10' });
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/requests');
        expect(prisma.$transaction).toHaveBeenCalled();
    });
});

describe('POST /exchange/reject', () => {

    it('met à jour le statut à rejected et redirige', async () => {
        const agent = await authAgent();
        prisma.exchange.update.mockResolvedValue({ id: 10, status: 'rejected' });

        const res = await agent.post('/exchange/reject').type('form').send({ exchangeId: '10' });
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/requests');
        expect(prisma.exchange.update).toHaveBeenCalledWith({
            where: { id: 10 },
            data: { status: 'rejected' }
        });
    });
});
