import EventEmitter from 'events';
import {connectSayQueue} from './SayQueue';
import Hotword from 'bumblebee-hotword';
import {connectPlaySound} from './playSound';
import drawVADCanvas, {clearVADCanvas} from './drawVADCanvas';

import SpectrumAnalyser from "./audio-spectrum-analyser";

const ipcRenderer = window.ipcRenderer;

class BumblebeeClient extends EventEmitter {
	constructor(app) {
		super();
		window.bumblebee = this;
		
		this.hotword = new Hotword();
		this.hotword.bufferSize = 512;
		this.hotword.setSensitivity(0.5);
		
		this.hotword.setWorkersPath('./bumblebee-workers');
		
		this.hotword.addHotword('bumblebee');
		this.hotword.addHotword('grasshopper');
		this.hotword.addHotword('hey_edison');
		
		this.hotword.on('data', (intData, floatData, sampleRate, hotword) => {
			// console.log('data', intData.length, floatData.length, sampleRate, hotword);
			
			if (hotword) {
				this.app.addSpeechOutput({
					type: 'text',
					text: 'hotword: ' + hotword
				});
			}
			ipcRenderer.send('hotword-data', intData, floatData, sampleRate, hotword);
		});
		
		this.hotword.on('analyser', (analyser) => {
			var canvas = app.speechOscilloscopeRef.current;
			canvas.width = window.innerWidth;
			canvas.height = 100;
			this.analyser = new SpectrumAnalyser(analyser, canvas);
			this.analyser.setLineColor(app.theme.colors.sttColor);
			this.analyser.setBackgroundColor('#222');
			this.analyser.start();
		});

		this.sayQueue = connectSayQueue(this, app);
		this.playSound = connectPlaySound(this, app);
		
		window.systemError = (error) => {
			this.console(error);
		}
		
    window.hotwordDetected = (hotword) => {
			debugger;
		};
		
		window.hotwordResults = (hotword, text, stats) => {
			// debugger;
			this.app.addSpeechOutput('hotwordCommand '+hotword+' '+text);
			
			if (!text) {
				// debugger;
				this.app.addSpeechOutput({
					text: '---',
					stats,
					type: 'command'
				});
			}
			else {
				// debugger;
				this.app.addSpeechOutput({
					text,
					stats,
					type: 'command'
				});
			}
			this.emit('hotwordCommand', text, stats);
			// this.setHotwordDetected(null);
		};
		
		app.vadStatusRef.current.width = window.innerWidth;
		
		window.updateVADStatus = (status) => {
			drawVADCanvas(app.vadStatusRef.current, status);
		};

		window.displayConsole = (component) => {
			this.app.console(component);
		};

	}
	
	console(component) {
		this.app.console(component);
	}
	
	simulateSTT(text) {
		if (this.app.state.muted) {
			this.console('muted');
			return;
		}
		ipcRenderer.send('simulate-stt', text);
	}

	toggleRecording() {
		if (this.app.state.recording) this.stopRecording()
		else this.startRecording();
	}
	
	startRecording() {
		if (this.app.state.recording) {
			console.log('already recording')
			debugger;
		}
		if (!this.app.state.recording) {
			if (this.app.state.useSystemMic) {
				// debugger;
				ipcRenderer.send('recording-start');
			}
			this.app.setState({
				recording: true
			}, () => {
				this.hotword.start();
				this.playSound('on');
			});
		}
		this.emit('recording-started');
	};

	async onRecordingStarted() {
		return new Promise((resolve, reject) => {
			this.once('recording-started', resolve);
		});
	}
	
	async onRecordingStopped() {
		return new Promise((resolve, reject) => {
			this.once('recording-stopped', resolve);
		});
	}
	
	stopRecording() {
		if (this.app.state.recording) {
			if (this.app.state.useSystemMic) {
				ipcRenderer.send('recording-stop');
			}
			clearInterval(this.app.recordingInterval);
			this.app.setState({
				recording: false
			}, () => {
				// this.microphone.stop();
				this.hotword.stop();
				if (this.analyser) this.analyser.stop();
				if (this.app.vadStatusRef) clearVADCanvas(this.app.vadStatusRef.current);
				this.playSound('off');
			});
		}
		this.emit('recording-stopped');
	};
	
	setMuted(muted) {
		this.app.setState({
			muted
		});
		// this.microphone.setMuted(muted);
		this.hotword.setMuted(muted);
		if (this.app.state.useSystemMic) {
			ipcRenderer.send('microphone-muted', muted);
		}
	}
	
	toggleMute() {
		this.app.setMuted(!this.app.state.muted);
	};
	
	clearConsole() {
		this.app.setState({recognitionOutput: []});
	}
	
	playSoundNode(name, theme) {
		ipcRenderer.send('play-sound', name, theme).then(r => {
			debugger;
		});
	}
	
}

export default BumblebeeClient;
