const prisma = {
    user:      { create: jest.fn(), findUnique: jest.fn() },
    credits:   { findUnique: jest.fn(), update: jest.fn() },
    skill:     { upsert: jest.fn() },
    userSkill: { create: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
    exchange:  { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(),
};

module.exports = prisma;
