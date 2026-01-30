const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db/database');
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');

const app = express();

// Middleware pour lire les formulaires HTML
app.use(express.urlencoded({ extended: true }));

// Sessions
app.use(session({
    secret: 'skillswap_secret',
    resave: false,
    saveUninitialized: false
}));

// Fichiers statiques (CSS / JS)
app.use(express.static(path.join(__dirname, 'public')));

// Templates EJS
app.set('view engine', 'ejs');

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

// Routes Auth
app.use(authRoutes);

app.get('/profile', authMiddleware, (req, res) => {
    res.send(`Bienvenue sur votre profil, utilisateur #${req.session.userId}`);
});


// Lancement du serveur
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
});