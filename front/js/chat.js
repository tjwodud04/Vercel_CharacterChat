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
        recordButton.textContent = '처리 중...';
        recordButton.classList.remove('recording');
        live2dManager.setExpression('neutral');

        try {
            const audioBlob = await audioManager.stopRecording();
            if (!audioBlob) {
                throw new Error('No audio data recorded');
            }

            console.log('Sending audio to server for processing');
            const response = await chatManager.sendAudioToServer(audioBlob);
            console.log('Received server response:', response);

            if (response.user_text) {
                chatManager.addMessage('user', response.user_text);
            }

            if (response.ai_text) {
                chatManager.addMessage('ai', response.ai_text);

                if (response.audio) {
                    console.log('Starting audio playback');
                    chatManager.isPlaying = true;
                    live2dManager.setExpression('speaking');

                    try {
                        await live2dManager.playAudioWithLipSync(response.audio);
                        console.log('Audio playback completed');
                    } catch (error) {
                        console.error('Playback error:', error);
                    } finally {
                        live2dManager.setExpression('neutral');
                        chatManager.isPlaying = false;
                    }
                }
            }
        } catch (error) {
            console.error('Error processing recording:', error);
            chatManager.addMessage('system', '오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            live2dManager.setExpression('neutral');
            chatManager.isPlaying = false;
            recordButton.disabled = false;
            recordButton.textContent = '이야기하기';
        }
    }
}
