const express = require('express');
const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');

const router = express.Router();

router.get('/register', (req, res) => {
    res.render('register');
});

// Créer un nouveau compte utilisateur
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.send('Champs manquants');
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                email,
                passwordHash,
                credits: {
                    create: { balance: 1 }
                }
            }
        });

        req.session.userId = user.id;
        res.redirect('/profile');
    } catch (err) {
        console.error('Erreur register:', err);
        res.send('Utilisateur déjà existant');
    }
});

router.get('/login', (req, res) => {
    res.render('login');
});

// Connecter un utilisateur existant
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.send('Champs manquants');
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.send('Utilisateur non trouvé');
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.send('Mot de passe incorrect');
        }

        req.session.userId = user.id;
        res.redirect('/');
    } catch (err) {
        res.send('Erreur connexion');
    }
});

// Déconnecter l'utilisateur et détruire la session
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

module.exports = router;
