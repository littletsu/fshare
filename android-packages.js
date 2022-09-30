module.exports = (port) => {
    const express = require('express');
    const { exec } = require('child_process');
    const app = express();

    app.set('view engine', 'ejs');

    app.get('/', (req, res) => {
        exec("cmd package list packages", (err, stdout) => {
            if(err) return res.send(err);
            const packages = stdout.split('\n').map(line => line.split('package:')[1]);
            res.render('android-packages.ejs', {
                packages
            });
        })
    })

    app.listen(port);
}