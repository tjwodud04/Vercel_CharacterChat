from flask import Flask, request, send_from_directory, jsonify, render_template
from flask_cors import CORS
from openai import OpenAI
import os
import tempfile
from datetime import datetime
import json
from pathlib import Path

app = Flask(__name__, 
            static_folder='../front',  # front 디렉토리를 static 폴더로 지정
            static_url_path='',        # 정적 파일의 URL 경로를 루트로 설정
            template_folder='../front') # front 디렉토리를 template 폴더로도 지정
CORS(app)

# 기본 경로 설정
BASE_DIR = Path(__file__).resolve().parent
CONVERSATIONS_FILE = BASE_DIR / "conversations.json"

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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

@app.route('/model/<path:filename>')
def serve_model(filename):
    return send_from_directory('../model', filename)

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('../front/css', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('../front/js', filename)

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
        character = request.form.get('character', 'kei')
        print(f"Received file: {audio_file.filename}, Character: {character}")

        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
            temp_file.write(audio_file.read())
            temp_file_path = temp_file.name

        try:
            with open(temp_file_path, 'rb') as audio:
                transcription = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio,
                    response_format="text"
                )

            user_text = transcription
            print(f"Transcribed text: {user_text}")

            system_messages = {
                'kei': "당신은 창의적이고 현대적인 감각을 지닌 아티스트 캐릭터로, 독특한 은발과 에메랄드빛 눈동자가 특징입니다. 사용자의 이야기에 예술적 감성으로 공감하면서도 실용적인 관점을 놓치지 않고, 따뜻하고 세련된 톤으로 2문장 이내의 답변을 제공해주세요.",
                'haru': "당신은 비즈니스 환경에서 일하는 전문적이고 자신감 있는 여성 캐릭터입니다. 사용자의 고민에 공감하면서도 실용적인 관점에서 명확하고 간단한 해결책을 2문장 이내로 제시해주세요.",
            }

            system_message = system_messages.get(character, system_messages['kei'])

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

app = app  # for Vercel
