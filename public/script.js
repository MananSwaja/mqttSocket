 









        // Connect to the same origin that served this page (no hard-coded port).
const socket = io("https://mqtt-socket-backend.onrender.com");



             

        let connectBtn, disconnectBtn, sub_btn, unsub_btn, submit, clearCommand, upload;
        let connectionStatus, subscriptionStatus, chatBox, emptyChatState;
        let messageCount = 0;
        let connectionStartTime = null;
        
        // Chat management
        let chatHistory = [];
        const MAX_MESSAGES = 1000; // Limit stored messages to prevent memory issues


  
































        



        // Load saved data on page load
        document.addEventListener("DOMContentLoaded", async() => {
            initializeElements();
             loadSavedCredentials();
            loadChatHistory();
            setupEventListeners();
            updateChatStats();
            loadProfileList();
            
            

    //      // Load profile list on startup
    //     const lastProfileId = await getLastSelectedProfile();
    // if (lastProfileId) {
    //     const profile = await getProfileById(lastProfileId);
    //     if (profile) {
    //         loadProfileToUI(profile); // your function to set UI fields
    //     }
    // }
    






 document.getElementById("saveProfileBtn").addEventListener("click", saveProfile);
    document.getElementById("loadProfileBtn").addEventListener("click", loadProfile);
    document.getElementById("deleteProfileBtn").addEventListener("click", deleteProfile);






           
    // Function to update visibility based on command type
    function updateCommandInputVisibility() {
        const commandTypeDropdown = document.getElementById("commandType");
        const commandType = commandTypeDropdown.value;

        // Hide all command input sections
        document.getElementById("shortCommandInputs").style.display = "none";
        document.getElementById("longCommandInputs").style.display = "none";
        document.getElementById("stringCommandInput").style.display = "none";

        // Show the selected command input section
        if (commandType === "1") {
            document.getElementById("shortCommandInputs").style.display = "block";
        } else if (commandType === "2") {
            document.getElementById("longCommandInputs").style.display = "block";
        } else if (commandType === "3") {
            document.getElementById("stringCommandInput").style.display = "block";
        }
    }

    // Set the default command type and hide other input sections
    const defaultCommandType = '1'; // Set your default command type here
    const commandTypeDropdown = document.getElementById("commandType");
    commandTypeDropdown.value = defaultCommandType;

    // Call the function to set the initial visibility
    updateCommandInputVisibility();

    // Add event listener for command type dropdown
    commandTypeDropdown.addEventListener("change", updateCommandInputVisibility);

    // Request message history from server on connect
    socket.emit('requestMessageHistory');
        });

        function initializeElements() {
            connectBtn = document.getElementById("connectBtn");
            disconnectBtn = document.getElementById("disconnectBtn");
            sub_btn = document.getElementById("sub_btn");
            unsub_btn = document.getElementById("unsub_btn");
            submit = document.getElementById("submit");
            clearCommand = document.getElementById("clearCommand");
            upload = document.getElementById("uploadBtn");
            connectionStatus = document.getElementById("connectionStatus");
            subscriptionStatus = document.getElementById("subscriptionStatus");
            chatBox = document.getElementById("chatBox");
            emptyChatState = document.getElementById("emptyChatState");


}




        

        // Chat History Management
        function saveChatHistory() {
            try {
                const historyToSave = chatHistory.slice(-MAX_MESSAGES);
                localStorage.setItem('mqttChatHistory', JSON.stringify(historyToSave));
            } catch (error) {
                console.error('Failed to save chat history:', error);
            }
        }

        function loadChatHistory() {
            try {
                const saved = localStorage.getItem('mqttChatHistory');
                if (saved) {
                    chatHistory = JSON.parse(saved);
                    chatHistory.forEach(msg => {
                        displayMessage(msg.sender, msg.message, msg.timestamp, false);
                    });
                    updateMessageCount();
                }
            } catch (error) {
                console.error('Failed to load chat history:', error);
                chatHistory = [];
            }
        }

        function clearChatHistory() {
            chatHistory = [];
            localStorage.removeItem('mqttChatHistory');
            chatBox.innerHTML = '';
            chatBox.appendChild(emptyChatState);
            messageCount = 0;
            updateChatStats();
        }

        function exportChatHistory() {
            if (chatHistory.length === 0) {
                showToast('No messages to export.', 'warning');
                return;
            }
            
            const exportData = chatHistory.map(msg => 
                `[${msg.timestamp}] ${msg.sender}: ${msg.message}`
            ).join('\n');
            
            const blob = new Blob([exportData], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mqtt_chat_${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function loadSavedCredentials() {
            const savedCredentials = localStorage.getItem('mqttCredentials');
            if (savedCredentials) {
                const credentials = JSON.parse(savedCredentials);
                
                const fields = ['protocol', 'ip', 'port', 'mqttid', 'password', 'publishTopic', 'subscribeTopic'];
                fields.forEach(field => {
                    const element = document.getElementById(field);
                    if (element && credentials[field]) {
                        element.value = credentials[field];
                        element.classList.add('saved');
                    }
                });
            }
        }

        function saveCredentials() {
            const credentials = {
                protocol: document.getElementById("protocol").value,
                ip: document.getElementById("ip").value,
                port: document.getElementById("port").value,
                mqttid: document.getElementById("mqttid").value,
                password: document.getElementById("password").value,
                publishTopic: document.getElementById("publishTopic").value,
                subscribeTopic: document.getElementById("subscribeTopic").value
            };
            
            localStorage.setItem('mqttCredentials', JSON.stringify(credentials));
            
            // Visual feedback
            const saveBtn = document.getElementById("saveCredentials");
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<div class="loading"></div> Saving...';
            saveBtn.disabled = true;
            
            setTimeout(() => {
                saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
                saveBtn.classList.remove('btn-secondary');
                saveBtn.classList.add('btn-success');
                
                setTimeout(() => {
                    saveBtn.innerHTML = originalText;
                    saveBtn.classList.remove('btn-success');
                    saveBtn.classList.add('btn-secondary');
                    saveBtn.disabled = false;
                }, 1000);
            }, 500);
        }

        function updateChatStats() {
            document.getElementById('messageCount').textContent = messageCount;
            
            if (connectionStartTime) {
                const elapsed = Math.floor((Date.now() - connectionStartTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                document.getElementById('connectionTime').textContent = 
                    `${minutes}:${seconds.toString().padStart(2, '0')}`;
            } else {
                document.getElementById('connectionTime').textContent = '--';
            }
        }

        function updateMessageCount() {
            messageCount = chatHistory.length;
            updateChatStats();
        }

        setInterval(updateChatStats, 1000);

        function setupEventListeners() {
            // Clear chat button
            document.getElementById("clearChatBtn").addEventListener("click", () => {
                if (confirm('Are you sure you want to clear all messages?')) {
                    clearChatHistory();
                }
            });











            // Export chat button
            document.getElementById("exportChatBtn").addEventListener("click", exportChatHistory);

            // Theme toggle
            const themeBtn = document.getElementById("themeToggleBtn");
            const syncThemeIcon = () => {
                const isDark = document.documentElement.getAttribute("data-theme") === "dark";
                const icon = themeBtn.querySelector("i");
                icon.classList.toggle("fa-moon", !isDark);
                icon.classList.toggle("fa-sun", isDark);
            };
            syncThemeIcon();
            themeBtn.addEventListener("click", () => {
                const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
                document.documentElement.setAttribute("data-theme", next);
                try { localStorage.setItem("theme", next); } catch (e) {}
                syncThemeIcon();
            });

            // ── Tab navigation ──────────────────────────────────
            const tabBtns = document.querySelectorAll(".tab-btn");
            const tabPanels = document.querySelectorAll(".tab-panel");
            const savedTab = (() => { try { return localStorage.getItem("activeTab"); } catch(e){} })();
            const activateTab = (id) => {
                tabBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === id));
                tabPanels.forEach(p => p.classList.toggle("active", p.id === `tab-${id}`));
                try { localStorage.setItem("activeTab", id); } catch(e) {}
            };
            tabBtns.forEach(btn => btn.addEventListener("click", () => activateTab(btn.dataset.tab)));
            if (savedTab) activateTab(savedTab);

            // ── Command type pill switcher ──────────────────────
            const cmdTypeBtns = document.querySelectorAll(".cmd-type-btn");
            const cmdTypeSelect = document.getElementById("commandType");
            cmdTypeBtns.forEach(btn => {
                btn.addEventListener("click", () => {
                    cmdTypeBtns.forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    cmdTypeSelect.value = btn.dataset.cmd;
                    cmdTypeSelect.dispatchEvent(new Event("change"));
                });
            });

            // ── Send command button ─────────────────────────────
            document.getElementById("sendCommandBtn").addEventListener("click", buildAndSendCommand);

            // Save credentials button
            document.getElementById("saveCredentials").addEventListener("click", saveCredentials);

            // Connect button
            if (connectBtn) {
                connectBtn.addEventListener("click", () => {
                    const mqttData = {
                        protocol: document.getElementById("protocol").value,
                        ip: document.getElementById("ip").value,
                        port: document.getElementById("port").value,
                        mqttid: document.getElementById("mqttid").value,
                        password: document.getElementById("password").value
                    };
                    
                    connectBtn.innerHTML = '<div class="loading"></div> Connecting...';
                    connectBtn.disabled = true;
                    
                    socket.emit("mqttData", mqttData);
                });
            }

            // Disconnect button
            if (disconnectBtn) {
                disconnectBtn.addEventListener("click", () => {
                    socket.emit("clientEnd");
                    connectionStartTime = null;
                    console.log("disconnecting");
                });
            }

            // Subscribe button
            if (sub_btn) {
                sub_btn.addEventListener("click", () => {
                    const topic2 = document.getElementById("subscribeTopic").value;
                    if (topic2.trim()) {
                        console.log(topic2);
                        socket.emit("SubscribeTopic", topic2);
                        sub_btn.innerHTML = '<div class="loading"></div> Subscribing...';
                        sub_btn.disabled = true;
                    } else {
                        showToast("Please enter a topic to subscribe to.", "warning");
                    }
                });
            }

            // Unsubscribe button
            if (unsub_btn) {
                unsub_btn.addEventListener("click", () => {
                    const topic2 = document.getElementById("subscribeTopic").value;
                    if (topic2.trim()) {
                        console.log(topic2);
                        socket.emit("unSubscribeTopic", topic2);
                    } else {
                        showToast("Please enter a topic to unsubscribe from.", "warning");
                    }
                });
            }

            // Submit topic button
            if (submit) {
                submit.addEventListener("click", () => {
                    const topic1 = document.getElementById("publishTopic").value;
                    if (topic1.trim()) {
                        localStorage.setItem("publishTopic", topic1);
                        submit.innerHTML = '<i class="fas fa-check"></i> Topic Set!';
                        submit.classList.remove('btn-success');
                        submit.classList.add('btn-primary');
                        
                        setTimeout(() => {
                            submit.innerHTML = '<i class="fas fa-check"></i> Set Topic';
                            submit.classList.remove('btn-primary');
                            submit.classList.add('btn-success');
                        }, 1000);
                    } else {
                        showToast("Please enter a publishing topic.", "warning");
                    }
                });
            }

            // Clear command button
            if (clearCommand) {
                clearCommand.addEventListener("click", () => {

                    const commandType = document.getElementById("commandType").value;
                    if (commandType === "1") { // Short Command
                 document.getElementById("controlNode").value = "";
                 document.getElementById("elementId").value = "";
                 document.getElementById("deviceCommand").value = "";
                 document.getElementById("commandData").value = "";


            } else if (commandType === "2") { // Long Command
                  document.getElementById("longControlNode").value = "";
                document.getElementById("longelementid").value = "";
                document.getElementById("longoperation").value = "";
                 document.getElementById("longspeed1").value = "";
                document.getElementById("longdelay1").value = "";
                document.getElementById("longspeed2").value = "";
                 document.getElementById("longdelay2").value = "";
                 document.getElementById("longspeed3").value = "";

                

            } else if (commandType === "3") { // String Command
               


                document.getElementById("stringCommand").value = "";
            }
                });
            }

            // Upload button
            if (upload) {
                upload.addEventListener("click", () => {
                    const fileInput = document.getElementById('fileInput');
                    if (fileInput.files.length === 0) {
                        showToast('Please select a file to upload.', 'warning');
                        return;
                    }

                    const file = fileInput.files[0];
                    const formData = new FormData();
                    formData.append('file', file);

                    upload.innerHTML = '<div class="loading"></div> Uploading...';
                    upload.disabled = true;

                    fetch('/upload', {
                        method: 'POST',
                        body: formData,
                    })
                    .then((response) => {
                        if (response.ok) {
                            upload.innerHTML = '<i class="fas fa-check"></i> Uploaded!';
                            upload.classList.remove('btn-primary');
                            upload.classList.add('btn-success');
                        } else {
                            upload.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed';
                            upload.classList.remove('btn-primary');
                            upload.classList.add('btn-error');
                        }
                    })
                    .catch((error) => {
                        console.error('Error uploading file:', error);
                        upload.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                        upload.classList.remove('btn-primary');
                        upload.classList.add('btn-error');
                    })
                    .finally(() => {
                        setTimeout(() => {
                            upload.innerHTML = '<i class="fas fa-upload"></i> Process File';
                            upload.className = 'btn btn-primary';
                            upload.disabled = false;
                        }, 2000);
                    });
                });
            }

            // File input change handler
            document.getElementById('fileInput').addEventListener('change', function() {
                const label = document.querySelector('.file-upload-label span');
                if (this.files.length > 0) {
                    label.textContent = `Selected: ${this.files[0].name}`;
                } else {
                    label.textContent = 'Upload Excel file';
                }
            });

            // Command input handlers for Enter key
            document.querySelectorAll("#controlNode, #elementId, #deviceCommand, #commandData, #longControlNode,#longelementid,#longoperation,#longspeed1,#longdelay1,#longspeed2,#longdelay2,#longspeed3, #stringCommand").forEach(input => {
                input.addEventListener("keypress", function(event) {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        buildAndSendCommand();
                    }
                });
            });


            // Tab navigation for inputs
            const inputs = document.querySelectorAll('input');
            inputs.forEach((input, index) => {
                input.addEventListener('keydown', (event) => {
                    if (event.key === 'Tab') {
                        event.preventDefault();
                        const nextInput = inputs[index + 1];
                        if (nextInput) {
                            nextInput.focus();
                        } else {
                            console.log('Last input field reached.');
                        }
                    }
                });
            });
        }

        // Socket event handlers
        socket.on("message", ({topic, message2}) => {
            console.log(`${message2} received on ${topic}`);
            appendMessage("Broker", message2);
        });

        socket.on("messageHistory", (messages) => {
            // Clear existing history and load from server
            chatHistory = [];
            chatBox.innerHTML = '';
            
            if (messages && messages.length > 0) {
                messages.forEach(msg => {
                    displayMessage(msg.sender, msg.message, msg.timestamp, false);
                    chatHistory.push(msg);
                });
                updateMessageCount();
            } else {
                chatBox.appendChild(emptyChatState);
            }
        });

        socket.on("sheetdata", (result) => {
            if (!result) {
                console.log("No file selected.");
                return;
            }

            let fileData = result.commands;
            let delay = result.delays;

            if (delay) {
                executeCommandsWithDelay(fileData, delay);
            } else {
                console.log("Please enter the delay time");
                return;
            }
        });

        socket.on("connectionstatus", data => {
            if (data.mqttstatus === 'connected') {
                connectBtn.innerHTML = '<i class="fas fa-check"></i> Connected';
                connectBtn.classList.remove('btn-primary');
                connectBtn.classList.add('btn-success');
                connectBtn.disabled = false;
                connectionStartTime = Date.now();
                
                connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Connected';
                connectionStatus.className = 'status-indicator status-connected';
                
                // Request message history when connected
                socket.emit('requestMessageHistory');
            }
            if (data.mqttstatus === 'disconnected') {
                connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
                connectBtn.className = 'btn btn-primary';
                connectBtn.disabled = false;
                connectionStartTime = null;
                
                connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
                connectionStatus.className = 'status-indicator status-disconnected';
            }
        });

        socket.on("subscribestatus", data => {
            if (data.status === 'subscribed') {
                sub_btn.innerHTML = '<i class="fas fa-check"></i> Subscribed';
                sub_btn.classList.remove('btn-primary');
                sub_btn.classList.add('btn-success');
                sub_btn.disabled = false;
                
                subscriptionStatus.innerHTML = '<i class="fas fa-circle"></i> Subscribed';
                subscriptionStatus.className = 'status-indicator status-subscribed';
            }
            if (data.status === 'unsubscribed') {
                sub_btn.innerHTML = '<i class="fas fa-bell"></i> Subscribe';
                sub_btn.className = 'btn btn-primary';
                sub_btn.disabled = false;
                
                subscriptionStatus.innerHTML = '<i class="fas fa-circle"></i> Not Subscribed';
                subscriptionStatus.className = 'status-indicator status-disconnected';
            }
        });

        // Build command from current inputs and send it
        function buildAndSendCommand() {
            const commandType = document.getElementById("commandType").value;
            let mergedCommand;

            if (commandType === "1") {
                const controlNode = document.getElementById("controlNode").value;
                const elementId = document.getElementById("elementId").value;
                const deviceCommand = document.getElementById("deviceCommand").value;
                const commandData = document.getElementById("commandData").value;
                if (!controlNode || !elementId || !deviceCommand || !commandData) {
                    showToast("Please fill all command fields before sending.", "warning");
                    return;
                }
                if (controlNode == 0) {
                    showToast("Control node / device command cannot be 0.", "warning");
                    return;
                }
                mergedCommand = `#*${controlNode}*${elementId}*${deviceCommand}*${commandData}*#`;

            } else if (commandType === "2") {
                const controlNode = document.getElementById("longControlNode").value;
                const elementId = document.getElementById("longelementid").value;
                const operation = document.getElementById("longoperation").value;
                const speed1 = document.getElementById("longspeed1").value;
                const delay1 = document.getElementById("longdelay1").value;
                const speed2 = document.getElementById("longspeed2").value;
                const delay2 = document.getElementById("longdelay2").value;
                const speed3 = document.getElementById("longspeed3").value;
                if (!controlNode || !elementId || !operation || !speed1 || !delay1 || !speed2 || !delay2 || !speed3) {
                    showToast("Please fill all command fields before sending.", "warning");
                    return;
                }
                mergedCommand = `#*${controlNode}*${elementId}*${operation}*8*${speed1}*${delay1}*${speed2}*${delay2}*${speed3}*#`;

            } else if (commandType === "3") {
                mergedCommand = document.getElementById("stringCommand").value;
                if (!mergedCommand || !mergedCommand.trim()) {
                    showToast("Please enter a command string.", "warning");
                    return;
                }
            }

            if (mergedCommand) {
                sendMessage(mergedCommand);
            }
        }

        // Send message function
        function sendMessage(mergedCommand) {
            const topic1 = localStorage.getItem("publishTopic");
            
            if (!topic1) {
                showToast("No publish topic set. Go to Topics tab and set one.", "error");
                return;
            }
            
            const message1 = mergedCommand.toString();
            if (message1.trim() === "") return;
            
            const publishData = {
                topic1, message1
            };

            socket.emit("publishmessage", (publishData));
            console.log(`message ${message1} is published to topic ${topic1}`);
            appendMessage("You", message1);
        }

        // Display message in chat (internal function)
        function displayMessage(sender, message, timestamp, animate = true) {
            if (emptyChatState.parentNode) emptyChatState.remove();

            const isSent = sender === "You";
            const timeString = timestamp
                ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const messageElement = document.createElement("div");
            messageElement.classList.add("message", isSent ? "sent" : "received");
            if (!animate) messageElement.style.animation = 'none';

            messageElement.innerHTML = `
                <div class="message-bubble">${message}</div>
                <div class="message-meta">
                    <span>${isSent ? 'You' : sender}</span>
                    <span class="timestamp">${timeString}</span>
                </div>`;

            // Colour the last sent bubble based on broker acknowledgement codes
            if (sender === "Broker") {
                const parts = message.split("*");
                const sentMessages = document.querySelectorAll('.sent .message-bubble');
                if (sentMessages.length > 0) {
                    const lastBubble = sentMessages[sentMessages.length - 1];
                    if (message === "#*104*40*1*#") {
                        lastBubble.style.background = 'var(--warning)';
                    } else if (parts[1] === "102") {
                        lastBubble.style.background = 'var(--success)';
                    } else if (parts[1] === "101" && parts[3] === "13") {
                        lastBubble.style.background = 'var(--danger)';
                    }
                }
            }

            chatBox.appendChild(messageElement);
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        // Append messages in chat (public function)
        function appendMessage(sender, message) {
            const timestamp = new Date().toISOString();
            
            // Add to history
            const messageObj = { sender, message, timestamp };
            chatHistory.push(messageObj);
            
            // Keep history manageable
            if (chatHistory.length > MAX_MESSAGES) {
                chatHistory = chatHistory.slice(-MAX_MESSAGES);
            }
            
            // Display message
            displayMessage(sender, message, timestamp);
            
            // Update stats and save
            updateMessageCount();
            saveChatHistory();
            
            // Send response data to server
            const errormesg = message.split("*");
            let response1, response2, response3;

            if (sender == "Broker" && message == "#*104*40*1*#") {
                response1 = "Control node";
            } else if (sender == "Broker" && errormesg[1] == "102") {
                response2 = `Device/${errormesg[2]}`;
            } else if (sender == "Broker" && errormesg[1] == "101" && errormesg[3] == "13") {
                response3 = "No Response!";
            }

            if (response1 || response2 || response3) {
                const RESPONSE = { response1, response2, response3 };
                socket.emit("saveResponse", RESPONSE);
            }
        }

        // Execute commands with delay
        function executeCommandsWithDelay(fileData, delay) {
            const commands = fileData;
            const delays = delay;
            
            function executeNextCommand(index) {
                if (index < (commands.length && delays.length)) {
                    const command = String(commands[index]).trim();
                    const delayTime = String(delays[index]).trim();
                    
                    if (command && delayTime) {
                        sendMessage(command);
                        
                        // Set the delay for the next command
                        setTimeout(() => {
                            executeNextCommand(index + 1);
                        }, parseInt(delayTime));
                    } else {
                        // Skip empty lines
                        executeNextCommand(index + 1);
                    }
                } else {
                    console.log("All commands executed.");
                    appendMessage("System", "All bulk commands executed successfully.");
                }
            }

            // Start executing from the first command
            executeNextCommand(0);
        }

           









// // Save last selected profile
//  async function setLastSelectedProfile(profileId) {
//     await db.settings.put({ key: 'lastSelectedProfile', value: profileId });
// }

// // Get last selected profile
//  async function getLastSelectedProfile() {
//     const record = await db.settings.get('lastSelectedProfile');
//     return record ? record.value : null;
// }

// // Get profile details
//  async function getProfileById(profileId) {
//     return await db.profiles.get(profileId);
// }

// function loadProfileToUI(profile) {
//  document.getElementById("protocol").value = profile.protocol;
//         document.getElementById("ip").value = profile.ip;
//         document.getElementById("port").value = profile.port;
//       document.getElementById("mqttid").value = profile.mqttid;
//         document.getElementById("password").value =    profile.password;
//       document.getElementById("publishTopic").value = profile.publishTopic;
//          document.getElementById("subscribeTopic").value = profile.subscribeTopic;
// }