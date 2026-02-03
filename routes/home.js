const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('home', {
        userId: req.session.userId || null
    });
});

module.exports = router;