document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generate-btn');
    const taskContext = document.getElementById('task-context');
    const taskList = document.getElementById('task-list');
    const micBtn = document.getElementById('mic-btn');

    // Speech recognition setup
    let recognition = null;
    let isListening = false;

    // Initialize speech recognition if supported by the browser
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = function(event) {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            
            // Update the textarea with the recognized speech
            taskContext.value = transcript;
        };

        recognition.onend = function() {
            isListening = false;
            micBtn.classList.remove('listening');
            micBtn.textContent = '🎤';
        };

        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            isListening = false;
            micBtn.classList.remove('listening');
            micBtn.textContent = '🎤';
        };

        // Add click event listener to the microphone button
        micBtn.addEventListener('click', function() {
            if (isListening) {
                recognition.stop();
                isListening = false;
                micBtn.classList.remove('listening');
                micBtn.textContent = '🎤';
            } else {
                recognition.start();
                isListening = true;
                micBtn.classList.add('listening');
                micBtn.textContent = '🔴';
            }
        });
    } else {
        // Hide the microphone button if speech recognition is not supported
        micBtn.style.display = 'none';
        console.warn('Speech recognition is not supported in this browser.');
    }

    // Emotion wheel data structure
    const emotionWheel = {
        "Anger": {
            "hex": "#E63946",
            "sub_emotions": {
                "Aggressive": ["Provoked", "Hostile", "Inflated"],
                "Frustrated": ["Irritated", "Annoyed", "Exasperated"],
                "Distant": ["Withdrawn", "Suspicious", "Skeptical"],
                "Critical": ["Sarcastic", "Judgmental", "Cynical"],
                "Hateful": ["Violent", "Furious", "Enraged"],
                "Resentful": ["Jealous", "Bitter", "Irritated"],
            },
        },
        "Disgust": {
            "hex": "#8B5E83",
            "sub_emotions": {
                "Disapproval": ["Judgmental", "Skeptical", "Sarcastic"],
                "Disappointed": ["Awful", "Avoidance", "Aversion"],
                "Awful": ["Loathing", "Repugnant", "Revolted"],
                "Avoidance": ["Revulsion", "Detestable", "Distaste"],
                "Guilty": ["Ashamed", "Remorseful", "Regretful"],
            },
        },
        "Sad": {
            "hex": "#457B9D",
            "sub_emotions": {
                "Guilty": ["Ashamed", "Remorseful", "Regretful"],
                "Abandoned": ["Lonely", "Empty", "Isolated"],
                "Despair": ["Powerless", "Victimized", "Inferior"],
                "Depressed": ["Indifferent", "Apathetic", "Hopeless"],
                "Bored": ["Uninterested", "Aloof", "Detached"],
            },
        },
        "Happy": {
            "hex": "#F4A261",
            "sub_emotions": {
                "Optimistic": ["Hopeful", "Inspired", "Plentiful"],
                "Proud": ["Powerful", "Courageous", "Respected"],
                "Joyful": ["Excited", "Eager", "Liberated"],
                "Interested": ["Inquisitive", "Amused", "Curious"],
                "Accepted": ["Fulfilled", "Loved", "Content"],
            },
        },
        "Surprise": {
            "hex": "#2A9D8F",
            "sub_emotions": {
                "Startled": ["Shocked", "Dismayed", "Astonished"],
                "Confused": ["Disillusioned", "Perplexed", "Bewildered"],
                "Amazed": ["Awe", "Astonishment", "Speechless"],
                "Excited": ["Eager", "Energetic", "Enthusiastic"],
            },
        },
        "Fear": {
            "hex": "#2D6A4F",
            "sub_emotions": {
                "Scared": ["Frightened", "Terrified", "Worried"],
                "Anxious": ["Overwhelmed", "Nervous", "Panicked"],
                "Insecure": ["Inferior", "Worthless", "Self-doubting"],
                "Rejected": ["Submissive", "Humiliated", "Ridiculed"],
                "Helpless": ["Alienated", "Insignificant", "Disrespected"],
            },
        },
    };

    // Function to get color for a given emotion (from any level of the wheel)
    function getEmotionColor(emotion) {
        if (emotionWheel[emotion]) {
            return emotionWheel[emotion].hex;
        }
        for (const primary in emotionWheel) {
            if (emotionWheel[primary].sub_emotions[emotion]) {
                return emotionWheel[primary].hex;
            }
            for (const secondary in emotionWheel[primary].sub_emotions) {
                if (emotionWheel[primary].sub_emotions[secondary].includes(emotion)) {
                    return emotionWheel[primary].hex;
                }
            }
        }
        return "#999999";
    }

    // Function to parse emotions from a string (comma or space separated)
    function parseEmotions(emotionStr) {
        if (!emotionStr) return [];
        if (emotionStr.startsWith('[') && emotionStr.includes(']')) {
            try {
                return JSON.parse(emotionStr);
            } catch (e) {
                const content = emotionStr.substring(emotionStr.indexOf('[') + 1, emotionStr.lastIndexOf(']'));
                return content.split(',').map(e => e.trim().replace(/['"]/g, '')).filter(e => e);
            }
        }
        return emotionStr.split(/[,\s]+/).map(e => e.trim()).filter(e => e);
    }

    // Helper functions to parse and format time strings (HH:MM:SS)
    function parseTime(timeStr) {
        const parts = timeStr.split(':');
        if (parts.length !== 3) return 0;
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    function formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    // Calculate the sum of time estimates for an array of tasks
    function calculateTotalTimeEstimate(tasks) {
        let totalMinutes = 0;
        tasks.forEach(task => {
            const estimate = task.totalTimeEstimate;
            if (!estimate) return;
            const hoursMatch = estimate.match(/(\d+(\.\d+)?)\s*(hour|hr|h)s?/i);
            const minutesMatch = estimate.match(/(\d+)\s*(minute|min|m)s?/i);
            if (hoursMatch) {
                totalMinutes += parseFloat(hoursMatch[1]) * 60;
            }
            if (minutesMatch) {
                totalMinutes += parseInt(minutesMatch[1]);
            }
        });
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.round(totalMinutes % 60);
        if (hours === 0) return `${minutes}m`;
        else if (minutes === 0) return `${hours}h`;
        else return `${hours}h ${minutes}m`;
    }

    // Check if a task and all its children are completed
    function areAllTasksCompleted(allTasks, parentId) {
        const parent = allTasks.find(t => t.id === parentId);
        if (!parent || !parent.completed) return false;
        const children = allTasks.filter(t => t.parent_id === parentId);
        if (children.length === 0) return true;
        return children.every(child => areAllTasksCompleted(allTasks, child.id));
    }

    // Check if all sub-tasks are completed for a main task
    function areAllSubtasksCompleted(allTasks, mainTaskId) {
        const children = allTasks.filter(t => t.parent_id === mainTaskId);
        if (children.length === 0) return false;
        return children.every(child => areAllTasksCompleted(allTasks, child.id));
    }

    // Fetch tasks and group by creation date
    function loadTasks() {
        fetch('/tasks')
            .then(res => {
                if (res.redirected) {
                    // If we're redirected, it's likely to the login page
                    window.location.href = res.url;
                    return;
                }
                return res.json();
            })
            .then(data => {
                if (!data) return; // Handle case where we were redirected
                
                taskList.innerHTML = '';
                let groups = {};
                data.forEach(task => {
                    let dateStr = task.createdAt ? task.createdAt.split(' ')[0] : 'No Date';
                    if (!groups[dateStr]) groups[dateStr] = [];
                    groups[dateStr].push(task);
                });
                // Sort dates ascending (oldest first)
                Object.keys(groups).sort((a, b) => new Date(a) - new Date(b)).forEach(date => {
                    const rootTasks = groups[date].filter(task => task.level === 0);
                    const totalTimeEstimate = calculateTotalTimeEstimate(rootTasks);
                    let dateHeading = document.createElement('h3');
                    dateHeading.className = 'date-heading';
                    const dateText = document.createElement('span');
                    dateText.textContent = formatDate(date);
                    const totalTime = document.createElement('span');
                    totalTime.className = 'date-total-time';
                    totalTime.textContent = totalTimeEstimate;
                    dateHeading.appendChild(dateText);
                    dateHeading.appendChild(totalTime);
                    taskList.appendChild(dateHeading);
                    // Sort root tasks: incomplete first, then completed
                    rootTasks.sort((a, b) => {
                        if (a.completed === b.completed) return 0;
                        return a.completed ? 1 : -1;
                    });
                    rootTasks.forEach(rootTask => {
                        const taskGroup = document.createElement('div');
                        taskGroup.className = 'task-group';
                        taskGroup.dataset.taskId = rootTask.id;
                        
                        const allSubtasksComplete = areAllSubtasksCompleted(groups[date], rootTask.id);
                        const taskElement = createTaskElement(
                            rootTask.text, 
                            rootTask.level, 
                            rootTask.id, 
                            rootTask.completed, 
                            rootTask.currentEmotion, 
                            rootTask.completionEmotion, 
                            rootTask.totalTimeEstimate, 
                            rootTask.startTime, 
                            rootTask.endTime, 
                            rootTask.timeSpent, 
                            allSubtasksComplete
                        );
                        
                        // Create container for child tasks
                        const childTasksContainer = document.createElement('div');
                        childTasksContainer.className = 'child-tasks';
                        
                        taskGroup.appendChild(taskElement);
                        
                        // If the main task and all its subtasks are completed, collapse by default
                        if (allSubtasksComplete && rootTask.completed) {
                            taskGroup.classList.add('collapsed');
                            taskElement.classList.add('collapsed');
                            childTasksContainer.style.display = 'none';
                            // We'll use CSS to control the display of emotions properly
                        }
                        
                        // Add collapse toggle arrow to the main task
                        const collapseToggle = document.createElement('span');
                        collapseToggle.className = 'collapse-toggle';
                        collapseToggle.addEventListener('click', function(e) {
                            e.stopPropagation();
                            // Toggle collapsed class on both the container and the main task element
                            taskGroup.classList.toggle('collapsed');
                            taskElement.classList.toggle('collapsed');
                            // Manually hide/show the child tasks container
                            if (taskGroup.classList.contains('collapsed')) {
                                childTasksContainer.style.display = 'none';
                                // We'll use CSS to control the display of emotions properly
                            } else {
                                childTasksContainer.style.display = 'block';
                                // We'll use CSS to control the display of emotions properly
                            }
                        });
                        taskElement.querySelector('.task-text-container').appendChild(collapseToggle);
                        
                        addChildTasks(groups[date], rootTask.id, 1, childTasksContainer);
                        taskGroup.appendChild(childTasksContainer);
                        taskList.appendChild(taskGroup);
                    });
                });
                if (Object.keys(groups).length > 0) {
                    taskList.scrollTop = taskList.scrollHeight;
                }
            })
            .catch(err => {
                console.error('Error loading tasks:', err);
            });
    }

    // Format date to be more readable
    function formatDate(dateStr) {
        if (dateStr === 'No Date') return dateStr;
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        if (isSameDay(date, today)) {
            return 'Today';
        } else if (isSameDay(date, yesterday)) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString(undefined, { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
            });
        }
    }

    function isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }

    // Recursively add child tasks to a container
    function addChildTasks(allTasks, parentId, level, container) {
        const children = allTasks.filter(task => task.parent_id === parentId)
            .sort((a, b) => {
                if (a.completed === b.completed) return 0;
                return a.completed ? 1 : -1;
            });
        children.forEach(child => {
            const taskElement = createTaskElement(
                child.text, 
                child.level, 
                child.id, 
                child.completed, 
                child.currentEmotion, 
                child.completionEmotion, 
                child.totalTimeEstimate, 
                child.startTime, 
                child.endTime, 
                child.timeSpent, 
                false
            );
            container.appendChild(taskElement);
            const grandchildren = allTasks.filter(task => task.parent_id === child.id);
            if (grandchildren.length > 0) {
                const childContainer = document.createElement('div');
                childContainer.className = 'child-tasks';
                addChildTasks(allTasks, child.id, level + 1, childContainer);
                container.appendChild(childContainer);
            }
        });
    }

    // Theme toggle
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDarkMode);
            themeToggleBtn.textContent = isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
        });
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            themeToggleBtn.textContent = '☀️ Light Mode';
        }
    }

    // Inline edit autosave helper
    function saveTaskUpdate(taskId, newText, newEmotion, newTimeEstimate) {
        const updateData = {};
        if (newText !== undefined) updateData.text = newText;
        if (newEmotion !== undefined) updateData.currentEmotion = newEmotion;
        if (newTimeEstimate !== undefined) updateData.totalTimeEstimate = newTimeEstimate;
        
        fetch(`/tasks/${taskId}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        })
        .then(res => {
            if (res.redirected) {
                window.location.href = res.url;
                return;
            }
            return res.json();
        })
        .then(data => {
            if (!data) return; // Handle case where we were redirected
            if (data.error) {
                console.error('Error updating task:', data.error);
            }
        })
        .catch(err => {
            console.error('Error updating task:', err);
        });
    }

    // Updated helper to create a task element with extra features
    function createTaskElement(text, level, taskId, completed, currentEmotion, completionEmotion, totalTimeEstimate, startTime, endTime, timeSpent, allSubtasksComplete) {
        const element = document.createElement('div');
        element.className = 'task-item';
        element.dataset.taskId = taskId;
        if (level > 0) {
            element.classList.add(`level-${level}`);
            element.style.paddingLeft = `${level * 30}px`;
        }
        
        // Circle for toggling completion
        const circle = document.createElement('span');
        circle.className = 'circle';
        if (completed) {
            circle.classList.add('completed');
            element.classList.add('task-completed');
        }
        circle.addEventListener('click', function(e) {
            e.stopPropagation();
            fetch(`/tasks/${taskId}/toggle`, { method: 'POST' })
                .then(r => r.json())
                .then(resp => {
                    if (resp.success) {
                        circle.classList.toggle('completed');
                        element.classList.toggle('task-completed');
                        loadTasks();
                    }
                })
                .catch(err => console.error(err));
        });
        
        // Container for task text and additional info
        const textContainer = document.createElement('div');
        textContainer.className = 'task-text-container';
        
        const textSpan = document.createElement('span');
        textSpan.className = 'task-text';
        textSpan.textContent = text;
        textSpan.contentEditable = true;
        
        // Append time estimate if available
        if (totalTimeEstimate) {
            const timeEstimateSpan = document.createElement('span');
            timeEstimateSpan.className = 'time-estimate';
            timeEstimateSpan.textContent = ` [${totalTimeEstimate}]`;
            textSpan.appendChild(timeEstimateSpan);
        }
        
        textContainer.appendChild(textSpan);
        
        // For main tasks, add emotion info and stopwatch controls
        if (level === 0) {
            // Emotion Section
            const emotionSection = document.createElement('div');
            emotionSection.className = 'emotion-section';
            if (currentEmotion) {
                const currentDiv = document.createElement('div');
                currentDiv.className = 'current-emotion';
                const label = document.createElement('span');
                label.className = 'emotion-label';
                label.textContent = 'Current Emotion:';
                currentDiv.appendChild(label);
                const emotions = parseEmotions(currentEmotion);
                emotions.forEach(em => {
                    if (em.trim()) {
                        const box = createEmotionBox(em.trim());
                        currentDiv.appendChild(box);
                    }
                });
                emotionSection.appendChild(currentDiv);
            }
            if (completionEmotion) {
                const completionDiv = document.createElement('div');
                completionDiv.className = 'completion-emotion';
                const label = document.createElement('span');
                label.className = 'emotion-label';
                label.textContent = 'Completion Emotion:';
                completionDiv.appendChild(label);
                const emotions = parseEmotions(completionEmotion);
                emotions.forEach(em => {
                    if (em.trim()) {
                        const box = createEmotionBox(em.trim());
                        completionDiv.appendChild(box);
                    }
                });
                emotionSection.appendChild(completionDiv);
            }
            textContainer.appendChild(emotionSection);
            
            // Stopwatch Controls
            const stopwatchDiv = document.createElement('div');
            stopwatchDiv.className = 'stopwatch-controls';
            const timerDisplay = document.createElement('span');
            timerDisplay.className = 'timer-display';
            timerDisplay.textContent = timeSpent ? timeSpent : "00:00:00";
            stopwatchDiv.appendChild(timerDisplay);
            
            const startBtn = document.createElement('button');
            startBtn.className = 'timer-btn start-btn';
            startBtn.textContent = 'Start';
            const stopBtn = document.createElement('button');
            stopBtn.className = 'timer-btn stop-btn';
            stopBtn.textContent = 'Stop';
            const resetBtn = document.createElement('button');
            resetBtn.className = 'timer-btn reset-btn';
            resetBtn.textContent = 'Reset';
            stopwatchDiv.appendChild(startBtn);
            stopwatchDiv.appendChild(stopBtn);
            stopwatchDiv.appendChild(resetBtn);
            textContainer.appendChild(stopwatchDiv);
            
            stopBtn.disabled = true;
            let timerInterval = null;
            let startTimestamp = null;
            let accumulatedSeconds = timeSpent ? parseTime(timeSpent) : 0;
            
            startBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                fetch(`/tasks/${taskId}/stopwatch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'start' })
                }).then(response => response.json())
                  .then(data => {
                      if (data.success) {
                          startTimestamp = Date.now();
                          timerInterval = setInterval(() => {
                              let elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
                              timerDisplay.textContent = formatTime(accumulatedSeconds + elapsed);
                          }, 1000);
                          startBtn.disabled = true;
                          stopBtn.disabled = false;
                      }
                  }).catch(err => console.error(err));
            });
            
            stopBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                }
                fetch(`/tasks/${taskId}/stopwatch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'stop' })
                }).then(response => response.json())
                  .then(data => {
                      if (data.success) {
                          timerDisplay.textContent = data.task.timeSpent ? data.task.timeSpent : formatTime(accumulatedSeconds);
                          accumulatedSeconds = parseTime(timerDisplay.textContent);
                          startBtn.disabled = false;
                          stopBtn.disabled = true;
                      }
                  }).catch(err => console.error(err));
            });
            
            resetBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                }
                fetch(`/tasks/${taskId}/stopwatch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'reset' })
                }).then(response => response.json())
                  .then(data => {
                      if (data.success) {
                          timerDisplay.textContent = "00:00:00";
                          accumulatedSeconds = 0;
                          startBtn.disabled = false;
                          stopBtn.disabled = true;
                      }
                  }).catch(err => console.error(err));
            });
        }
        
        element.appendChild(circle);
        element.appendChild(textContainer);
        
        // Delete button for main tasks
        if (level === 0) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '✖';
            deleteBtn.style.color = 'red';
            deleteBtn.style.border = 'none';
            deleteBtn.style.background = 'transparent';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.float = 'right';
            element.appendChild(deleteBtn);
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this task and all its sub-tasks?')) {
                    fetch(`/tasks/${taskId}`, { method: 'DELETE' })
                        .then(r => r.json())
                        .then(resp => {
                            if (resp.success) {
                                loadTasks();
                            }
                        })
                        .catch(err => console.error(err));
                }
            });
        }
        
        // Autosave inline editing using debounce
        let autosaveTimeout = null;
        textSpan.addEventListener('input', function() {
            if (autosaveTimeout) clearTimeout(autosaveTimeout);
            autosaveTimeout = setTimeout(() => {
                const newText = textSpan.innerText.trim();
                if (newText && newText !== text) {
                    fetch(`/tasks/${taskId}/update`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: newText })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            console.log("Task updated");
                        } else {
                            console.error("Update failed");
                        }
                    })
                    .catch(err => console.error('Error updating task:', err));
                }
            }, 800);
        });
        
        return element;
    }
    
    // Helper to create an emotion box element
    function createEmotionBox(emotion) {
        const emotionBox = document.createElement('span');
        emotionBox.className = 'emotion-box';
        emotionBox.style.backgroundColor = getEmotionColor(emotion);
        emotionBox.textContent = emotion;
        return emotionBox;
    }
    
    // Add event listener for the generate button
    if (generateBtn) {
        generateBtn.addEventListener('click', function() {
            const context = taskContext.value.trim();
            if (!context) {
                alert('Please enter a task description');
                return;
            }
            
            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';
            
            fetch('/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ context })
            })
            .then(res => {
                if (res.redirected) {
                    window.location.href = res.url;
                    return;
                }
                return res.json();
            })
            .then(data => {
                if (!data) return; // Handle case where we were redirected
                
                if (data.error) {
                    alert('Error: ' + data.error);
                } else {
                    taskContext.value = '';
                    loadTasks();
                }
                
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Tasks';
            })
            .catch(err => {
                console.error('Error generating tasks:', err);
                alert('An error occurred while generating tasks. Please try again.');
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Tasks';
            });
        });
    }
    
    // Add event delegation for task actions
    taskList.addEventListener('click', function(e) {
        // Handle checkbox clicks
        if (e.target.classList.contains('task-checkbox')) {
            const taskId = parseInt(e.target.dataset.taskId);
            
            fetch(`/tasks/${taskId}/toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(res => {
                if (res.redirected) {
                    window.location.href = res.url;
                    return;
                }
                return res.json();
            })
            .then(data => {
                if (!data) return; // Handle case where we were redirected
                
                if (data.error) {
                    console.error('Error toggling task:', data.error);
                } else {
                    // Update UI
                    const taskElement = e.target.closest('.task-item');
                    if (taskElement) {
                        taskElement.classList.toggle('completed');
                    }
                }
            })
            .catch(err => {
                console.error('Error toggling task:', err);
            });
        }
        
        // Handle delete button clicks
        if (e.target.classList.contains('task-delete')) {
            if (!confirm('Are you sure you want to delete this task and all its subtasks?')) {
                return;
            }
            
            const taskId = parseInt(e.target.dataset.taskId);
            
            fetch(`/tasks/${taskId}`, {
                method: 'DELETE'
            })
            .then(res => {
                if (res.redirected) {
                    window.location.href = res.url;
                    return;
                }
                return res.json();
            })
            .then(data => {
                if (!data) return; // Handle case where we were redirected
                
                if (data.error) {
                    console.error('Error deleting task:', data.error);
                } else {
                    // Remove the task from the UI
                    const taskElement = e.target.closest('.task-group, .task-item');
                    if (taskElement) {
                        taskElement.remove();
                    }
                }
            })
            .catch(err => {
                console.error('Error deleting task:', err);
            });
        }
        
        // Handle timer buttons
        if (e.target.classList.contains('timer-btn')) {
            const action = e.target.dataset.action;
            const taskId = parseInt(e.target.dataset.taskId);
            
            fetch(`/tasks/${taskId}/stopwatch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action })
            })
            .then(res => {
                if (res.redirected) {
                    window.location.href = res.url;
                    return;
                }
                return res.json();
            })
            .then(data => {
                if (!data) return; // Handle case where we were redirected
                
                if (data.error) {
                    console.error('Error updating timer:', data.error);
                } else {
                    // Update UI based on action
                    const timerDisplay = e.target.closest('.task-item').querySelector('.timer-display');
                    if (action === 'start') {
                        e.target.textContent = '⏹️';
                        e.target.dataset.action = 'stop';
                        if (timerDisplay) {
                            timerDisplay.classList.add('running');
                        }
                    } else if (action === 'stop') {
                        e.target.textContent = '▶️';
                        e.target.dataset.action = 'start';
                        if (timerDisplay) {
                            timerDisplay.classList.remove('running');
                            // Reload tasks to get updated time
                            loadTasks();
                        }
                    } else if (action === 'reset') {
                        if (timerDisplay) {
                            timerDisplay.textContent = '00:00:00';
                            timerDisplay.classList.remove('running');
                        }
                        // Reset the start button too
                        const startBtn = e.target.previousElementSibling;
                        if (startBtn && startBtn.classList.contains('timer-btn')) {
                            startBtn.textContent = '▶️';
                            startBtn.dataset.action = 'start';
                        }
                    }
                }
            })
            .catch(err => {
                console.error('Error updating timer:', err);
            });
        }
    });
    
    // API Key Management
    const apiKeyInput = document.getElementById('api-key-input');
    const saveApiKeyBtn = document.getElementById('save-api-key');
    const apiKeyHelpBtn = document.getElementById('api-key-help');
    const apiKeyModal = document.getElementById('api-key-modal');
    const closeModalBtn = document.querySelector('.close');

    // Load existing API key if any
    fetch('/api-key')
        .then(res => res.json())
        .then(data => {
            if (data.api_key) {
                apiKeyInput.value = data.api_key;
            }
        })
        .catch(err => console.error('Error loading API key:', err));

    // Save API key
    saveApiKeyBtn.addEventListener('click', function() {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert('Please enter an API key');
            return;
        }

        fetch('/api-key', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ api_key: apiKey })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('API key saved successfully!');
            } else {
                alert('Error saving API key: ' + data.error);
            }
        })
        .catch(err => {
            console.error('Error saving API key:', err);
            alert('Error saving API key. Please try again.');
        });
    });

    // Show help modal
    apiKeyHelpBtn.addEventListener('click', function() {
        apiKeyModal.style.display = 'block';
    });

    // Close modal
    closeModalBtn.addEventListener('click', function() {
        apiKeyModal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target == apiKeyModal) {
            apiKeyModal.style.display = 'none';
        }
    });
    
    loadTasks();
});
