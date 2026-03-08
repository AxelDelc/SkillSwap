const express = require('express');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

//Profil utilisateur
router.get('/profile', authMiddleware, (req, res) => {
    const userId = req.session.userId;

    db.get(
        'SELECT id, username, email FROM users WHERE id = ?',
        [userId],
        (err, user) => {
            if (err || !user) return res.send('Utilisateur introuvable');

            // Récupérer crédits
            db.get(
                'SELECT balance FROM credits WHERE user_id = ?',
                [userId],
                (err, credit) => {
                    if (err) return res.send('Erreur crédits');

                    // Récupérer compétences offertes
                    db.all(
                        `SELECT skills.id, skills.name
                         FROM user_skills
                         JOIN skills ON skills.id = user_skills.skill_id
                         WHERE user_skills.user_id = ?
                         AND user_skills.type = 'offer'`,
                        [userId],
                        (err, offers) => {
                            if (err) return res.send('Erreur compétences offertes');

                            // Récupérer compétences recherchées
                            db.all(
                                `SELECT skills.id, skills.name
                                 FROM user_skills
                                 JOIN skills ON skills.id = user_skills.skill_id
                                 WHERE user_skills.user_id = ?
                                 AND user_skills.type = 'request'`,
                                [userId],
                                (err, requests) => {
                                    if (err) return res.send('Erreur compétences recherchées');

                                    // Compter les demandes en attente
                                    db.get(
                                        `SELECT COUNT(*) AS requestCount
                                         FROM exchanges
                                         WHERE giver_id = ?
                                         AND status = 'pending'`,
                                        [userId],
                                        (err, result) => {
                                            if (err) return res.send('Erreur notifications');

                                            res.render('profile', {
                                                user,
                                                credit: credit.balance,
                                                offers,
                                                requests,
                                                requestCount: result.requestCount
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

// Ajouter une compétence

router.post('/add-skill', authMiddleware, (req, res) => {
    const { skillName, type } = req.body;
    const userId = req.session.userId;

    if (!skillName || !type) return res.send('Champs manquants');

    // Vérifier si la compétence existe déjà
    db.get('SELECT id FROM skills WHERE name = ?', [skillName], (err, skill) => {
        if (err) return res.send('Erreur DB');

        const skillId = skill ? skill.id : null;

        const insertSkill = (id) => {
            db.run(
                'INSERT INTO user_skills (user_id, skill_id, type) VALUES (?, ?, ?)',
                [userId, id, type],
                (err) => {
                    if (err) return res.send('Erreur ajout compétence');
                    res.redirect('/profile');
                }
            );
        };

        if (skillId) {
            // La compétence existe, l'ajouter à l'utilisateur
            insertSkill(skillId);
        } else {
            // La compétence n'existe pas, l'insérer d'abord
            db.run(
                'INSERT INTO skills (name) VALUES (?)',
                [skillName],
                function (err) {
                    if (err) return res.send('Erreur insertion compétence');
                    insertSkill(this.lastID);
                }
            );
        }
    });
});

//Liste des autres utilisateurs
router.get('/users', authMiddleware, (req, res) => {
    db.all(
        `
    SELECT
      users.id AS user_id,
      users.username,
      skills.id AS skill_id,
      skills.name AS skill_name
    FROM user_skills
    JOIN users ON users.id = user_skills.user_id
    JOIN skills ON skills.id = user_skills.skill_id
    WHERE user_skills.type = 'offer'
    AND users.id != ?
    `,
        [req.session.userId],
        (err, rows) => {
            if (err) {
                console.log(err);
                return res.send('Erreur chargement utilisateurs');
            }
            res.render('users', { rows: rows });
        }
    );
});

// Supprimer une compétence
router.post('/remove-skill', authMiddleware, (req, res) => {
    const { skillId } = req.body;
    const userId = req.session.userId;

    db.run(
        'DELETE FROM user_skills WHERE user_id = ? AND skill_id = ?',
        [userId, skillId],
        (err) => {
            if (err) return res.send('Erreur suppression compétence');
            res.redirect('/profile');
        }
    );
});

//Voir le profile des autres utilisateurs
router.get('/users/:userId', authMiddleware, (req, res) => {
    const userId = req.params.userId;

    db.get(
        'SELECT * FROM users WHERE id = ?',
        [userId],
        (err, user) => {
            if (err) return res.send('Erreur chargement utilisateur');

            db.all(
                'SELECT s.name FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = ? AND us.type = ?',
                [userId, 'offer'],
                (err, offers) => {
                    if (err) return res.send('Erreur chargement compétences offertes');

                    db.all(
                        'SELECT s.name FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = ? AND us.type = ?',
                        [userId, 'request'],
                        (err, requests) => {
                            if (err) return res.send('Erreur chargement compétences recherchées');

                            res.render('user-profile', { user, offers, requests });
                        }
                    );
                }
            );
        }
    );
});

module.exports = router;


