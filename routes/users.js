const express = require('express');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/profile', authMiddleware, async (req, res) => {
    const userId = req.session.userId;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                credits: true,
                userSkills: {
                    include: { skill: true }
                }
            }
        });

        if (!user) return res.send('Utilisateur introuvable');

        const offers = user.userSkills
            .filter(us => us.type === 'offer')
            .map(us => us.skill);

        const requests = user.userSkills
            .filter(us => us.type === 'request')
            .map(us => us.skill);

        const requestCount = await prisma.exchange.count({
            where: { giverId: userId, status: 'pending' }
        });

        res.render('profile', {
            user,
            credit: user.credits?.balance ?? 0,
            offers,
            requests,
            requestCount
        });
    } catch (err) {
        res.send('Erreur profil');
    }
});

router.post('/add-skill', authMiddleware, async (req, res) => {
    const { skillName, type } = req.body;
    const userId = req.session.userId;

    if (!skillName || !type) return res.send('Champs manquants');

    try {
        const skill = await prisma.skill.upsert({
            where: { name: skillName },
            update: {},
            create: { name: skillName }
        });

        await prisma.userSkill.create({
            data: { userId, skillId: skill.id, type }
        });

        res.redirect('/profile');
    } catch (err) {
        res.send('Erreur ajout compétence');
    }
});

router.get('/users', authMiddleware, async (req, res) => {
    try {
        const userSkills = await prisma.userSkill.findMany({
            where: {
                type: 'offer',
                userId: { not: req.session.userId }
            },
            include: {
                user: { select: { id: true, username: true } },
                skill: true
            }
        });

        const rows = userSkills.map(us => ({
            user_id: us.user.id,
            username: us.user.username,
            skill_id: us.skill.id,
            skill_name: us.skill.name
        }));

        res.render('users', { rows });
    } catch (err) {
        res.send('Erreur chargement utilisateurs');
    }
});

router.post('/remove-skill', authMiddleware, async (req, res) => {
    const { skillId } = req.body;
    const userId = req.session.userId;

    try {
        await prisma.userSkill.deleteMany({
            where: { userId, skillId: parseInt(skillId) }
        });

        res.redirect('/profile');
    } catch (err) {
        res.send('Erreur suppression compétence');
    }
});

router.get('/users/:userId', authMiddleware, async (req, res) => {
    const userId = parseInt(req.params.userId);

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                userSkills: {
                    include: { skill: true }
                }
            }
        });

        if (!user) return res.send('Utilisateur introuvable');

        const offers = user.userSkills
            .filter(us => us.type === 'offer')
            .map(us => us.skill);

        const requests = user.userSkills
            .filter(us => us.type === 'request')
            .map(us => us.skill);

        res.render('user-profile', { user, offers, requests });
    } catch (err) {
        res.send('Erreur chargement utilisateur');
    }
});

module.exports = router;
