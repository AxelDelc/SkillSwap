const express = require('express');
const session = require('express-session');
const path = require('path');
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');
const userRoutes = require('./routes/users');
const exchangeRoutes = require('./routes/exchanges');
const homeRoutes = require('./routes/home');

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

// Injecte currentUserId et le flash message dans toutes les vues
app.use((req, res, next) => {
    res.locals.currentUserId = req.session.userId || null;
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;
    next();
});

// Fichiers statiques (CSS / JS)
app.use(express.static(path.join(__dirname, 'public')));

// Routes Accueil
app.use('/', homeRoutes);

// Routes Auth
app.use(authRoutes);

// Routes Utilisateurs
app.use(userRoutes);

// Routes Échanges
app.use(exchangeRoutes);

module.exports = app;

// Lancement du serveur uniquement si exécuté directement
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Serveur lancé sur http://localhost:${PORT}`);
    });
}
