const EventEmitter = require('events');
const ipcMain = require('electron').ipcMain;

class BumblebeeNode extends EventEmitter {	// todo: refactor into an adapter
	constructor(app) {
		super();
		global.bumblebee = this;
		this.recording = false;
		this.app = app;

		this.soundThemesPath = __dirname + '/../sounds';

		ipcMain.handle('play-sound', async (event, name) => await this.playSound(name) );
	}
	
	async playSound(name, theme) {
		if (!theme) {
      theme = 'startrek1';
    }
		console.log('execFunction: playSound', name, theme);
		let id = this.app.execFunction('playSound', [name, theme]);
		ipcMain.once('playsound-end-'+id, () => {
			console.log('sound-end-'+id, name, 'has ended');
		});
	}
	
	console(data) {
		this.app.execFunction('displayConsole', [data]);
	}
}

module.exports = BumblebeeNode;
