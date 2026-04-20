const express = require("express");
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Liste de toutes les conversations de l'utilisateur connecté
router.get('/messages', authMiddleware, async (req, res) => {
    const userId = req.session.userId;

    try {
        const allMessages = await prisma.message.findMany({
            where: {
                OR: [{ senderId: userId }, { receiverId: userId }]
            },
            include: {
                sender: { select: { id: true, username: true } },
                receiver: { select: { id: true, username: true } }
            },
        });

        // Dédoublonne les interlocuteurs
        const seen = new Map();
        for (const msg of allMessages) {
            const partner = msg.senderId === userId ? msg.receiver : msg.sender;
            if (!seen.has(partner.id)) seen.set(partner.id, partner);
        }
        const conversations = Array.from(seen.values());

        res.render('conversations', { conversations });
    } catch (err) {
        console.error(err);
        res.send('Erreur chargement conversations');
    }
});

// Conversation avec un utilisateur spécifique
router.get('/messages/:userId', authMiddleware, async (req, res) => {
    const senderId = req.session.userId;
    const receiverId = req.params.userId;

    try {
        const otherUser = await prisma.user.findUnique({
            where: { id: parseInt(receiverId) },
            select: { id: true, username: true }
        });

        // Marque les messages reçus comme lus
        await prisma.message.updateMany({
            where: { senderId: parseInt(receiverId), receiverId: senderId, read: false },
            data: { read: true }
        });

        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId, receiverId: parseInt(receiverId) },
                    { senderId: parseInt(receiverId), receiverId: senderId }
                ]
            },
            include: {
                receiver: { select: { username: true } }
            },
            orderBy: { sendedAt: 'asc' }
        });

        res.render('messages', { messages, otherUser });
    } catch (err) {
        console.error(err);
        res.send('Erreur chargement messages');
    }
});

// Envoyer un message
router.post('/messages/:userId/send', authMiddleware, async (req, res) => {
    const senderId = req.session.userId;
    const { receiverId, content } = req.body;

    if (!content || !receiverId) {
        return res.send('Champs manquants');
    }

    try {
        await prisma.message.create({
            data: {
                senderId,
                receiverId: parseInt(receiverId),
                content
            }
        });

        res.redirect(`/messages/${req.params.userId}`);
    } catch (err) {
        res.send('Erreur envoi message');
    }
});

module.exports = router;
