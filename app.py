from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
import os
from dotenv import load_dotenv
import json
import requests
from huggingface_hub import InferenceClient
import csv
from functools import wraps
from datetime import datetime

# Load environment variables from .env file
load_dotenv()

# we will store and read from tasks.csv
DATA_FILE = 'tasks.csv'
USERS_FILE = 'users.csv'

# Secret key for session
app = Flask(__name__)
app.secret_key = os.urandom(24)

#############################
# 1) CSV Helper Functions   #
#############################

# Update the CSV file path and field names
DATA_FILE = 'tasks.csv'

def load_tasks_from_csv(username=None):
    tasks = []
    if not os.path.exists(DATA_FILE):
        return tasks
    with open(DATA_FILE, 'r', newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            # Only load tasks for the current user if username is provided
            if username and row.get('username') != username:
                continue
            try:
                # Handle empty or invalid values with safe conversion
                task_id = row.get('id', '0')
                task_id = int(task_id) if task_id.strip() else 0
                
                parent_id = row.get('parent_id', '0')
                parent_id = int(parent_id) if parent_id.strip() else 0
                
                level = row.get('level', '0')
                level = int(level) if level.strip() else 0
                
                tasks.append({
                    'id': task_id,
                    'parent_id': parent_id,
                    'text': row.get('text', ''),
                    'level': level,
                    'completed': row.get('completed', 'False').lower() == 'true',
                    'currentEmotion': row.get('currentEmotion', ''),
                    'completionEmotion': row.get('completionEmotion', ''),
                    'totalTimeEstimate': row.get('totalTimeEstimate', ''),
                    'createdAt': row.get('createdAt', ''),
                    'startTime': row.get('startTime', ''),
                    'endTime': row.get('endTime', ''),
                    'timeSpent': row.get('timeSpent', ''),
                    'username': row.get('username', '')
                })
            except Exception as e:
                print(f"Error loading task from CSV: {e}. Skipping row: {row}")
                continue
    return tasks

def write_tasks_to_csv(tasks):
    fieldnames = ['id', 'parent_id', 'text', 'level', 'completed', 'currentEmotion', 'completionEmotion', 'totalTimeEstimate', 'createdAt', 'startTime', 'endTime', 'timeSpent', 'username']
    with open(DATA_FILE, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for task in tasks:
            writer.writerow({
                'id': task['id'],
                'parent_id': task['parent_id'],
                'text': task['text'],
                'level': task['level'],
                'completed': str(task['completed']),
                'currentEmotion': task.get('currentEmotion', ''),
                'completionEmotion': task.get('completionEmotion', ''),
                'totalTimeEstimate': task.get('totalTimeEstimate', ''),
                'createdAt': task.get('createdAt', ''),
                'startTime': task.get('startTime', ''),
                'endTime': task.get('endTime', ''),
                'timeSpent': task.get('timeSpent', ''),
                'username': task.get('username', '')
            })

def convert_ai_result_to_csv_rows(ai_result, username):
    rows = []
    # Calculate a unique starting ID
    try:
        # Safely calculate the max ID with error handling
        new_id_base = 1  # Default starting ID if no tasks exist or an error occurs
        if task_list:
            valid_ids = [t['id'] for t in task_list if isinstance(t['id'], int)]
            if valid_ids:
                new_id_base = max(valid_ids) + 1
    except Exception as e:
        print(f"Error calculating new ID: {e}. Using default ID 1.")
        new_id_base = 1
        
    main_task_id = new_id_base
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Main task row (level 0)
    main_row = {
        'id': main_task_id,
        'parent_id': 0,
        'text': ai_result['taskTitle'],
        'level': 0,
        'completed': False,
        'currentEmotion': json.dumps(ai_result.get('currentEmotion', [])),
        'completionEmotion': json.dumps(ai_result.get('completionEmotion', [])),
        'totalTimeEstimate': ai_result.get('totalTimeEstimate', ''),
        'createdAt': created_at,
        'startTime': '',
        'endTime': '',
        'timeSpent': '',
        'username': username
    }
    rows.append(main_row)
    
    next_id = main_task_id + 1
    if 'subTasks' in ai_result and ai_result['subTasks']:
        for sub in ai_result['subTasks']:
            subtask_id = next_id
            next_id += 1
            sub_row = {
                'id': subtask_id,
                'parent_id': main_task_id,
                'text': sub['title'],
                'level': 1,
                'completed': False,
                'currentEmotion': '',
                'completionEmotion': '',
                'totalTimeEstimate': sub.get('totalTimeEstimate', ''),
                'createdAt': created_at,
                'startTime': '',
                'endTime': '',
                'timeSpent': '',
                'username': username
            }
            rows.append(sub_row)
            
            if 'steps' in sub and sub['steps']:
                for step in sub['steps']:
                    step_row = {
                        'id': next_id,
                        'parent_id': subtask_id,
                        'text': step,
                        'level': 2,
                        'completed': False,
                        'currentEmotion': '',
                        'completionEmotion': '',
                        'totalTimeEstimate': '',
                        'createdAt': created_at,
                        'startTime': '',
                        'endTime': '',
                        'timeSpent': '',
                        'username': username
                    }
                    rows.append(step_row)
                    next_id += 1
    return rows

# User authentication functions
def load_users_from_csv():
    users = {}
    if not os.path.exists(USERS_FILE):
        print(f"Creating new users file at {USERS_FILE}")
        with open(USERS_FILE, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=['username', 'password', 'api_key'])
            writer.writeheader()
        return users
    
    try:
        print(f"Loading users from {USERS_FILE}")
        with open(USERS_FILE, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            print(f"CSV Headers: {reader.fieldnames}")
            for row in reader:
                print(f"Processing user row: {row}")
                users[row.get('username', '')] = {
                    'password': row.get('password', ''),
                    'api_key': row.get('api_key', '')
                }
        print(f"Loaded {len(users)} users: {list(users.keys())}")
    except Exception as e:
        print(f"Error loading users: {e}")
        # If there's an error with the CSV file, recreate it
        print("Recreating users.csv file with correct headers")
        with open(USERS_FILE, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=['username', 'password', 'api_key'])
            writer.writeheader()
    return users

def add_user_to_csv(username, password):
    users = load_users_from_csv()
    if username in users:
        return False
    
    with open(USERS_FILE, 'a', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=['username', 'password', 'api_key'])
        writer.writerow({'username': username, 'password': password, 'api_key': ''})
    return True

def update_user_api_key(username, api_key):
    users = load_users_from_csv()
    if username not in users:
        return False
    
    # Read all rows
    rows = []
    with open(USERS_FILE, 'r', newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        fieldnames = reader.fieldnames
        for row in reader:
            if row['username'] == username:
                row['api_key'] = api_key
            rows.append(row)
    
    # Write back all rows
    with open(USERS_FILE, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return True

def get_user_api_key(username):
    users = load_users_from_csv()
    return users.get(username, {}).get('api_key', '')

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

#############################
# 2) Flask App Setup        #
#############################

# Initialize Hugging Face client if token exists
hf_token = os.getenv("HUGGINGFACE_API_TOKEN")
hf_client = None
if hf_token:
    hf_client = InferenceClient(token=hf_token)

# A global in-memory list that we load at startup:
task_list = load_tasks_from_csv()

@app.route('/')
def index():
    """Render the main page"""
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Handle user login"""
    error = None
    success = None
    
    if request.method == 'POST':
        #print("Login attempt")
        username = request.form['username']
        password = request.form['password']
        
        users = load_users_from_csv()
        #print(f"Loaded users: {users}")
        
        if username in users and users[username]['password'] == password:
            #print(f"Login successful for {username}")
            session['username'] = username
            return redirect(url_for('index'))
        else:
            print(f"Invalid login attempt for {username}")
            error = 'Invalid username or password. Please try again.'
            print(f"Error: {error}")
    
    print(f"Rendering login page with error: {error}")
    return render_template('login.html', error=error, success=success)

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    """Handle user registration"""
    error = None
    
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        
        if password != confirm_password:
            error = 'Passwords do not match. Please try again.'
        else:
            if add_user_to_csv(username, password):
                # Set a success message for login page
                return redirect(url_for('login', success='Account created successfully! Please login.'))
            else:
                error = 'Username already exists. Please choose a different username.'
    
    return render_template('signup.html', error=error)

@app.route('/logout')
def logout():
    """Handle user logout"""
    session.pop('username', None)
    return redirect(url_for('login'))

@app.route('/generate', methods=['POST'])
@login_required
def generate_tasks():
    """Generate tasks using AI based on user input"""
    user_input = request.json.get('context', '')
    
    if not user_input:
        return jsonify({"error": "Empty input"}), 400
    
    try:
        # If we have a Hugging Face client, use it
        if hf_client:
            ai_result = generate_tasks_with_huggingface(user_input)
        else:
            # Fallback to mock data for testing
            ai_result = generate_mock_tasks(user_input)
        
        # ai_result example:
        # {
        #   "taskTitle": "Something",
        #   "subTasks": [
        #       {"title": "Subtask 1", "steps": ["Step 1.1", "Step 1.2"]}
        #   ]
        # }

        # Convert ai_result to CSV rows with username
        new_rows = convert_ai_result_to_csv_rows(ai_result, session['username'])
        
        # Extend our global task_list
        global task_list
        task_list.extend(new_rows)
        
        # Save to CSV
        write_tasks_to_csv(task_list)
        
        # Return the same structure we had before on the front end
        return jsonify(ai_result)
    
    except Exception as e:
        print(f"Error generating tasks: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api-key', methods=['GET', 'POST'])
@login_required
def manage_api_key():
    """Handle API key management"""
    if request.method == 'GET':
        api_key = get_user_api_key(session['username'])
        return jsonify({'api_key': api_key})
    
    elif request.method == 'POST':
        data = request.json
        api_key = data.get('api_key', '').strip()
        if not api_key:
            return jsonify({'success': False, 'error': 'API key cannot be empty'})
        
        if update_user_api_key(session['username'], api_key):
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Failed to update API key'})

def generate_tasks_with_huggingface(context):
    """Generate tasks using Hugging Face API"""
    prompt = f"""You are an AI task decomposition assistant. Your job is to help users break down complex tasks into manageable sub-tasks and steps.

I need to break down this task into a structured format:

{context}

Please provide:
1. A clear main task title
2. A list of sub-tasks with estimated time
3. For each sub-task, provide concrete actionable steps
4. Suggest current emotions I might be feeling about this task
5. Suggest emotions I might feel upon completion

emotion_dict = (
    "Anger": ["Aggressive", "Frustrated", "Distant", "Critical", "Hateful", "Resentful"],
    "Disgust": ["Disapproval", "Disappointed", "Awful", "Avoidance", "Guilty"],
    "Sad": ["Guilty", "Abandoned", "Despair", "Depressed", "Bored"],
    "Happy": ["Optimistic", "Proud", "Joyful", "Interested", "Accepted"],
    "Surprise": ["Startled", "Confused", "Amazed", "Excited"],
    "Fear": ["Scared", "Anxious", "Insecure", "Rejected", "Helpless"],
). 

Format your response as a JSON object with the following structure:
{{
  "taskTitle": "Main task title",
  "totalTimeEstimate": "Total estimated time (e.g., '2 hours')",
  "currentEmotion": ["emotion1", "emotion2"],
  "completionEmotion": ["emotion1", "emotion2"],
  "subTasks": [
    {{
      "title": "Sub-task 1",
      "totalTimeEstimate": "Estimated time (e.g., '30 minutes')",
      "steps": [
        "Step 1 description",
        "Step 2 description"
      ]
    }}
  ]
}}"""

    try:
        # Get user's API key
        user_api_key = get_user_api_key(session['username'])
        
        # If user has no API key, use the default one from .env
        if not user_api_key:
            user_api_key = os.getenv("HUGGINGFACE_API_TOKEN")
            if not user_api_key:
                return generate_mock_tasks(context)
        
        # Initialize client with user's API key
        client = InferenceClient(token=user_api_key)
        
        try:
            # Use Mistral model
            model_id = "mistralai/Mistral-7B-Instruct-v0.2"
            response = client.text_generation(
                prompt,
                model=model_id,
                max_new_tokens=1024,
                temperature=0.7,
                return_full_text=False
            )
            result = response.strip()
            
            # Clean up the response to extract just the JSON part
            if "{" in result and "}" in result:
                json_start = result.find("{")
                json_end = result.rfind("}") + 1
                json_str = result[json_start:json_end]
                
                # Parse JSON
                try:
                    task_data = json.loads(json_str)
                    return task_data
                except json.JSONDecodeError as e:
                    print(f"JSON decode error: {e}")
                    return generate_mock_tasks(context)
            else:
                print("No valid JSON found in response")
                return generate_mock_tasks(context)
                
        except Exception as e:
            print(f"Error with Mistral model: {str(e)}")
            # If user's API key fails, try the default one
            if user_api_key != os.getenv("HUGGINGFACE_API_TOKEN"):
                print("Falling back to default API key")
                return generate_tasks_with_huggingface(context)
            return generate_mock_tasks(context)
            
    except Exception as e:
        print(f"Error generating tasks with Hugging Face: {e}")
        return generate_mock_tasks(context)

def generate_mock_tasks(context):
    """Generate mock tasks for testing"""
    # Create a simple task structure based on the context
    words = context.split()
    main_task = " ".join(words[:min(5, len(words))]) + " Task"
    
    return {
        "taskTitle": main_task,
        "subTasks": [
            {
                "title": f"Plan {main_task}",
                "steps": ["Research requirements", "Define scope", "Set timeline"]
            },
            {
                "title": f"Execute {main_task}",
                "steps": ["Complete first part", "Review progress", "Finish remaining items"]
            },
            {
                "title": f"Review {main_task}",
                "steps": ["Check for errors", "Get feedback", "Make final adjustments"]
            }
        ]
    }

@app.route('/tasks', methods=['GET'])
@login_required
def get_all_tasks():
    """Return all tasks from CSV so the front end can display them."""
    try:
        # Only load tasks for the current user
        tasks = load_tasks_from_csv(session.get('username'))
        return jsonify(tasks)
    except Exception as e:
        print(f"Error loading tasks: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/tasks/<int:task_id>/toggle', methods=['POST'])
@login_required
def toggle_task_completion(task_id):
    """Toggle completion on a specific task."""
    try:
        global task_list
        # Reload tasks to get the latest data
        task_list = load_tasks_from_csv()
        
        # Find the task and toggle its completion
        target_task = None
        for task in task_list:
            if task['id'] == task_id and task['username'] == session.get('username'):
                task['completed'] = not task['completed']
                target_task = task
                break
        
        if target_task:
            # If the task is now marked as complete and it's a subtask (level 1),
            # mark all its child tasks (micro tasks, level 2) as complete too
            if target_task['completed'] and target_task['level'] == 1:
                for child_task in task_list:
                    if child_task['parent_id'] == target_task['id'] and child_task['username'] == session.get('username'):
                        child_task['completed'] = True
        
        # Save changes back to CSV
        write_tasks_to_csv(task_list)
        
        return jsonify({"success": True})
    except Exception as e:
        print(f"Error toggling task: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/tasks/<int:task_id>/update', methods=['POST'])
@login_required
def update_task(task_id):
    """Update a task's text, emotion, or time estimate."""
    global task_list
    data = request.json
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    found = False
    for task in task_list:
        if task['id'] == task_id and task['username'] == session.get('username'):
            # Update fields if they exist in the request
            if 'text' in data:
                task['text'] = data['text']
            if 'currentEmotion' in data:
                task['currentEmotion'] = data['currentEmotion']
            if 'completionEmotion' in data:
                task['completionEmotion'] = data['completionEmotion']
            if 'totalTimeEstimate' in data:
                task['totalTimeEstimate'] = data['totalTimeEstimate']
            found = True
            break
    
    if not found:
        return jsonify({"error": "Task not found"}), 404
    
    write_tasks_to_csv(task_list)
    return jsonify({"success": True})

@app.route('/tasks/<int:task_id>', methods=['DELETE'])
@login_required
def delete_task(task_id):
    """Delete a task and all its sub-tasks recursively."""
    global task_list
    
    deletion_ids = set()
    def gather_children(tid):
        deletion_ids.add(tid)
        for t in task_list:
            if t['parent_id'] == tid and t['username'] == session.get('username'):
                gather_children(t['id'])
    gather_children(task_id)
    
    # Filter out the deleted tasks
    task_list = [t for t in task_list if t['id'] not in deletion_ids or t['username'] != session.get('username')]
    write_tasks_to_csv(task_list)
    return jsonify({"success": True})

@app.route('/tasks/<int:task_id>/stopwatch', methods=['POST'])
@login_required
def update_task_timer(task_id):
    """Start, stop, or reset the stopwatch for a task"""
    global task_list
    action = request.json.get('action', '')
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    found = False
    for task in task_list:
        if task['id'] == task_id and task['username'] == session.get('username'):
            if action == 'start':
                task['startTime'] = now
                task['endTime'] = ''
                found = True
            elif action == 'stop':
                if task['startTime']:  # Can only stop if there's a start time
                    task['endTime'] = now
                    
                    # Calculate time spent
                    if task['startTime'] and task['endTime']:
                        start = datetime.strptime(task['startTime'], "%Y-%m-%d %H:%M:%S")
                        end = datetime.strptime(task['endTime'], "%Y-%m-%d %H:%M:%S")
                        seconds_diff = int((end - start).total_seconds())
                        
                        # Add to existing time spent
                        existing_seconds = 0
                        if task['timeSpent']:
                            parts = task['timeSpent'].split(':')
                            if len(parts) == 3:
                                existing_seconds = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                        
                        total_seconds = existing_seconds + seconds_diff
                        hours = total_seconds // 3600
                        minutes = (total_seconds % 3600) // 60
                        seconds = total_seconds % 60
                        
                        task['timeSpent'] = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
                    found = True
            elif action == 'reset':
                task['startTime'] = ''
                task['endTime'] = ''
                task['timeSpent'] = ''
                found = True
            break
    
    if not found:
        return jsonify({"error": "Task not found or invalid action"}), 404
    
    write_tasks_to_csv(task_list)
    return jsonify({"success": True})

if __name__ == '__main__':
    app.run(debug=True, port=8083)