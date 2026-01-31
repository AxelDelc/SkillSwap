const express = require('express');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/exchange', authMiddleware, (req, res) => {
    const giverId = req.session.userId;
    const { receiverId, skillId } = req.body;

    if (!receiverId || !skillId) {
        return res.send('Données manquantes');
    }

    //Verifier credits du reçeveur
    db.get(
        'SELECT balance FROM credits WHERE user_id = ?',
        [receiverId],
        (err, credit) => {
            if (err || !credit || credit.balance < 1) {
                return res.send('Erreur crédits reçeveur');
            }

            //Décrediter le reçeveur
            db.run(
                'UPDATE credits SET balance = balance - 1 WHERE user_id = ?',
                [receiverId],
            );

            //Créditer le donneur
            db.run(
                'UPDATE credits SET balance = balance + 1 WHERE user_id = ?',
                [giverId],
            );

            //Enregistrer l'échange
            db.run(
                `INSERT INTO exchanges (giver_id, receiver_id, skill_id, date) VALUES (?, ?, ?, datetime('now'))`,
                [giverId, receiverId, skillId],
                (err) => {
                    if (err) {
                        return res.send('Erreur enregistrement échange');
                    }
                    res.send('Échange réussi !');
                }
            );
        }
    );
});

module.exports = router;