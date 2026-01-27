/**
 * Floating Chat Widget Launcher
 * Injects a chat bubble into any page to open the React Chat Module
 */

(function () {
    // 1. Create Floating Button
    const chatBtn = document.createElement('div');
    chatBtn.id = 'floating-chat-btn';
    chatBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#ffffff">
            <path d="M240-400h480v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z"/>
        </svg>
        <div id="chat-badge" style="display: none;"></div>
    `;

    // 2. Create Chat Container (Iframe Wrapper)
    const chatContainer = document.createElement('div');
    chatContainer.id = 'floating-chat-container';
    chatContainer.style.display = 'none';
    chatContainer.innerHTML = `
        <div id="chat-header">
            <span>Enterprise Chat</span>
            <button id="close-chat">
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                    <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
                </svg>
            </button>
        </div>
        <iframe src="compounding-chat.html" id="chat-iframe" title="Chat"></iframe>
    `;

    // 3. Styles
    const styles = document.createElement('style');
    styles.innerHTML = `
        #floating-chat-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 65px;
            height: 65px;
            background: #5e63ff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 10px 25px rgba(94, 99, 255, 0.4);
            z-index: 10000;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            border: 2px solid rgba(255, 255, 255, 0.1);
        }

        #floating-chat-btn:hover {
            transform: scale(1.1) rotate(5deg);
            box-shadow: 0 15px 35px rgba(94, 99, 255, 0.6);
        }

        #chat-badge {
            position: absolute;
            top: 0;
            right: 0;
            width: 15px;
            height: 15px;
            background: #ff4757;
            border-radius: 50%;
            border: 2px solid white;
        }

        #floating-chat-container {
            position: fixed;
            bottom: 110px;
            right: 30px;
            width: 400px;
            height: 600px;
            background: #11121a;
            border-radius: 25px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
            z-index: 10001;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            border: 1px solid rgba(255, 255, 255, 0.1);
            animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }

        #chat-header {
            padding: 15px 25px;
            background: #1a1b26;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        #chat-header span {
            font-weight: 800;
            font-size: 0.9rem;
            color: #fff;
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        #chat-header button {
            background: transparent;
            border: none;
            color: #9aa0a6;
            cursor: pointer;
            padding: 5px;
            border-radius: 50%;
            display: flex;
            transition: all 0.2s;
        }

        #chat-header button:hover {
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
        }

        #chat-iframe {
            flex: 1;
            border: none;
            width: 100%;
            height: 100%;
        }

        @media (max-width: 500px) {
            #floating-chat-container {
                width: calc(100vw - 40px);
                height: calc(100vh - 120px);
                right: 20px;
                bottom: 100px;
            }
        }
    `;

    // 4. Initialization
    document.body.appendChild(chatBtn);
    document.body.appendChild(chatContainer);
    document.head.appendChild(styles);

    // 5. Events
    chatBtn.addEventListener('click', () => {
        if (chatContainer.style.display === 'none') {
            chatContainer.style.display = 'flex';
            // We might need to handle the iframe source if it's not running
            // For production, this would be a real URL
            // const iframe = document.getElementById('chat-iframe');
            // if (!iframe.src) iframe.src = 'chat-app/dist/index.html'; 
        } else {
            chatContainer.style.display = 'none';
        }
    });

    document.getElementById('close-chat').addEventListener('click', () => {
        chatContainer.style.display = 'none';
    });
})();
