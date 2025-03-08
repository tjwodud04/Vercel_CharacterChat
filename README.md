# Live2D Interactive Avatar Project

https://github.com/user-attachments/assets/1b67882f-7ca8-4871-97ab-11de4ba86212

This repository contains an interactive avatar project utilizing Live2D models and a web-based interface for real-time interaction.

## 📁 Project Structure

```
.
├── api/                     # Backend API components
├── front/                   # Frontend files
│   ├── css/                 # Stylesheets
│   │   ├── main.css
│   │   ├── style.css
│   ├── js/                  # JavaScript files for frontend functionality
│   │   ├── axios.min.js
│   │   ├── chat.js
│   │   ├── cubism4.min.js
│   │   ├── haru.js
│   │   ├── live2d.min.js
│   │   ├── main.js
│   │   ├── realtime.js
│   ├── index.html           # Main webpage
│   ├── haru.html            # Haru model-specific page
│   ├── kei.html             # Kei model-specific page
│   ├── realtime.html        # Real-time interaction page
├── model/                   # Live2D model assets
│   ├── haru/                # Haru model files
│   ├── kei/                 # Kei model files
├── api/                     # Backend API scripts
├── .gitignore               # Git ignore file
├── README.md                # Project documentation
├── requirements.txt         # Python dependencies
├── vercel.json              # Deployment configuration
```

## 🚀 Features

- **Live2D Integration**: Uses Live2D Cubism for animated character interactions.
- **Web-based UI**: Interacts with models through HTML, CSS, and JavaScript.
- **Real-time Communication**: Implements real-time chat and interactions.
- **Backend Support**: Provides APIs for handling model behavior and user interactions.

## 🛠 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/your-repository.git
   cd your-repository
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up environment variables:
   ```bash
   cp example.env .env
   ```
   Configure `.env` with appropriate values.
4. Run the backend server:
   ```bash
   python realtime.py
   ```
5. Open `index.html` in a browser to start interacting with the models.

## 🎭 Models

### Haru
- Motion and physics data for expressive animations.
- Integrated with Cubism 4 engine.

### Kei
- Includes vowel synchronization for speech animation.
- Custom motion synchronizations.

## 📌 Deployment
This project is configured for deployment with Vercel. To deploy:
```bash
vercel
```

## 📄 License
This project follows the license defined in the repository. Ensure compliance before usage.

## 📝 Contributors
Feel free to contribute via pull requests or issues!
