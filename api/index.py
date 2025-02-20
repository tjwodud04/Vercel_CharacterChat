from flask import Flask, request, send_from_directory, jsonify, render_template
from flask_cors import CORS
from openai import OpenAI
from datetime import datetime
from pathlib import Path

import os
import uuid
import tempfile  # 추가
import base64  # 추가된 임포트
import json

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
        
        # 파일 정보 로깅
        print(f"Received file: {audio_file.filename}")
        print(f"Content Type: {audio_file.content_type}")
        print(f"Character: {character}")

        # 임시 파일 생성
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            # 파일 저장 전 크기 확인
            audio_file.seek(0, 2)
            file_size = audio_file.tell()
            audio_file.seek(0)
            print(f"File size before saving: {file_size} bytes")
            
            # 파일 저장
            audio_file.save(temp_file)
            temp_file_path = temp_file.name
            
            # 저장된 파일 크기 확인
            saved_size = os.path.getsize(temp_file_path)
            print(f"Saved file size: {saved_size} bytes")
            print(f"Temp file path: {temp_file_path}")

        try:
            # Whisper API로 음성을 텍스트로 변환
            with open(temp_file_path, 'rb') as audio:
                print("Sending file to Whisper API")
                transcription = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio,
                    response_format="text"
                )
                print(f"Transcription received: {transcription}")

            user_text = transcription
            
            # 시스템 메시지 설정
            system_messages = {
                'kei': "당신은 창의적이고 현대적인 감각을 지닌 캐릭터로, 독특한 은발과 에메랄드빛 눈동자가 특징입니다. 사용자의 이야기에서 감정을 파악하고, 이 감정에 공감 기반이되 실용적인 관점을 놓치지 않고, 따뜻하고 세련된 톤으로 2문장 이내의 답변을 제공해주세요.",
                'haru': "당신은 비즈니스 환경에서 일하는 전문적이고 자신감 있는 여성 캐릭터입니다. 사용자의 이야기에서 감정을 파악하고, 이 감정에 공감하면서도 실용적인 관점에서 명확하고 간단한 해결책을 2문장 이내로 제시해주세요.",
            }

            system_message = system_messages.get(character, system_messages['kei'])

            # GPT-4 응답 생성
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

            # 응답 구조 확인 및 처리
            response_message = chat_response.choices[0].message
            ai_text = response_message.content
            
            # 음성 데이터 추출 및 base64 인코딩
            # audio 데이터가 있는지 확인하고 처리
            audio_base64 = None
            if hasattr(response_message, 'audio') and response_message.audio:
                audio_base64 = response_message.audio.data


            # Ensure audio_data is a string
            # if isinstance(audio_data, str):
            #     audio_data = audio_data.encode('utf-8')  # Encode string to bytes

            # audio_base64 = base64.b64encode(audio_data).decode('utf-8')
            
            print(f"AI response generated: {ai_text}")

            return jsonify({
                "user_text": user_text,
                "ai_text": ai_text,
                "audio": audio_base64
            })

        finally:
            # 임시 파일 삭제
            try:
                os.unlink(temp_file_path)
                print(f"Temporary file deleted: {temp_file_path}")
            except Exception as e:
                print(f"Warning: Failed to delete temporary file: {e}")

    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# @app.route('/api/chat', methods=['POST'])
# def chat():
#     try:
#         if 'audio' not in request.files:
#             return jsonify({"error": "No audio file provided"}), 400

#         audio_file = request.files['audio']
#         character = request.form.get('character', 'kei')
        
#         # 파일 정보 로깅
#         print(f"Received file: {audio_file.filename}")
#         print(f"Content Type: {audio_file.content_type}")
#         print(f"Character: {character}")

#         # Create temporary file with .wav extension
#         with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
#             # 파일 크기 확인
#             audio_file.seek(0, 2)
#             file_size = audio_file.tell()
#             audio_file.seek(0)
#             print(f"File size before saving: {file_size} bytes")
            
#             # Convert to WAV if needed
#             if 'webm' in audio_file.content_type:
#                 # Use ffmpeg to convert webm to wav
#                 import subprocess
                
#                 # Save original audio first
#                 audio_file.save(temp_file)
#                 temp_webm = temp_file.name
#                 temp_wav = temp_webm.replace('.wav', '_converted.wav')
                
#                 try:
#                     subprocess.run([
#                         'ffmpeg', '-i', temp_webm,
#                         '-acodec', 'pcm_s16le',
#                         '-ar', '16000',
#                         '-ac', '1',
#                         temp_wav
#                     ], check=True)
                    
#                     # Use the converted file
#                     temp_file_path = temp_wav
#                 except subprocess.CalledProcessError as e:
#                     print(f"FFmpeg conversion failed: {e}")
#                     return jsonify({"error": "Audio conversion failed"}), 500
#             else:
#                 # Save file directly if it's already in acceptable format
#                 audio_file.save(temp_file)
#                 temp_file_path = temp_file.name

#             saved_size = os.path.getsize(temp_file_path)
#             print(f"Saved file size: {saved_size} bytes")
#             print(f"Temp file path: {temp_file_path}")

#             try:
#                 # Whisper API로 음성을 텍스트로 변환
#                 with open(temp_file_path, 'rb') as audio:
#                     print("Sending file to Whisper API")
#                     transcription = client.audio.transcriptions.create(
#                         model="whisper-1",
#                         file=audio,
#                         response_format="text"
#                     )
#                     print(f"Transcription received: {transcription}")

#                 user_text = transcription
                
#                 # 시스템 메시지 설정
#                 system_messages = {
#                     'kei': "당신은 창의적이고 현대적인 감각을 지닌 캐릭터로, 독특한 은발과 에메랄드빛 눈동자가 특징입니다. 사용자의 이야기에서 감정을 파악하고, 이 감정에 공감 기반이되 실용적인 관점을 놓치지 않고, 따뜻하고 세련된 톤으로 2문장 이내의 답변을 제공해주세요.",
#                     'haru': "당신은 비즈니스 환경에서 일하는 전문적이고 자신감 있는 여성 캐릭터입니다. 사용자의 이야기에서 감정을 파악하고, 이 감정에 공감하면서도 실용적인 관점에서 명확하고 간단한 해결책을 2문장 이내로 제시해주세요.",
#                 }

#                 system_message = system_messages.get(character, system_messages['kei'])

#                 # GPT-4 응답 생성
#                 chat_response = client.chat.completions.create(
#                     model="gpt-4o-audio-preview",
#                     modalities=["text", "audio"],
#                     audio={
#                         "voice": "alloy",
#                         "format": "wav"
#                     },
#                     messages=[
#                         {"role": "system", "content": system_message},
#                         {"role": "user", "content": user_text}
#                     ]
#                 )

#                 ai_text = chat_response.choices[0].message.content
#                 print(f"AI response generated: {ai_text}")

#                 return jsonify({
#                     "user_text": user_text,
#                     "ai_text": ai_text
#                 })

#             finally:
#                 # 임시 파일 삭제
#                 try:
#                     os.unlink(temp_file_path)
#                     if 'temp_webm' in locals():
#                         os.unlink(temp_webm)
#                     if 'temp_wav' in locals():
#                         os.unlink(temp_wav)
#                     print(f"Temporary files deleted")
#                 except Exception as e:
#                     print(f"Warning: Failed to delete temporary files: {e}")

#     except Exception as e:
#         print(f"Error in chat endpoint: {str(e)}")
#         import traceback
#         traceback.print_exc()
#         return jsonify({"error": str(e)}), 500

# if __name__ == '__main__':
#     app.run(host='0.0.0.0', port=8000, debug=True)

app = app  # for Vercel
