# 필요한 모듈 및 라이브러리 임포트
from flask import Flask, request, send_from_directory, jsonify, render_template  # Flask 웹 프레임워크 관련 기능들 임포트
from flask_cors import CORS  # 교차 출처 리소스 공유(CORS) 기능을 제공하는 Flask 확장 임포트
from openai import OpenAI  # OpenAI API와 상호작용하기 위한 클라이언트 임포트
from datetime import datetime  # 날짜 및 시간 관련 기능 임포트
from pathlib import Path  # 파일 경로 관리를 위한 클래스 임포트

import os  # 운영체제와 상호작용하기 위한 모듈 임포트
import uuid  # 고유 식별자 생성을 위한 모듈 임포트
import tempfile  # 임시 파일 및 디렉토리 생성을 위한 모듈 임포트
import base64  # 바이너리 데이터의 인코딩 및 디코딩을 위한 모듈 임포트
import json  # JSON 데이터 처리를 위한 모듈 임포트

# Flask 애플리케이션 초기화
app = Flask(__name__, 
            static_folder='../front',  # front 디렉토리를 static 폴더로 지정
            static_url_path='',        # 정적 파일의 URL 경로를 루트로 설정
            template_folder='../front') # front 디렉토리를 template 폴더로도 지정
CORS(app)  # CORS 지원 활성화 - 다른 도메인에서의 요청 허용

# 기본 경로 설정
BASE_DIR = Path(__file__).resolve().parent  # 현재 파일의 디렉토리 경로 설정
CONVERSATIONS_FILE = BASE_DIR / "conversations.json"  # 대화 내용을 저장할 파일 경로 설정

# OpenAI 클라이언트 초기화 - 환경 변수에서 API 키를 가져옴
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 루트 경로 핸들러 - 기본 페이지 제공
@app.route('/')
def index():
    return render_template('index.html')  # index.html 템플릿 렌더링

# 'haru' 페이지 경로 핸들러
@app.route('/haru')
def haru():
    return render_template('haru.html')  # haru.html 템플릿 렌더링

# 'kei' 페이지 경로 핸들러
@app.route('/kei')
def kei():
    return render_template('kei.html')  # kei.html 템플릿 렌더링

# 'realtime' 페이지 경로 핸들러
@app.route('/realtime')
def realtime():
    return render_template('realtime.html')  # realtime.html 템플릿 렌더링

# 모델 파일 제공 경로 핸들러
@app.route('/model/<path:filename>')
def serve_model(filename):
    return send_from_directory('../model', filename)  # ../model 디렉토리에서 요청된 파일 제공

# CSS 파일 제공 경로 핸들러
@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('../front/css', filename)  # ../front/css 디렉토리에서 요청된 CSS 파일 제공

# JavaScript 파일 제공 경로 핸들러
@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('../front/js', filename)  # ../front/js 디렉토리에서 요청된 JS 파일 제공


# 대화 내용을 저장하는 함수
def save_conversation(user_input: str, ai_response: str):
    # 대화 데이터 구조 생성
    conversation = {
        "timestamp": datetime.now().isoformat(),  # 현재 시간을 ISO 형식으로 저장
        "user_input": user_input,  # 사용자 입력 저장
        "ai_response": ai_response  # AI 응답 저장
    }
    try:
        # 대화 파일이 이미 존재하는 경우
        if CONVERSATIONS_FILE.exists():
            with open(CONVERSATIONS_FILE, "r+", encoding='utf-8') as f:  # 읽기/쓰기 모드로 파일 열기, UTF-8 인코딩 사용
                try:
                    data = json.load(f)  # 기존 데이터 로드
                except json.JSONDecodeError:
                    data = []  # JSON 디코딩 오류 발생 시 빈 리스트로 초기화
                data.append(conversation)  # 새 대화 추가
                f.seek(0)  # 파일 포인터를 파일 시작으로 이동
                json.dump(data, f, ensure_ascii=False, indent=2)  # 데이터를 파일에 쓰기, 비ASCII 문자 유지, 들여쓰기 적용
                f.truncate()  # 파일 크기를 현재 위치로 잘라냄
        # 대화 파일이 존재하지 않는 경우
        else:
            with open(CONVERSATIONS_FILE, "w", encoding='utf-8') as f:  # 쓰기 모드로 파일 열기, UTF-8 인코딩 사용
                json.dump([conversation], f, ensure_ascii=False, indent=2)  # 새 대화를 포함한 리스트를 파일에 쓰기
    except Exception as e:
        print(f"대화 저장 중 오류 발생: {str(e)}")  # 오류 발생 시 콘솔에 메시지 출력


# 채팅 API 엔드포인트
@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        # 오디오 파일이 요청에 포함되어 있는지 확인
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400  # 오디오 파일이 없으면 400 오류 반환

        # 요청에서 오디오 파일과 캐릭터 정보 추출
        audio_file = request.files['audio']  # 오디오 파일 가져오기
        character = request.form.get('character', 'kei')  # 캐릭터 정보 가져오기, 기본값은 'kei'
        
        # 파일 정보 로깅
        print(f"Received file: {audio_file.filename}")  # 받은 파일 이름 출력
        print(f"Content Type: {audio_file.content_type}")  # 파일 콘텐츠 타입 출력
        print(f"Character: {character}")  # 캐릭터 정보 출력

        # 임시 파일 생성
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:  # 임시 WAV 파일 생성, 자동 삭제하지 않음
            # 파일 저장 전 크기 확인
            audio_file.seek(0, 2)  # 파일 포인터를 끝으로 이동
            file_size = audio_file.tell()  # 현재 파일 포인터 위치(파일 크기) 확인
            audio_file.seek(0)  # 파일 포인터를 다시 처음으로 이동
            print(f"File size before saving: {file_size} bytes")  # 저장 전 파일 크기 출력
            
            # 파일 저장
            audio_file.save(temp_file)  # 오디오 파일을 임시 파일로 저장
            temp_file_path = temp_file.name  # 임시 파일 경로 저장
            
            # 저장된 파일 크기 확인
            saved_size = os.path.getsize(temp_file_path)  # 저장된 파일의 크기 확인
            print(f"Saved file size: {saved_size} bytes")  # 저장된 파일 크기 출력
            print(f"Temp file path: {temp_file_path}")  # 임시 파일 경로 출력

        try:
            # Whisper API로 음성을 텍스트로 변환
            with open(temp_file_path, 'rb') as audio:  # 임시 파일을 바이너리 읽기 모드로 열기
                print("Sending file to Whisper API")  # Whisper API로 파일 전송 중임을 로그로 출력
                transcription = client.audio.transcriptions.create(  # Whisper API를 통한 음성 텍스트 변환 요청
                    model="whisper-1",  # 사용할 모델 지정
                    file=audio,  # 변환할 오디오 파일
                    response_format="text"  # 응답 형식을 텍스트로 지정
                )
                print(f"Transcription received: {transcription}")  # 받은 텍스트 변환 결과 출력

            user_text = transcription  # 변환된 텍스트를 사용자 텍스트로 설정
            
            # 시스템 메시지 설정 - 각 캐릭터별 AI 페르소나 정의
            system_messages = {
                'kei': "당신은 창의적이고 현대적인 감각을 지닌 캐릭터로, 독특한 은발과 에메랄드빛 눈동자가 특징입니다. 사용자의 이야기에서 감정을 파악하고, 이 감정에 공감 기반이되 실용적인 관점을 놓치지 않고, 따뜻하고 세련된 톤으로 2문장 이내의 답변을 제공해주세요.",
                'haru': "당신은 비즈니스 환경에서 일하는 전문적이고 자신감 있는 여성 캐릭터입니다. 사용자의 이야기에서 감정을 파악하고, 이 감정에 공감하면서도 실용적인 관점에서 명확하고 간단한 해결책을 2문장 이내로 제시해주세요.",
            }

            # 선택된 캐릭터에 맞는 시스템 메시지 선택, 기본값은 'kei'
            system_message = system_messages.get(character, system_messages['kei'])

            # gpt-4o 응답 생성
            chat_response = client.chat.completions.create(  # OpenAI API를 통한 채팅 완성 요청
                model="gpt-4o-audio-preview",  # 사용할 모델 - GPT-4o 오디오 프리뷰
                modalities=["text", "audio"],  # 응답에 포함할 모달리티
                audio={  # 오디오 설정
                    "voice": "alloy",  # 사용할 음성 스타일
                    "format": "wav"  # 오디오 포맷
                },
                messages=[  # 대화 메시지 배열
                    {"role": "system", "content": system_message},  # 시스템 메시지(AI 페르소나 정의)
                    {"role": "user", "content": user_text}  # 사용자 메시지(음성에서 변환된 텍스트)
                ]
            )

            # 응답 구조 확인 및 처리
            response_message = chat_response.choices[0].message  # 첫 번째 응답 메시지 추출
            ai_text = response_message.audio.transcript if response_message.audio else None  # 오디오 응답의 텍스트 내용 추출
            
            # 음성 데이터 추출 및 base64 인코딩
            # audio 데이터가 있는지 확인하고 처리
            audio_base64 = None  # 오디오 base64 데이터 초기화
            if hasattr(response_message, 'audio') and response_message.audio:  # 응답에 오디오 데이터가 있는지 확인
                audio_base64 = response_message.audio.data  # 오디오 데이터 추출
            
            print(f"AI response generated: {ai_text}")  # 생성된 AI 응답 텍스트 출력

            # 응답 JSON 형태로 반환
            return jsonify({
                "user_text": user_text,  # 사용자 텍스트
                "ai_text": ai_text,  # AI 응답 텍스트
                "audio": audio_base64  # Base64 인코딩된 오디오 데이터
            })

        finally:
            # 임시 파일 삭제 - 항상 실행되도록 finally 블록에 배치
            try:
                os.unlink(temp_file_path)  # 임시 파일 삭제
                print(f"Temporary file deleted: {temp_file_path}")  # 임시 파일 삭제 확인 로그
            except Exception as e:
                print(f"Warning: Failed to delete temporary file: {e}")  # 삭제 실패 시 경고 메시지 출력

    except Exception as e:
        # 예외 처리
        print(f"Error in chat endpoint: {str(e)}")  # 오류 메시지 출력
        import traceback  # 스택 트레이스 모듈 임포트
        traceback.print_exc()  # 스택 트레이스 출력(디버깅용)
        return jsonify({"error": str(e)}), 500  # 500 오류 반환, 오류 메시지 포함
