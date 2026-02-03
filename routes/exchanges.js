const express = require('express');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/exchange', authMiddleware, (req, res) => {
    const receiverId = req.session.userId;
    const { giverId, skillId } = req.body;

    if (!giverId || !skillId) {
        return res.send('Données manquantes');
    }

    // Vérifier crédits du receveur (session)
    db.get(
        'SELECT balance FROM credits WHERE user_id = ?',
        [receiverId],
        (err, credit) => {
            if (err || !credit || credit.balance < 1) {
                return res.send('Crédits insuffisants');
            }

            // -1 crédit receveur
            db.run(
                'UPDATE credits SET balance = balance - 1 WHERE user_id = ?',
                [receiverId]
            );

            // +1 crédit donneur
            db.run(
                'UPDATE credits SET balance = balance + 1 WHERE user_id = ?',
                [giverId]
            );

            // Enregistrer l’échange
            db.run(
                `
                INSERT INTO exchanges (giver_id, receiver_id, skill_id, credits)
                VALUES (?, ?, ?, ?)
                `,
                [giverId, receiverId, skillId, 1],
                (err) => {
                    if (err) return res.send('Erreur enregistrement échange');
                    res.redirect('/profile');
                }
            );
        }
    );
});

module.exports = router;