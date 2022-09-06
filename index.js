try {
	const app = require('express')();
	const fs = require('fs');
	const os = require('os');
	const { join, basename } = require('path');
	const mime = require('mime');

	const root = process.argv[2] || process.env.FSHARE_ROOT || process.env.HOME || "/";
	const port = 3000;

	const aliases = fs.readFileSync('alias', 'UTF8').split('\n').filter(line => line.trim() !== "").map(a => a.split(' '));
	console.log("Loaded " + aliases.length + " aliases")

	const readDir = (path) => {
		const readdir = fs.readdirSync(path);
		return readdir.map(f => {
			const type = fs.lstatSync(`${path}/${f}`).isFile();
			// 1/true = file, 0/false = dir
			return { path, type, name: f }
		});
	}

	app.set('view engine', 'ejs');

	app.use((req, res) => {
		let found = false
		aliases.forEach(alias => {
			if (alias.length !== 2) return
			if ((req.url) === '/' + alias[0]) {
				res.redirect(alias[1])
				found = true
			}
		})
		if (found) return;
		let path = decodeURI(req.url);
		if ((path === "/") && (path !== root)) return res.redirect(root);

		if (fs.lstatSync(path).isDirectory()) {
			res.render('dir.ejs', {
				files: readDir(path),
				path, join
			});
		} else {
			let data = fs.readFileSync(path);
			let type = mime.getType(path);
			if(!type || type === "text/plain") type = "text/plain;charset=utf-8";
			res.writeHead(200, {
				'Content-Type': type,
				'Content-disposition': 'filename=' + basename(path),
				'Content-Length': data.length
			});
			res.end(data, 'binary');
		}
	})

	app.listen(port, () => {
		let ip = os.networkInterfaces().wlan0;
		if(!ip) ip = "localhost";
		else ip = ip[0].address;
		console.log(`Server started at ${ip}:${port}`);
	});

} catch (err) { console.log(err) } // for some reason termux wont let me see errors from node so i have to use this
