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
                backgroundAlpha: 0
            });
            console.log('PIXI Application created successfully');

            const modelPath = '/model/kei/kei_vowels_pro.model3.json';
            console.log('Loading Live2D model from:', modelPath);
            this.model = await PIXI.live2d.Live2DModel.from(modelPath);
            console.log('Live2D model loaded successfully');

            // 모델 크기와 위치 조정
            this.model.scale.set(0.5);  // 크기를 0.65에서 0.5로 축소
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
            const audioData = atob(audioBase64);
            const arrayBuffer = new ArrayBuffer(audioData.length);
            const uint8Array = new Uint8Array(arrayBuffer);

            for (let i = 0; i < audioData.length; i++) {
                uint8Array[i] = audioData.charCodeAt(i);
            }

            const audioBlob = new Blob([arrayBuffer], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            console.log('Audio blob created and URL generated');

            this.model.speak(audioUrl, {
                volume: 1.0,
                crossOrigin: "anonymous"
            });

            return new Promise((resolve) => {
                setTimeout(() => {
                    URL.revokeObjectURL(audioUrl);
                    console.log('Audio playback completed, URL revoked');
                    resolve();
                }, 500);
            });
        } catch (error) {
            console.error('Audio playback error:', error);
            this.setExpression('neutral');
        }
    }

    stopSpeaking() {
        if (this.model) {
            console.log('Stopping speech and resetting expression');
            this.model.stopSpeaking();
            this.setExpression('neutral');
        }
    }
}

class AudioManager {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.audioContext = null;
        this.analyser = null;
        this.initAudioContext();
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000
                }
            });

            // Create MediaRecorder with WAV recording
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(16384, 1, 1);
            const chunks = [];

            source.connect(processor);
            processor.connect(audioContext.destination);

            processor.onaudioprocess = (e) => {
                if (this.isRecording) {
                    const channelData = e.inputBuffer.getChannelData(0);
                    const wavBuffer = this.floatTo16BitPCM(channelData);
                    chunks.push(wavBuffer);
                }
            };

            this.audioChunks = chunks;
            this.isRecording = true;
            
            // Connect to analyser for visualization
            const analyserSource = this.audioContext.createMediaStreamSource(stream);
            analyserSource.connect(this.analyser);

            return true;
        } catch (error) {
            console.error('Failed to start recording:', error);
            alert('마이크 접근 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
            return false;
        }
    }

    floatTo16BitPCM(float32Array) {
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return int16Array;
    }

    createWavHeader(sampleRate, bitsPerSample, numberOfChannels, numberOfSamples) {
        const buffer = new ArrayBuffer(44);
        const view = new DataView(buffer);

        const writeString = (view, offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + numberOfSamples * 2, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numberOfChannels * (bitsPerSample / 8), true);
        view.setUint16(32, numberOfChannels * (bitsPerSample / 8), true);
        view.setUint16(34, bitsPerSample, true);
        writeString(view, 36, 'data');
        view.setUint32(40, numberOfSamples * 2, true);

        return buffer;
    }

    stopRecording() {
        this.isRecording = false;

        // Combine all chunks into a single audio buffer
        const numberOfChannels = 1;
        const sampleRate = 16000;
        const bitsPerSample = 16;
        
        // Calculate total number of samples
        let totalLength = 0;
        this.audioChunks.forEach(chunk => {
            totalLength += chunk.length;
        });

        // Create WAV header
        const header = this.createWavHeader(sampleRate, bitsPerSample, numberOfChannels, totalLength);

        // Combine header and audio data
        const audioData = new Int16Array(totalLength);
        let offset = 0;
        this.audioChunks.forEach(chunk => {
            audioData.set(chunk, offset);
            offset += chunk.length;
        });

        const blob = new Blob([header, audioData], { type: 'audio/wav' });
        this.audioChunks = [];
        return blob;
    }

    getAudioData() {
        if (!this.analyser) return new Uint8Array();
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteTimeDomainData(dataArray);
        return dataArray;
    }
}

// class AudioManager {
//     constructor() {
//         this.mediaRecorder = null;
//         this.audioChunks = [];
//         this.isRecording = false;
//         this.audioContext = null;
//         this.analyser = null;
//         this.initAudioContext();
//         console.log('AudioManager initialized');
//     }

//     initAudioContext() {
//         try {
//             this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
//             this.analyser = this.audioContext.createAnalyser();
//             console.log('Audio context initialized successfully');
//         } catch (error) {
//             console.error('Failed to initialize audio context:', error);
//         }
//     }

//     // async startRecording() {
//     //     try {
//     //         if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
//     //             throw new Error('Media Devices API not supported');
//     //         }

//     //         const stream = await navigator.mediaDevices.getUserMedia({
//     //             audio: {
//     //                 channelCount: 1,
//     //                 sampleRate: 16000
//     //             },
//     //             video: false
//     //         });
//     //         console.log('Audio stream obtained successfully');

//     //         const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
//     //             ? 'audio/webm;codecs=opus'
//     //             : 'audio/webm';
//     //         console.log('Using MIME type:', mimeType);

//     //         this.mediaRecorder = new MediaRecorder(stream, {
//     //             mimeType: mimeType,
//     //             audioBitsPerSecond: 128000
//     //         });

//     //         this.mediaRecorder.ondataavailable = (event) => {
//     //             if (event.data.size > 0) {
//     //                 this.audioChunks.push(event.data);
//     //                 console.log('Audio chunk received:', event.data.size, 'bytes');
//     //             }
//     //         };

//     //         if (this.audioContext && this.analyser) {
//     //             const source = this.audioContext.createMediaStreamSource(stream);
//     //             source.connect(this.analyser);
//     //             console.log('Audio source connected to analyser');
//     //         }

//     //         this.mediaRecorder.start(100);
//     //         this.isRecording = true;
//     //         console.log('Recording started');
//     //         return true;
//     //     } catch (error) {
//     //         console.error('Failed to start recording:', error);
//     //         alert('마이크 접근 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
//     //         return false;
//     //     }
//     // }

//     async startRecording() {
//         try {
//             if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
//                 throw new Error('Media Devices API not supported');
//             }
    
//             const stream = await navigator.mediaDevices.getUserMedia({
//                 audio: {
//                     channelCount: 1,
//                     sampleRate: 16000
//                 },
//                 video: false
//             });
//             console.log('Audio stream obtained successfully');
    
//             // Explicitly set to use WAV format
//             const options = {
//                 audioBitsPerSecond: 128000,
//                 mimeType: 'audio/wav'
//             };
    
//             // Fall back to default if WAV is not supported
//             if (!MediaRecorder.isTypeSupported('audio/wav')) {
//                 console.log('WAV not supported, falling back to default format');
//                 this.mediaRecorder = new MediaRecorder(stream);
//             } else {
//                 this.mediaRecorder = new MediaRecorder(stream, options);
//             }
    
//             this.mediaRecorder.ondataavailable = (event) => {
//                 if (event.data.size > 0) {
//                     this.audioChunks.push(event.data);
//                     console.log('Audio chunk received:', event.data.size, 'bytes', 'type:', event.data.type);
//                 }
//             };
    
//             if (this.audioContext && this.analyser) {
//                 const source = this.audioContext.createMediaStreamSource(stream);
//                 source.connect(this.analyser);
//                 console.log('Audio source connected to analyser');
//             }
    
//             this.mediaRecorder.start(100);
//             this.isRecording = true;
//             console.log('Recording started with format:', this.mediaRecorder.mimeType);
//             return true;
    
//         } catch (error) {
//             console.error('Failed to start recording:', error);
//             alert('마이크 접근 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
//             return false;
//         }
//     }

    
//     stopRecording() {
//         if (this.mediaRecorder && this.isRecording) {
//             console.log('Stopping recording');
//             this.mediaRecorder.stop();
//             this.isRecording = false;
//             this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
//         }
//     }

//     getAudioBlob() {
//         const blob = new Blob(this.audioChunks, {
//             type: this.mediaRecorder ? this.mediaRecorder.mimeType : 'audio/webm'
//         });
//         console.log('Audio blob created:', blob.size, 'bytes');
//         this.audioChunks = [];
//         return blob;
//     }

//     getAudioData() {
//         if (!this.analyser) {
//             console.warn('Analyser not initialized');
//             return new Uint8Array();
//         }
//         const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
//         this.analyser.getByteTimeDomainData(dataArray);
//         return dataArray;
//     }
// }

class ChatManager {
    constructor(characterType = 'kei') {  // 기본값으로 'kei' 설정
        this.chatHistory = document.getElementById('chatHistory');
        this.isPlaying = false;
        this.conversationHistory = []; // Store conversation history for context
        this.characterType = characterType;  // 캐릭터 타입 저장
        console.log('ChatManager initialized');
    }

    addMessage(role, message) {
        console.log(`Adding ${role} message:`, message);

        const messageElement = document.createElement('div');
        messageElement.className = `message ${role}-message`;

        // AI 메시지인 경우 프로필 추가
        if (role === 'ai') {
            const profile = document.createElement('div');
            profile.className = 'message-profile';

            // 캐릭터별 프로필 이미지 설정
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

        this.chatHistory.appendChild(messageElement);
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;

        this.conversationHistory.push({
            role: role === 'user' ? 'user' : 'assistant',
            content: message
        });
    }

    async sendAudioToServer(audioBlob) {
        try {
            console.log('Preparing to send audio to server');
            console.log('Audio blob type:', audioBlob.type);
            console.log('Audio blob size:', audioBlob.size);
            
            const formData = new FormData();
            formData.append('audio', audioBlob, 'audio.webm');
            formData.append('character', this.characterType);  // 캐릭터 정보 추가

            console.log('Sending request to server');
            const response = await fetch('/api/chat', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error response:', errorText);
                throw new Error(`Server responded with ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('Server response received:', data);
            return data;
        } catch (error) {
            console.error('Server communication error:', error);
            throw error;
        }
    }

    // 대화 기록 가져오기
    getConversationHistory() {
        return this.conversationHistory;
    }
}

let live2dManager;
let audioManager;
let chatManager;

function updateLipSync() {
    if (audioManager && audioManager.isRecording) {
        const audioData = audioManager.getAudioData();
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += Math.abs(audioData[i] - 128);
        }
        const average = sum / audioData.length;
        const normalizedValue = average / 128;

        live2dManager.updateLipSync(normalizedValue);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing application...');
    live2dManager = new Live2DManager();
    audioManager = new AudioManager();
    chatManager = new ChatManager('kei');

    live2dManager.initialize();

    const recordButton = document.getElementById('recordButton');
    recordButton.addEventListener('click', handleRecording);

    setInterval(updateLipSync, 50);
    console.log('Application initialization completed');
});

async function handleRecording() {
    const recordButton = document.getElementById('recordButton');

    if (chatManager.isPlaying) {
        console.log('Cannot start recording while audio is playing');
        return;
    }

    if (!audioManager.isRecording) {
        console.log('Starting new recording');
        const started = await audioManager.startRecording();
        if (started) {
            recordButton.textContent = '멈추기';
            recordButton.classList.add('recording');
            live2dManager.setExpression('listening');
        }
    } else {
        console.log('Stopping recording and processing audio');
        recordButton.disabled = true;
        audioManager.stopRecording();
        recordButton.textContent = '처리 중...';
        recordButton.classList.remove('recording');
        live2dManager.setExpression('neutral');

        const audioBlob = audioManager.getAudioBlob();
        try {
            console.log('Sending audio to server for processing');
            const response = await chatManager.sendAudioToServer(audioBlob);
            console.log('Received server response:', response);

            if (response.user_text) {
                chatManager.addMessage('user', response.user_text);
            }

            if (response.ai_text) {
                chatManager.addMessage('ai', response.ai_text);
            }

            if (response.audio) {
                console.log('Starting audio playback');
                chatManager.isPlaying = true;
                live2dManager.setExpression('speaking');

                try {
                    await live2dManager.playAudioWithLipSync(response.audio);
                    console.log('Audio playback completed');

                    live2dManager.setExpression('neutral');
                    chatManager.isPlaying = false;
                    recordButton.disabled = false;
                    recordButton.textContent = '이야기하기';
                } catch (error) {
                    console.error('Playback error:', error);
                    live2dManager.setExpression('neutral');
                    chatManager.isPlaying = false;
                    recordButton.disabled = false;
                    recordButton.textContent = '이야기하기';
                }
            } else {
                console.log('No audio in response');
                live2dManager.setExpression('neutral');
                chatManager.isPlaying = false;
                recordButton.disabled = false;
                recordButton.textContent = '이야기하기';
            }
        } catch (error) {
            console.error('Error processing recording:', error);
            chatManager.addMessage('system', '오류가 발생했습니다. 다시 시도해주세요.');
            live2dManager.setExpression('neutral');
            chatManager.isPlaying = false;
            recordButton.disabled = false;
            recordButton.textContent = '녹음 시작';
        }
    }
}
