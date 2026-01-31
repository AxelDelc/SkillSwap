const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db/database');
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');
const userRoutes = require('./routes/users');
const exchangeRoutes = require('./routes/exchanges');

const app = express();

// Middleware pour lire les formulaires HTML
app.use(express.urlencoded({ extended: true }));

// Sessions
app.use(session({
    secret: 'skillswap_secret',
    resave: false,
    saveUninitialized: false
}));

// Templates EJS
app.set('view engine', 'ejs');

// Fichiers statiques (CSS / JS)
app.use(express.static(path.join(__dirname, 'public')));

// Routes Auth
app.use(authRoutes);

// Routes Utilisateurs
app.use(userRoutes);

// Routes Échanges
app.use(exchangeRoutes);

// Lancement du serveur
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
});

/* ========== TESTS TEMPORAIRES ==========

// Route de test
app.get('/', (req, res) => {
    res.send('Réussite de la connexion à la base de données SQLite !');
});


// Test de la BDD
app.get('/test-db', (req, res) => {
    db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
        if (err) {
            return res.send('Erreur DB');
        }
        res.send(`Nombre d'utilisateurs : ${row.count}`);
    });
});


//Test route auth
app.get('/profile', authMiddleware, (req, res) => {
    res.send(`Bienvenue sur votre profil, utilisateur #${req.session.userId}`);
});
*/