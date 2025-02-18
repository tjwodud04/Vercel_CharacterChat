from flask import Flask, request, send_from_directory, jsonify
from flask_cors import CORS
from openai import OpenAI
import os
import base64
from dotenv import load_dotenv
from datetime import datetime
import json
from pathlib import Path
import tempfile
import os

load_dotenv()

# Flask 앱 초기화 - static 설정을 명확하게
# app = Flask(__name__, static_url_path='', static_folder='front')
app = Flask(__name__, static_folder='../front', template_folder='../front')
CORS(app)

# 기본 경로 설정
BASE_DIR = Path(__file__).resolve().parent
CONVERSATIONS_FILE = BASE_DIR / "conversations.json"

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.route('/')
def index():
    try:
        return send_from_directory(app.static_folder, 'index.html')
    except Exception as e:
        print(f"Error serving index.html: {str(e)}")
        return "Error loading page", 500


@app.route('/favicon.ico')
def favicon():
    return "", 204


@app.route('/front/<path:path>')
def serve_static(path):
    return send_from_directory('front', path)


@app.route('/model/<path:path>')
def serve_model(path):
    return send_from_directory('model', path)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/haru')
def haru():
    return render_template('haru.html')

@app.route('/kei')
def kei():
    return render_template('kei.html')

@app.route('/realtime')
def realtime():
    return render_template('realtime.html')

def save_conversation(user_input: str, ai_response: str):
    conversation = {
        "timestamp": datetime.now().isoformat(),
        "user_input": user_input,
        "ai_response": ai_response
    }
    try:
        if CONVERSATIONS_FILE.exists():
            with open(CONVERSATIONS_FILE, "r+", encoding='utf-8') as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError:
                    data = []
                data.append(conversation)
                f.seek(0)
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.truncate()
        else:
            with open(CONVERSATIONS_FILE, "w", encoding='utf-8') as f:
                json.dump([conversation], f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"대화 저장 중 오류 발생: {str(e)}")


@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400

        audio_file = request.files['audio']
        character = request.form.get('character', 'kei')  # 기본값은 'kei'
        print(f"Received file: {audio_file.filename}, Character: {character}")

        # 임시 파일로 저장
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
            temp_file.write(audio_file.read())
            temp_file_path = temp_file.name

        try:
            # Whisper API로 음성을 텍스트로 변환
            with open(temp_file_path, 'rb') as audio:
                transcription = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio,
                    response_format="text"
                )

            user_text = transcription
            print(f"Transcribed text: {user_text}")

            # 캐릭터별 시스템 메시지 설정
            system_messages = {
                'kei': "당신은 창의적이고 현대적인 감각을 지닌 아티스트 캐릭터로, 독특한 은발과 에메랄드빛 눈동자가 특징입니다. 사용자의 이야기에 예술적 감성으로 공감하면서도 실용적인 관점을 놓치지 않고, 따뜻하고 세련된 톤으로 2문장 이내의 답변을 제공해주세요.",
                'haru': "당신은 비즈니스 환경에서 일하는 전문적이고 자신감 있는 여성 캐릭터입니다. 사용자의 고민에 공감하면서도 실용적인 관점에서 명확하고 간단한 해결책을 2문장 이내로 제시해주세요.",
            }

            system_message = system_messages.get(character, system_messages['kei'])

            # gpt-4o-audio-preview로 텍스트와 음성 동시 생성
            chat_response = client.chat.completions.create(
                model="gpt-4o-audio-preview",
                modalities=["text", "audio"],
                audio={
                    "voice": "alloy",
                    "format": "wav"
                },
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_text}
                ]
            )

            # 응답 처리
            ai_text = chat_response.choices[0].message.audio.transcript
            ai_audio = chat_response.choices[0].message.audio.data

            # 대화 저장
            save_conversation(user_text, ai_text)

            return jsonify({
                "user_text": user_text,
                "ai_text": ai_text,
                "audio": ai_audio,
            })

        finally:
            try:
                os.unlink(temp_file_path)
            except Exception as e:
                print(f"Warning: Failed to delete temporary file: {e}")

    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# if __name__ == '__main__':
#     app.run(host='0.0.0.0', port=8000, debug=True)
if __name__ == '__main__':
    app.run(debug=True)
else:
    app = app  # for Vercel
