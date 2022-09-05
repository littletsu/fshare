try{const app = require('express')();
const fs = require('fs');
const os = require('os');
const root = "/data/data/com.termux/files/home";
const aliases = fs.readFileSync('alias', 'UTF8').split('\n').map(a => a.split(' '));
console.log("Loaded " + aliases.length + " aliases")
	
const readDir = (path) => {
	const readdir = fs.readdirSync(path);	
	return readdir.map(f => {
		const type = fs.lstatSync(`${path}/${f}`).isFile();
		// 1/true = file, 0/false = dir
		return {path, type, name: f}
	});
}

app.set('view engine', 'ejs');

app.use((req, res, next) => {
	
	let found = false
 aliases.forEach(alias => {
	if(alias.length !== 2) return
 	if((req.url) === '/'+alias[0]) {
		res.redirect('/?path='+alias[1])
		found = true
	}
 })
	if(!found) return next()
	
})

app.get('/', (req, res) => {
	let { path } = req.query;
	if(!path) {
		res.render('dir.ejs', {
			files: readDir(root), 
			path: root
		});
	} else {
		if(!path.startsWith(root)) path = root + path
		if(fs.lstatSync(path).isDirectory()) {
			
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
