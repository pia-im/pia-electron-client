const electron = require('electron');
const Path = require('path');
const app = electron.app;
const ipcMain = electron.ipcMain;
const BrowserWindow = electron.BrowserWindow;
const isDev = require('electron-is-dev');
if (isDev) process.env.NODE_ENV = 'dev';

let mainWindow;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 480,
		height: 540,
		webPreferences: {
			// allow code inside this window to use use native window.open()
			nativeWindowOpen: true,
			nodeIntegration: true,
			nodeIntegrationInWorker: false,
			preload: __dirname + '/preload.js'
		}
	});
	
	mainWindow.loadURL(isDev ? 'http://localhost:3000' : `file://${Path.join(__dirname, '../build/index.html')}`);
	
	if (isDev) {
		// Open the DevTools.
		// BrowserWindow.addDevToolsExtension('<location to your react chrome extension>');
		// mainWindow.webContents.openDevTools();
	}
	
	mainWindow.on('closed', () => mainWindow = null);
	
	mainWindow.on('close', function (event) {
		console.log('close -> hide');
		event.preventDefault();
		mainWindow.hide();
	});
	
	ipcMain.on('dev-tools', (event, arg) => {
		console.log('open dev tools');
		mainWindow.webContents.openDevTools();
	});
	
	return mainWindow;
}

module.exports = function() {
	return createWindow();
}
