from flask import Flask, request, send_from_directory, jsonify, render_template, url_for
from flask_cors import CORS
from openai import OpenAI
import os
import base64
from dotenv import load_dotenv
from datetime import datetime
import json
from pathlib import Path
import tempfile

load_dotenv()

# Flask 앱 초기화 - static 및 template 설정
app = Flask(__name__, static_folder='../front', template_folder='../front')
CORS(app)

# 기본 경로 설정
BASE_DIR = Path(__file__).resolve().parent
CONVERSATIONS_FILE = BASE_DIR / "conversations.json"

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ✅ 정적 파일(이미지, CSS, JS) 제공 라우트
@app.route('/model/<path:filename>')
def model_files(filename):
    return send_from_directory('../model', filename)

@app.route('/css/<path:filename>')
def css_files(filename):
    return send_from_directory('../front/css', filename)

@app.route('/js/<path:filename>')
def js_files(filename):
    return send_from_directory('../front/js', filename)

# ✅ HTML 페이지 라우트 (템플릿 렌더링)
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

# ✅ 대화 기록 저장
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

# ✅ AI 챗 API 엔드포인트
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
                'kei': "당신은 창의적이고 현대적인 감각을 지닌 아티스트 캐릭터입니다.",
                'haru': "당신은 비즈니스 환경에서 일하는 전문적인 캐릭터입니다.",
            }

            system_message = system_messages.get(character, system_messages['kei'])

            # GPT-4o를 사용한 응답 생성
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
        return jsonify({"error": str(e)}), 500

# ✅ Vercel 환경 설정
if __name__ == '__main__':
    app.run(debug=True)
else:
    app = app  # for Vercel
