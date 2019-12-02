import { getLiveTab, sendMessageToTab } from '../../share';

export default class Recorder {
    constructor(bg) {
        this.bg = bg;
        this.config = null;
        this.stream = null;
        this.mediaRecorder = null;
        this.recordStop = this.recordStop.bind(this);
        this.recordDataavailable = this.recordDataavailable.bind(this);
    }

    static get CaptureOptions() {
        return {
            audio: true,
            video: true,
            videoConstraints: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    maxWidth: 1920,
                    minWidth: 1920,
                    maxHeight: 1080,
                    minHeight: 1080,
                },
            },
            audioConstraints: {
                mandatory: {
                    echoCancellation: true,
                },
            },
        };
    }

    static get RecorderOptions() {
        return {
            audioBitsPerSecond: 128000,
            videoBitsPerSecond: 2500000,
            mimeType: 'video/webm;codecs=avc1',
        };
    }

    static get Resolution() {
        return {
            1920: {
                width: 1920,
                height: 1080,
            },
            720: {
                width: 1280,
                height: 720,
            },
            480: {
                width: 640,
                height: 480,
            },
            360: {
                width: 640,
                height: 360,
            },
            240: {
                width: 320,
                height: 240,
            },
        };
    }

    async recordStop() {
        chrome.runtime.reload();
    }

    async recordDataavailable(event) {
        if (event.data && event.data.size > 0) {
            const blobUrl = URL.createObjectURL(event.data);
            sendMessageToTab(this.config.recordId, 'recording', blobUrl);
        }
    }

    async start(config) {
        this.config = config;
        const captureOptions = Recorder.CaptureOptions;
        const resolution = Recorder.Resolution[config.resolution];
        captureOptions.videoConstraints.mandatory.maxWidth = resolution.width;
        captureOptions.videoConstraints.mandatory.minWidth = resolution.width;
        captureOptions.videoConstraints.mandatory.maxHeight = resolution.height;
        captureOptions.videoConstraints.mandatory.minHeight = resolution.height;
        chrome.tabCapture.capture(captureOptions, stream => {
            if (stream) {
                this.stream = stream;
                this.mediaRecorder = new MediaRecorder(stream, Recorder.RecorderOptions);
                this.mediaRecorder.ondataavailable = this.recordDataavailable;
                this.mediaRecorder.onstop = this.recordStop;
                this.mediaRecorder.start(1000);
            }
        });
    }

    async stop() {
        const tab = await getLiveTab();
        if (tab && tab.status === 'active' && this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.mediaRecorder.stop();
            this.stream = null;
            this.mediaRecorder = null;
        }
    }
}
