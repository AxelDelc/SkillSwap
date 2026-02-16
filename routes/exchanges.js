const express = require('express');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

//créer une demande d'échange
router.post('/exchange', authMiddleware, (req, res) => {
    const receiverId = req.session.userId;
    const { giverId, skillId } = req.body;

    if (!giverId || !skillId) {
        return res.send('Données manquantes');
    }

    if (parseInt(giverId) === receiverId) {
        return res.send('Vous ne pouvez pas échanger avec vous-même');
    }

    // Vérifier crédits du receiver DANS LA TABLE credits
    db.get(
        'SELECT balance FROM credits WHERE user_id = ?',
        [receiverId],
        (err, creditRow) => {
            if (err) {
                console.error("ERREUR SQL :", err.message);
                return res.send(err.message);
            }

            if (!creditRow) {
                return res.send('Crédits introuvables');
            }

            if (creditRow.balance < 1) {
                return res.send('Crédits insuffisants pour effectuer un échange');
            }

            // Créer demande en pending
            db.run(
                `
                INSERT INTO exchanges 
                (giver_id, receiver_id, skill_id, credits, status)
                VALUES (?, ?, ?, ?, 'pending')
                `,
                [giverId, receiverId, skillId, 1],
                (err) => {
                    if (err) {
                        console.error(err.message);
                        return res.send("Erreur création demande");
                    }

                    res.redirect('/profile');
                }
            );
        }
    );
});


//Voir les demandes reçues
router.get('/requests', authMiddleware, (req, res) => {
    const userId = req.session.userId;

    db.all(
        `
        SELECT exchanges.id,
               exchanges.credits,
               users.username,
               skills.name AS skill_name
        FROM exchanges
        JOIN users ON exchanges.receiver_id = users.id
        JOIN skills ON exchanges.skill_id = skills.id
        WHERE exchanges.giver_id = ?
        AND exchanges.status = 'pending'
        `,
        [userId],
        (err, rows) => {
            if (err) return res.send("Erreur chargement demandes");

            res.render('requests', { rows });
        }
    );
});


//Accepter une demande
router.post('/exchange/accept', authMiddleware, (req, res) => {
    const { exchangeId } = req.body;

    db.get(
        "SELECT * FROM exchanges WHERE id = ? AND status = 'pending'",
        [exchangeId],
        (err, exchange) => {
            if (err || !exchange) {
                return res.send("Demande invalide");
            }

            // Vérifier crédits du receiver dans credits
            db.get(
                "SELECT balance FROM credits WHERE user_id = ?",
                [exchange.receiver_id],
                (err, creditRow) => {
                    if (err || !creditRow) {
                        return res.send("Erreur crédits utilisateur");
                    }

                    if (creditRow.balance < exchange.credits) {
                        return res.send("Crédits insuffisants");
                    }

                    // Débiter receiver
                    db.run(
                        "UPDATE credits SET balance = balance - ? WHERE user_id = ?",
                        [exchange.credits, exchange.receiver_id]
                    );

                    // Créditer giver
                    db.run(
                        "UPDATE credits SET balance = balance + ? WHERE user_id = ?",
                        [exchange.credits, exchange.giver_id]
                    );

                    // Update status
                    db.run(
                        "UPDATE exchanges SET status = 'accepted' WHERE id = ?",
                        [exchangeId],
                        () => {
                            res.redirect('/requests');
                        }
                    );
                }
            );
        }
    );
});

//Refuser une demande
router.post('/exchange/reject', authMiddleware, (req, res) => {
    const { exchangeId } = req.body;

    db.run(
        "UPDATE exchanges SET status = 'rejected' WHERE id = ?",
        [exchangeId],
        () => {
            res.redirect('/requests');
        }
    );
});


module.exports = router;
