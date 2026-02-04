const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/database');

const router = express.Router();

//Route formulaire d'inscription
router.get('/register', (req, res) => {
    res.render('register');
});

//Route traitement formulaire d'inscription
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.send('Champs manquants');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    db.run(
        `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
        [username, email, passwordHash],
        function (err) {
            if (err) {
                return res.send('Utilisateur déjà existant');
            }

            // Ajouter 1 crédit pour le nouvel utilisateur
            db.run(
                `INSERT INTO credits (user_id, balance) VALUES (?, ?)`,
                [this.lastID, 1],
                (err) => {
                    if (err) return res.send('Erreur crédits');

                    req.session.userId = this.lastID;
                    res.redirect('/profile');
                }
            );
        }
    );
});

//Route formulaire de connexion
router.get('/login', (req, res) => {
    res.render('login');
});

//Route traitement formulaire de connexion
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.send('Champs manquants');
    }
    db.get(
        `SELECT * FROM users WHERE email = ?`,
        [email],
        async (err, user) => {
            if (err || !user) {
                return res.send('Utilisateur non trouvé');
            }
            const valid = await bcrypt.compare(password, user.password_hash);
            if (!valid) {
                return res.send('Mot de passe incorrect');
            }
            req.session.userId = user.id;
            res.redirect('/');
        }
    );
});

//Route déconnexion
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

module.exports = router;