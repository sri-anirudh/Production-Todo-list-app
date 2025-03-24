# AI-Powered To-Do List Generator

## 🧠 Turn Mental Chaos into Structured Action

A productivity tool specifically designed for people with scattered thoughts, ADHD tendencies, or anyone who feels overwhelmed when organizing tasks. This web app uses AI to transform your messy thoughts into clear, actionable task lists with just a few clicks.

## ✨ Key Features

- **🤖 AI-Powered Task Breakdown**: Just describe what you need to do, and the app will automatically generate structured tasks, subtasks, and actionable steps
- **⏱️ Built-in Timers & Time Estimates**: Track how long tasks actually take and stay focused with integrated timers
- **😮‍💨 Emotion Check-ins**: Note how you feel before starting and after completing tasks to build emotional awareness
- **🍏 Clean, Minimalist UI**: Inspired by Apple Notes for a distraction-free experience
- **👥 Multi-user Support**: Create your own account to keep your tasks private and organized
- **🌓 Dark/Light Mode**: Work comfortably day or night with theme support

## 🖼️ App Screenshots

![App Screenshot 1](https://github.com/sri-anirudh/Production-Todo-list-app/blob/main/signup.png)
![App Screenshot 2](https://github.com/sri-anirudh/Production-Todo-list-app/blob/main/signin.png)
![App Screenshot 3](https://github.com/sri-anirudh/Production-Todo-list-app/blob/main/landing.png)


## 🔧 Installation & Setup

### Prerequisites
- Python 3.8 or higher
- Flask
- Hugging Face account (for API access)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/sri-anirudh/Production-Todo-list-app.git
   cd ai-todo-list-generator
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Create a .env file with your API credentials** (optional)
   ```
   HUGGINGFACE_API_TOKEN=your_token_here
   ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Access the web app**
   Open your browser and go to: `http://localhost:8083`

## 🚀 How to Use

1. **Sign up/Log in**: Create a new account or log in to your existing account
2. **Set up your Hugging Face API key** (optional):
   - Follow the instructions by clicking the "?" button
   - This enables AI-powered task generation with Mistral model
3. **Generate tasks**:
   - Type or use voice input to describe what you need to do
   - Click "Generate Tasks" and let the AI structure everything for you
4. **Manage your tasks**:
   - Check off completed items
   - Use the built-in timer to track time spent
   - Add emotion check-ins to monitor how tasks affect your mental state

## 💻 Technologies Used

- **Backend**: Python, Flask
- **Frontend**: HTML, CSS, JavaScript
- **AI**: Hugging Face API, Mistral 7B
- **Data Storage**: CSV files (lightweight, no database setup required)

## 🤝 Contributing

Contributions are welcome! If you'd like to help improve this tool
---

Built with ❤️ for self!
