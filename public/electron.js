const electron = require('electron');
const app = electron.app;
const windowManager = require('./window-manager.js');
const BumblebeeNode = require('./BumblebeeNode.js');

app.on('ready', function () {
  const bumblebee = new BumblebeeNode(this);
  const mainWindow = windowManager();
  console.log('Started');
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

console.log('\n\n   Bumblebee\n\
  Copyright (C) 2020 Jaxcore Software Inc.\n\
  This program comes with ABSOLUTELY NO WARRANTY\n\
  This is free software, and you are welcome to redistribute it\n\
  under certain conditions; for details see LICENSE.\n\n');
