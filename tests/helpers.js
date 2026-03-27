const request = require('supertest');
const app = require('../app');
const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');

async function authAgent() {
    const agent = request.agent(app);
    prisma.user.findUnique.mockResolvedValue({ id: 1, email: 't@t.com', passwordHash: 'h' });
    bcrypt.compare.mockResolvedValue(true);
    await agent.post('/login').type('form').send({ email: 't@t.com', password: 'pass' });
    return agent;
}

module.exports = { authAgent };
