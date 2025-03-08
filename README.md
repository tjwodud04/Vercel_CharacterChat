# Live2D Interactive Avatar Project

Brief Project Demo Intro : 

https://github.com/user-attachments/assets/1b67882f-7ca8-4871-97ab-11de4ba86212

This repository contains an interactive avatar project utilizing Live2D models and a web-based interface for real-time interaction.

## 📁 Project Structure

```
.
├── api/                     # Backend API components
├── front/                   # Frontend files
│   ├── css/                 # Stylesheets
│   ├── js/                  # JavaScript files for frontend functionality
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

## 📄 License
This project follows the license defined in the repository. Ensure compliance before usage.

## 📝 Contributors
Feel free to contribute via pull requests or issues!
