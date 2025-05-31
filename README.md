# Live2D Interactive Avatar Project

An interactive Live2D avatar project that enables voice conversations. Using OpenAI's voice recognition and generation capabilities, users can engage in conversations with characters.

Brief Project Demo:

https://github.com/user-attachments/assets/1b67882f-7ca8-4871-97ab-11de4ba86212

## 🌟 Key Features

- **Multiple Character Support**: Interact with various characters like Kei and Haru
- **Low-Latency Voice Chat**: Live voice input through browser microphone
- **Lip Sync**: Character mouth movements synchronized with voice

## 🔧 Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/Vercel_CharacterChat.git
cd Vercel_CharacterChat
```

2. Create and activate Python virtual environment
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

3. Install required packages
```bash
pip install -r requirements.txt
```

## ⚙️ Configuration

### OpenAI API Key Setup
1. Get your API key from [OpenAI website](https://platform.openai.com)
2. Click "Set OpenAI API Key" button in the web interface
3. Enter your API key

## 💻 How to Use

1. Select a character to chat with from the main page
2. Set up OpenAI API key if not already configured
3. Allow microphone access when prompted
4. Click "Talk" button to start speaking
5. Click the button again to stop recording
6. Listen to the character's voice response

## 📁 Project Structure

```
.
├── api/                    # Backend API components
├── front/                  # Frontend files
│   ├── css/               # Stylesheets
│   ├── js/                # Frontend functionality
│   ├── index.html         # Main page
│   ├── haru.html          # Haru character page
│   ├── kei.html           # Kei character page
├── model/                  # Live2D model assets
│   ├── haru/              # Haru model files
│   ├── kei/               # Kei model files
├── audio_util.py          # Audio processing utilities
├── requirements.txt       # Python dependencies
├── vercel.json           # Vercel deployment config
```

### API Key Issues
- Verify API key format (should start with sk-)
- Check if API key has sufficient credits
- Try re-entering the API key
