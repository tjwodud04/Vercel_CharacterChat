// AudioManager 클래스 수정
class AudioManager {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.audioContext = null;
        this.analyser = null;
        this.sampleRate = 24000;  // 24kHz로 고정
        this.channels = 1;        // 모노로 고정
        this.initAudioContext();
        console.log('AudioManager initialized');
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.sampleRate
            });
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            console.log('Audio context initialized successfully');
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
        }
    }

    async startRecording() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Media Devices API not supported');
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: this.channels,
                    sampleRate: this.sampleRate,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            console.log('Audio stream obtained successfully');

            // WebM 포맷으로 녹음 (서버에서 PCM16으로 변환)
            const mimeType = 'audio/webm;codecs=opus';
            console.log('Using MIME type:', mimeType);

            this.audioChunks = [];
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                audioBitsPerSecond: 128000
            });

            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.start(20);
            this.isRecording = true;
            return true;
        } catch (error) {
            console.error('Failed to start recording:', error);
            if (error.name === 'NotAllowedError') {
                alert('마이크 접근 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
            }
            return false;
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            return true;
        }
        return false;
    }

    getAudioBlob() {
        if (this.audioChunks.length === 0) {
            return null;
        }
        const blob = new Blob(this.audioChunks, {
            type: 'audio/webm;codecs=opus'
        });
        return blob;
    }

    getAudioData() {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteTimeDomainData(dataArray);
        return dataArray;
    }
}

class Live2DManager {
    constructor() {
        this.model = null;
        this.app = null;
        this.canvas = document.getElementById('live2d-canvas');
        window.PIXI = PIXI;
        console.log('Live2DManager initialized');
    }

    async initialize() {
        try {
            this.app = new PIXI.Application({
                view: this.canvas,
                transparent: true,
                autoStart: true,
                resolution: window.devicePixelRatio || 1,
                antialias: true,
                autoDensity: true,
                backgroundColor: 0xffffff,
                backgroundAlpha: 0,
                resizeTo: window
            });
            console.log('PIXI Application created successfully');

            const modelPath = '/model/momose/hiyori_pro_t11.model3.json';
            this.model = await PIXI.live2d.Live2DModel.from(modelPath);

            this.model.scale.set(0.15);
            this.model.anchor.set(0.5, 0.5);
            this.model.x = this.app.screen.width / 2;
            this.model.y = this.app.screen.height / 2;

            this.app.stage.addChild(this.model);
            this.setExpression('neutral');
        } catch (error) {
            console.error('Live2D model loading failed:', error);
        }
    }

    setExpression(expression) {
        if (this.model) {
            try {
                console.log('Setting expression to:', expression);
                this.model.expression(expression);
            } catch (error) {
                console.error('Failed to update Live2D expression:', error);
            }
        }
    }

    async playAudioWithLipSync(audioBase64) {
        if (!this.model) {
            console.warn('Live2D model not initialized');
            return;
        }

        try {
            console.log('Starting audio playback with lip sync');

            const audioData = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
            const wavBlob = new Blob([this.createWAVFromPCM(audioData)], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(wavBlob);

            const audioElement = new Audio();
            audioElement.crossOrigin = "anonymous";

            const audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 24000
            });

            const source = audioContext.createMediaElementSource(audioElement);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 1024;

            source.connect(analyser);
            analyser.connect(audioContext.destination);

            const updateLipSync = () => {
                if (audioElement.paused) return;

                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteTimeDomainData(dataArray);

                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += Math.abs(dataArray[i] - 128);
                }
                const average = sum / dataArray.length;
                const normalizedValue = average / 128;

                if (this.model && this.model.speak) {
                    this.model.speak(normalizedValue);
                }
                requestAnimationFrame(updateLipSync);
            };

            audioElement.src = audioUrl;

            return new Promise((resolve, reject) => {
                audioElement.oncanplay = async () => {
                    try {
                        updateLipSync();
                        await audioElement.play();
                    } catch (error) {
                        reject(error);
                    }
                };

                audioElement.onended = () => {
                    setTimeout(() => {
                        source.disconnect();
                        analyser.disconnect();
                        audioContext.close();
                        URL.revokeObjectURL(audioUrl);
                        this.setExpression('neutral');
                        resolve();
                    }, 1000);
                };

                audioElement.onerror = (error) => {
                    console.error('Audio playback error:', error);
                    reject(error);
                };
            });
        } catch (error) {
            console.error('Audio setup error:', error);
            this.setExpression('neutral');
            throw error;
        }
    }

    createWAVFromPCM(pcmData) {
        const wavHeader = new ArrayBuffer(44);
        const view = new DataView(wavHeader);

        const writeString = (view, offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(view, 0, 'RIFF');
        view.setUint32(4, 32 + pcmData.length, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, 24000, true);
        view.setUint32(28, 48000, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(view, 36, 'data');
        view.setUint32(40, pcmData.length, true);

        const wav = new Uint8Array(wavHeader.byteLength + pcmData.length);
        wav.set(new Uint8Array(wavHeader), 0);
        wav.set(pcmData, wavHeader.byteLength);

        return wav;
    }
}

class ChatManager {
    constructor(characterType = 'momose') {
        this.chatHistory = document.getElementById('chatHistory');
        this.isPlaying = false;
        this.conversationHistory = [];
        this.characterType = characterType;
        console.log('ChatManager initialized');
    }

    async sendAudioToServer(audioBlob) {
        try {
            console.log('Sending audio data to server');
            const formData = new FormData();

            // 파일 이름과 확장자 명시적 지정
            const audioFile = new File([audioBlob], 'audio.webm', {
                type: 'audio/webm;codecs=opus'
            });
            formData.append('audio', audioFile);

            const response = await fetch('http://localhost:8001/api/chat', {
                method: 'POST',
                body: formData,
                // CORS 관련 설정 추가
                mode: 'cors',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                console.error('Server response error:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Error details:', errorText);
                throw new Error(`Server response error: ${response.status}`);
            }

            const data = await response.json();
            console.log('Server response received:', data);

            if (data.user_text) {
                this.addMessage('user', data.user_text);
            }
            if (data.ai_text) {
                this.addMessage('ai', data.ai_text);
            }

            return data;
        } catch (error) {
            console.error('Server communication error:', error);
            throw error;
        }
    }

    addMessage(role, message) {
        console.log(`Adding ${role} message:`, message);

        const messageElement = document.createElement('div');
        messageElement.className = `message ${role}-message`;

        if (role === 'ai') {
            const profile = document.createElement('div');
            profile.className = 'message-profile';

            const characterImg = document.createElement('img');
            characterImg.src = role === 'ai' ? (
                this.characterType === 'haru' ? '/model/haru/profile.jpg' :
                this.characterType === 'kei' ? '/model/kei/profile.jpg' :
                '/model/momose/profile.jpg'
            ) : '';
            profile.appendChild(characterImg);

            messageElement.appendChild(profile);
        }

        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble';

        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = message;

        const time = document.createElement('span');
        time.className = 'message-time';
        const now = new Date();
        time.textContent = now.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageBubble.appendChild(content);
        messageBubble.appendChild(time);
        messageElement.appendChild(messageBubble);

        if (this.chatHistory) {
            this.chatHistory.appendChild(messageElement);
            this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
        }

        this.conversationHistory.push({
            role: role === 'user' ? 'user' : 'assistant',
            content: message
        });
    }

    getConversationHistory() {
        return this.conversationHistory;
    }
}

let live2dManager;
let audioManager;
let chatManager;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Application initializing...');
    live2dManager = new Live2DManager();
    audioManager = new AudioManager();
    chatManager = new ChatManager('momose');

    live2dManager.initialize();

    const recordButton = document.getElementById('recordButton');
    recordButton.addEventListener('click', handleRecording);
});

async function handleRecording() {
    const recordButton = document.getElementById('recordButton');

    if (chatManager.isPlaying) {
        console.log('오디오 재생 중에는 녹음을 시작할 수 없습니다');
        return;
    }

    if (!audioManager.isRecording) {
        console.log('새 녹음 시작');
        const started = await audioManager.startRecording();
        if (started) {
            recordButton.textContent = '멈추기';
            recordButton.classList.add('recording');
            live2dManager.setExpression('listening');
        }
    } else {
        console.log('녹음 중지 및 오디오 처리');
        recordButton.disabled = true;
        const stopped = audioManager.stopRecording();
        recordButton.textContent = '처리 중...';
        recordButton.classList.remove('recording');
        live2dManager.setExpression('neutral');

        try {
            const audioBlob = audioManager.getAudioBlob();
            if (!audioBlob) {
                console.log('오디오 데이터가 없습니다');
                recordButton.disabled = false;
                recordButton.textContent = '이야기하기';
                return;
            }

            console.log('오디오 서버 전송 처리 중');
            const response = await chatManager.sendAudioToServer(audioBlob);
            console.log('서버 응답 수신:', response);

            if (response.audio) {
                console.log('오디오 재생 시작');
                chatManager.isPlaying = true;
                live2dManager.setExpression('speaking');

                try {
                    await live2dManager.playAudioWithLipSync(response.audio);
                    console.log('오디오 재생 완료');
                } catch (error) {
                    console.error('재생 오류:', error);
                }
            }
        } catch (error) {
            console.error('녹음 처리 오류:', error);
        } finally {
            live2dManager.setExpression('neutral');
            chatManager.isPlaying = false;
            recordButton.disabled = false;
            recordButton.textContent = '이야기하기';
        }
    }
}