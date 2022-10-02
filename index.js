try {
	const app = require('express')();
	const fs = require('fs');
	const os = require('os');
	const { join, basename, resolve } = require('path');
	const mime = require('mime');

	let argsObj = {};
	let commands = [];
    process.argv.forEach((arg, i) => {
        let argument = arg.toLowerCase();
        if(argument.startsWith('-')) {
			argsObj[argument] = process.argv[i+1] ? process.argv[i+1].startsWith('-') ? true : process.argv[i+1] : true
        }
    });

	const argvalue = (name, args, desc) => {
		commands.push({name, args, desc});
		return argsObj[name] || argsObj["-" + name];
	}

	const config = {
		root: argvalue("-root", "[path]", "Path to redirect to on /"),
		enable_android_packages: argvalue("-ap", null, "Enables an alternate server that allows downloading of android apps on the system"),
		packages_port: argvalue("-ap-port", "[port]", "Port for android apps server"),
		prompt: argvalue("-pr", "(type)", 'Enables a prompt for permission every time a file is accesed. Can be "sh" to send prompts on the shell, or anything else to send prompts as a termux dialog if possible.'),
		help: argvalue("-help", null, "Show list of commands, their description and their arguments")
	}

	if(config.help) {
		console.log(commands
			.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0))
			.map(cmd => `${cmd.name}${cmd.args ? ` ${cmd.args}` : ""} - ${cmd.desc}`).join('\n'));
		process.exit();
	}

	const root = config.root || process.env.FSHARE_ROOT || process.env.HOME || process.env.USERPROFILE || "/";
	const is_termux = process.env.HOME && process.env.HOME.includes("com.termux");
	const can_termux_prompt = is_termux && (config.prompt !== "sh");
	const port = 3000;

	let packages_port;
	let ynPrompt;

	if(!can_termux_prompt) {
		let rl = require('readline').createInterface({
			input: process.stdin,
			output: process.stdout
		});
		ynPrompt = (question) => new Promise((res, rej) => {
			rl.question(question + " (y/N): ", answer => res(answer.toLowerCase() === "y"))
		});
	} else {
		ynPrompt = (question) => new Promise((res, rej) => {
			require('child_process').exec(`termux-dialog confirm -t "${question.replace(/"/, "")}"`, (err, stdout) => {
				if(err) return rej(err);
				res(JSON.parse(stdout).text === "yes");
			})
		});
	}

	const aliases = fs.readFileSync('alias', 'UTF8').split('\n').filter(line => line.trim() !== "").map(a => a.split(' '));
	console.log(`Loaded ${aliases.length} aliases.\nArgs: ${Object.entries(config).filter(e => e[1]).map(e => `${e[0]}=${e[1]}`).join(' - ')}`);

	const readDir = (path) => {
		const readdir = fs.readdirSync(path);
		return readdir.map(f => {
			const type = fs.lstatSync(`${path}/${f}`).isFile();
			// 1/true = file, 0/false = dir
			return { path, type, name: f }
		});
	}

	const sendFile = async (path, res, filename) => {
		if(config.prompt && !(await ynPrompt(`Allow access to ${path}`))) return res.status(401).send('Forbidden');
		let data = fs.readFileSync(path);
		let type = mime.getType(path);
		if (!type || type === "text/plain") type = "text/plain;charset=utf-8";
		res.writeHead(200, {
			'Content-Type': type,
			'Content-disposition': 'filename=' + filename || basename(path),
			'Content-Length': data.length
		});
		res.end(data, 'binary');
	}

	app.set('view engine', 'ejs');

	app.use((req, res) => {
		let found = false
		aliases.forEach(alias => {
			if (alias.length !== 2) return
			if ((req.url) === '/' + alias[0]) {
				res.redirect(resolve(alias[1]))
				found = true
			}
		})
		if (found) return;
		let path = decodeURI(req.url);
		if ((path === "/") && (path !== root)) return res.redirect(root);
		let lstat = fs.lstatSync(path);
		
		if (!lstat.isFile()) return res.render('dir.ejs', {
			files: readDir(path),
			path, join
		});

		sendFile(path, res);
	})

	if((is_termux && (typeof config.enable_android_packages === "undefined")) || (config.enable_android_packages === "ap")) {
		packages_port = config.packages_port || port + 1;
		require('./android-packages.js')(packages_port, sendFile);
	}

	app.listen(port, () => {
		let interfaces = os.networkInterfaces();
		let serverIps = Object.entries(interfaces)
						.map(([name, ips]) => `\t${name}:\n\t  ${ips.map(ip => `${ip.address}:${port}${packages_port ? ` / ${ip.address}:${packages_port}` : ''}`).join('\n\t  ')}`).join('\n');
		console.log(`Server started at:\n${serverIps}`);
	});

	

} catch (err) { console.log(err) } // for some reason termux wont let me see errors from node so i have to use this
