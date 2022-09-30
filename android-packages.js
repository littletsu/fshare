module.exports = (port) => {
    const express = require('express');
    const { exec } = require('child_process');
    const app = express();


    app.get('/', (req, res) => {
        exec("cmd package list packages", (err, stdout) => {
            if(err) return res.send(err);
            console.log(stdout)
        })
    })

    app.listen(port);
}