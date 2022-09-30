module.exports = (port, sendFile) => {
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

    app.get('/package/:name', (req, res) => {
        const packageName = req.params.name.slice(0, -4);
        exec("cmd package path " + packageName, (err, stdout) => {
            if(err) return res.send(err);
            const files = stdout.split('\n').map(line => line.split('package:')[1]);
            sendFile(res, files[0]);
        })
    })

    app.listen(port);
}