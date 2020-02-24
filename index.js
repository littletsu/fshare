try{const app = require('express')();
const fs = require('fs');
const os = require('os');
	
const readDir = (path) => {
	const readdir = fs.readdirSync(path);	
	return readdir.map(f => {
		const type = fs.lstatSync(`${path}/${f}`).isFile();
		// 1/true = file, 0/false = dir
		return {path, type, name: f}
	});
}

app.set('view engine', 'ejs');


app.get('/', (req, res) => {
	let { path } = req.query;
	if(!path) {
		res.render('dir.ejs', {
			files: readDir('/storage'), 
			path: '/storage'
		});
	} else {
		if(fs.lstatSync(path).isDirectory()) {
			if(path === "/storage/emulated") path = path + '/0'
			res.render('dir.ejs', {
				files: readDir(path),
				path
			});
		} else {
			res.sendFile(path);
		}
	}
});


app.listen(3000, () => {
	const ip = os.networkInterfaces().wlan0[0].address;
	console.log(`Server started at ${ip}:3000`);
});

}catch(err){console.log(err)} // for some reason termux wont let me see errors from node so i have to use this
