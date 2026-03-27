const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/exchange', authMiddleware, async (req, res) => {
    const receiverId = req.session.userId;
    const { giverId, skillId } = req.body;

    if (!giverId || !skillId) {
        return res.send('Données manquantes');
    }

    if (parseInt(giverId) === receiverId) {
        return res.send('Vous ne pouvez pas échanger avec vous-même');
    }

    try {
        const creditRow = await prisma.credits.findUnique({
            where: { userId: receiverId }
        });

        if (!creditRow) return res.send('Crédits introuvables');
        if (creditRow.balance < 1) return res.send('Crédits insuffisants pour effectuer un échange');

        await prisma.exchange.create({
            data: {
                giverId: parseInt(giverId),
                receiverId,
                skillId: parseInt(skillId),
                credits: 1,
                status: 'pending'
            }
        });

        res.redirect('/profile');
    } catch (err) {
        res.send('Erreur création demande');
    }
});

router.get('/requests', authMiddleware, async (req, res) => {
    const userId = req.session.userId;

    try {
        const exchanges = await prisma.exchange.findMany({
            where: { giverId: userId, status: 'pending' },
            include: {
                receiver: { select: { username: true } },
                skill: true
            }
        });

        const rows = exchanges.map(e => ({
            id: e.id,
            credits: e.credits,
            username: e.receiver.username,
            skill_name: e.skill.name
        }));

        res.render('requests', { rows });
    } catch (err) {
        res.send('Erreur chargement demandes');
    }
});

router.post('/exchange/accept', authMiddleware, async (req, res) => {
    const { exchangeId } = req.body;

    try {
        const exchange = await prisma.exchange.findFirst({
            where: { id: parseInt(exchangeId), status: 'pending' }
        });

        if (!exchange) return res.send('Demande invalide');

        const creditRow = await prisma.credits.findUnique({
            where: { userId: exchange.receiverId }
        });

        if (!creditRow || creditRow.balance < exchange.credits) {
            return res.send('Crédits insuffisants');
        }

        await prisma.$transaction([
            prisma.credits.update({
                where: { userId: exchange.receiverId },
                data: { balance: { decrement: exchange.credits } }
            }),
            prisma.credits.update({
                where: { userId: exchange.giverId },
                data: { balance: { increment: exchange.credits } }
            }),
            prisma.exchange.update({
                where: { id: exchange.id },
                data: { status: 'accepted' }
            })
        ]);

        res.redirect('/requests');
    } catch (err) {
        res.send('Erreur acceptation demande');
    }
});

router.post('/exchange/reject', authMiddleware, async (req, res) => {
    const { exchangeId } = req.body;

    try {
        await prisma.exchange.update({
            where: { id: parseInt(exchangeId) },
            data: { status: 'rejected' }
        });

        res.redirect('/requests');
    } catch (err) {
        res.send('Erreur refus demande');
    }
});

module.exports = router;
