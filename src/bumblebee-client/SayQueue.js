import EventEmitter from "events";
import SpectrumAnalyser from "./audio-spectrum-analyser";

const ipcRenderer = window.ipcRenderer;

function getAudioContext() {
	let audioContext;
	if (window.AudioContext) {
		audioContext = new window.AudioContext();
	}
	else if (window.webkitAudioContext) {
		console.log('creating webkitAudioContext');
		audioContext = new window.webkitAudioContext();
	}
	else {
		throw new Error('no AudioContext');
	}
	return audioContext;
}

function playAudio(data, volume, analyzerCallback) {
	if (!volume) {
		return new Promise((resolve, reject) => {
			resolve();
		});
	}
	return new Promise((resolve, reject) => {
		let audioContext = getAudioContext();
		let source = audioContext.createBufferSource();
		audioContext.decodeAudioData(data, (buffer) => {
			source.buffer = buffer;
			
			const gainNode = audioContext.createGain();
			gainNode.gain.setValueAtTime(volume, 0);
			// gainNode.gain.setValueAtTime(1, audioBuffer.duration-0.5);
			// gainNode.gain.linearRampToValueAtTime(0.0001, audioBuffer.duration - 0.2);
			source.connect(gainNode);
			gainNode.connect(audioContext.destination);
			
			const audioAnalyser = audioContext.createAnalyser();
			gainNode.connect(audioAnalyser);
			
			if (analyzerCallback) analyzerCallback(audioAnalyser);
			
			source.onended = function () {
				audioContext.close();
				resolve();
			};
			source.start(0);
		}, function (e) {
			console.log('error', e);
			debugger;
			reject();
		});
	});
}

class SayQueue extends EventEmitter {
	constructor(app) {
		super();
		this._audio = [];
		this.volume = 1;
		this.playing = false;
		this.sayOscilloscopeRef = null;
		this.profile = null;
		this.app = app;
	}

	setProfile(profile) {
		this.profile = profile;
	}
	setVolume(v) {
		this.volume = v;
	}

	queue(text, options, data, onBegin, onEnd, callback) {
		if (!options) options = {};
		this._audio.push({
			text, options, data, onBegin, onEnd, callback
		});
		if (!this.playing) {
			this.playNext();
		}
	}

	play(text, options, data, callback) {
		this.emit('play', text, options, data);
		const getAnalyzer = (analyser) => {
			const canvas = this.app.sayOscilloscopeRef.current;
			canvas.width = window.innerWidth;
			canvas.height = 100;
			this.analyser = new SpectrumAnalyser(analyser, canvas);
			this.analyser.setLineColor(this.app.theme.colors.ttsColor);
			this.analyser.setBackgroundColor('#222');
			this.analyser.start();
		};

		playAudio(data, this.volume, getAnalyzer).then(() => {
			if (callback) callback();
			this.playNext();
		})
	}

	playNext() {
		let nextAudio = this._audio.shift();
		if (nextAudio) {
			if (!this.playing) {
				this.playing = true;
				this.emit('playing');
			}

			this.emit('say-begin', nextAudio);
			if (nextAudio.onBegin) nextAudio.onBegin();

			this.play(nextAudio.text, nextAudio.options, nextAudio.data, () => {
				this.emit('say-end', nextAudio);
				if (nextAudio.onEnd) nextAudio.onEnd();
				nextAudio.callback();
			});
		}
		else {
			this.playing = false;
			this.emit('stopped');
		}
	}
	
	async say(text, options, onBegin, onEnd) {
		if (!options) options = {};
		return new Promise((resolve, reject) => {
			ipcRenderer.invoke('say-data', text, options).then((data) => {
				this.queue(text, options, data, onBegin, onEnd, resolve);
			});
		});
	};
}


const connectSayQueue = function(bumblebee, app) {
	const sayQueue = new SayQueue(app);

	window.say = (text, options) => {
		const id = Math.random().toString().substring(2);
		bumblebee.say(text, options, function() {
			ipcRenderer.send('say-begin-'+id);
		}, function() {
			ipcRenderer.send('say-end-'+id);
		});
		return id;
	};

	sayQueue.sayOscilloscopeRef = bumblebee.sayOscilloscopeRef;

	sayQueue.on('say-begin', (utterance) => {
		if (utterance.options.consoleOutput === false) return;
		bumblebee.console({
			type: 'tts',
			text: utterance.text,
			options: utterance.options
		});
		
	});
	
	sayQueue.setVolume(app.state.sayVolume);
	
	sayQueue.on('playing', () => {
		bumblebee.setMuted(true);
		app.setState({
			sayPlaying: true,
		}, () => {
			app.updateBanner();
		});
	});
	
	sayQueue.on('stopped', () => {
		bumblebee.setMuted(false);
		app.setState({
			sayPlaying: false,
		}, () => {
			app.updateBanner();
		});
	});
	
	return sayQueue;
}

export { connectSayQueue };