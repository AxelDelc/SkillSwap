const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(
    path.join(__dirname, 'database.sqlite'),
    (err) => {
        if (err) {
            console.error('Erreur SQLite', err);
        } else {
            console.log('BDD connectée');
        }
    }
);
module.exports = db;
