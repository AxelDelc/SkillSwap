const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');
const userRoutes = require('./routes/users');
const exchangeRoutes = require('./routes/exchanges');
const homeRoutes = require('./routes/home');
const messagesRoutes = require('./routes/messages');

const app = express();

// Middleware pour lire les formulaires HTML
app.use(express.urlencoded({ extended: true }));

// Sessions
app.use(session({
    store: new pgSession({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'skillswap_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
}));

// Templates EJS
app.set('view engine', 'ejs');

// Injecte currentUserId, flash et le nombre de messages non lus dans toutes les vues
app.use(async (req, res, next) => {
    const prisma = require('./lib/prisma');
    res.locals.currentUserId = req.session.userId || null;
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;

    if (req.session.userId) {
        try {
            res.locals.messageCount = await prisma.message.count({
                where: { receiverId: req.session.userId, read: false }
            });
        } catch {
            res.locals.messageCount = 0;
        }
    } else {
        res.locals.messageCount = 0;
    }

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

// Routes Messages
app.use(messagesRoutes);

module.exports = app;

// Lancement du serveur uniquement si exécuté directement
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Serveur lancé sur http://localhost:${PORT}`);
    });
}
