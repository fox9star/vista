// PrismVista 3D - AI Copilot & 3D Scene Controller Chatbot

class PrismChatbot {
    constructor(app) {
        this.app = app;
        this.isOpen = false;
        this.messages = [];
        this.apiKey = localStorage.getItem('prismvista_llm_api_key') || '';
        this.apiProvider = localStorage.getItem('prismvista_llm_provider') || 'local'; // 'local', 'openai', 'gemini'

        this.initUI();
        this.bindEvents();
        this.addBotMessage(
            "반갑습니다! **PrismVista AI 3D 어시스턴트**입니다. ✨\n\n" +
            "자연어로 조명, 날씨, 3D 모델 생성, 재질 편집을 자유롭게 지시해보세요!\n" +
            "예: *\"일몰 노을로 바꿔줘\"*, *\"큐브 추가해줘\"*, *\"360도 회전 켜줘\"*, *\"골드 금속 재질로 변경\"*"
        );
    }

    initUI() {
        // Top-Right Toggle Button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'prismChatToggleBtn';
        toggleBtn.className = 'prism-chat-toggle';
        toggleBtn.innerHTML = `
            <span class="chat-icon">✨</span>
            <span class="chat-label">AI 어시스턴트</span>
            <span class="chat-status-dot"></span>
        `;
        const rightActions = document.querySelector('.right-actions');
        if (rightActions) {
            rightActions.appendChild(toggleBtn);
        } else {
            document.body.appendChild(toggleBtn);
        }

        // Chat Container Modal
        const chatContainer = document.createElement('div');
        chatContainer.id = 'prismChatContainer';
        chatContainer.className = 'prism-chat-box';
        chatContainer.innerHTML = `
            <div class="chat-header">
                <div class="chat-header-info">
                    <span class="chat-header-badge">AI</span>
                    <div>
                        <div class="chat-header-title">PrismVista Copilot</div>
                        <div class="chat-header-subtitle">실시간 3D 씬 제어 AI</div>
                    </div>
                </div>
                <div class="chat-header-actions">
                    <button class="chat-header-btn" id="chatSettingsBtn" title="API 설정">⚙️</button>
                    <button class="chat-header-btn" id="chatClearBtn" title="대화 초기화">🗑️</button>
                    <button class="chat-header-btn" id="chatCloseBtn" title="닫기">&times;</button>
                </div>
            </div>

            <!-- Quick Suggestion Pills -->
            <div class="chat-quick-pills" id="chatQuickPills">
                <button class="quick-pill" data-prompt="일몰 골든아워로 바꿔줘">🌅 일몰 골든아워</button>
                <button class="quick-pill" data-prompt="맑은 한낮으로 변경해줘">☀️ 맑은 정오</button>
                <button class="quick-pill" data-prompt="나이트 스튜디오로 바꿔줘">🌙 나이트 야경</button>
                <button class="quick-pill" data-prompt="큐브 하나 추가해줘">📦 큐브 생성</button>
                <button class="quick-pill" data-prompt="구체 하나 만들어줘">⚪ 구 생성</button>
                <button class="quick-pill" data-prompt="360도 턴테이블 회전 시작해">🔄 360° 회전</button>
                <button class="quick-pill" data-prompt="금속 골드 재질로 바꿔줘">✨ 골드 메탈</button>
                <button class="quick-pill" data-prompt="고화질 렌더링 창 열어줘">📷 렌더링 내보내기</button>
                <button class="quick-pill" data-prompt="조작법과 단축키 알려줘">💡 단축키 안내</button>
            </div>

            <!-- Chat Message List -->
            <div class="chat-body" id="chatMessageList"></div>

            <!-- Settings Drawer (Hidden by default) -->
            <div class="chat-settings-drawer" id="chatSettingsDrawer">
                <div class="settings-title">AI 엔진 설정 (선택 사항)</div>
                <div class="settings-desc">기본 내장 자연어 엔진 외에 외부 LLM을 연동할 수 있습니다.</div>
                <div class="settings-field">
                    <label>제공자:</label>
                    <select id="chatProviderSelect" class="chat-select">
                        <option value="local">내장 로컬 3D 제어 엔진 (오프라인 / 무설치)</option>
                        <option value="openai">OpenAI (GPT-4o / GPT-3.5)</option>
                        <option value="gemini">Google Gemini API</option>
                    </select>
                </div>
                <div class="settings-field" id="apiKeyField" style="display: none;">
                    <label>API Key:</label>
                    <input type="password" id="chatApiKeyInput" class="chat-input-text" placeholder="sk-..." />
                </div>
                <div class="settings-actions">
                    <button id="saveSettingsBtn" class="chat-btn-primary">저장</button>
                    <button id="closeSettingsBtn" class="chat-btn-secondary">닫기</button>
                </div>
            </div>

            <!-- Chat Input Area -->
            <div class="chat-footer">
                <input type="text" id="chatInputField" placeholder="자연어로 3D 씬을 지시하세요... (Enter로 전송)" />
                <button id="chatSendBtn" class="chat-send-btn" title="전송">➔</button>
            </div>
        `;
        document.body.appendChild(chatContainer);

        this.toggleBtn = toggleBtn;
        this.chatBox = chatContainer;
        this.msgList = document.getElementById('chatMessageList');
        this.inputField = document.getElementById('chatInputField');
    }

    bindEvents() {
        this.toggleBtn.addEventListener('click', () => this.toggleChat());
        document.getElementById('chatCloseBtn').addEventListener('click', () => this.closeChat());

        // Send on click / enter
        document.getElementById('chatSendBtn').addEventListener('click', () => this.handleUserSend());
        this.inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleUserSend();
            }
        });

        // Quick pills
        document.querySelectorAll('.quick-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.dataset.prompt;
                this.inputField.value = prompt;
                this.handleUserSend();
            });
        });

        // Clear chat
        document.getElementById('chatClearBtn').addEventListener('click', () => {
            this.msgList.innerHTML = '';
            this.addBotMessage("대화 기록이 초기화되었습니다. 새로운 명령을 내려주세요!");
        });

        // Settings Drawer
        const settingsDrawer = document.getElementById('chatSettingsDrawer');
        const settingsBtn = document.getElementById('chatSettingsBtn');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        const providerSelect = document.getElementById('chatProviderSelect');
        const apiKeyField = document.getElementById('apiKeyField');
        const apiKeyInput = document.getElementById('chatApiKeyInput');

        providerSelect.value = this.apiProvider;
        apiKeyInput.value = this.apiKey;
        apiKeyField.style.display = (this.apiProvider === 'local') ? 'none' : 'block';

        providerSelect.addEventListener('change', () => {
            apiKeyField.style.display = (providerSelect.value === 'local') ? 'none' : 'block';
        });

        settingsBtn.addEventListener('click', () => {
            settingsDrawer.classList.toggle('show');
        });
        closeSettingsBtn.addEventListener('click', () => {
            settingsDrawer.classList.remove('show');
        });
        saveSettingsBtn.addEventListener('click', () => {
            this.apiProvider = providerSelect.value;
            this.apiKey = apiKeyInput.value.trim();
            localStorage.setItem('prismvista_llm_provider', this.apiProvider);
            localStorage.setItem('prismvista_llm_api_key', this.apiKey);
            settingsDrawer.classList.remove('show');
            this.addBotMessage(`설정이 저장되었습니다. (엔진: ${this.apiProvider === 'local' ? '내장 3D 제어 엔진' : this.apiProvider})`);
        });
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        this.chatBox.classList.toggle('open', this.isOpen);
        this.toggleBtn.classList.toggle('active', this.isOpen);
        if (this.isOpen) {
            setTimeout(() => this.inputField.focus(), 150);
        }
    }

    closeChat() {
        this.isOpen = false;
        this.chatBox.classList.remove('open');
        this.toggleBtn.classList.remove('active');
    }

    handleUserSend() {
        const text = this.inputField.value.trim();
        if (!text) return;

        this.addUserMessage(text);
        this.inputField.value = '';

        // Process message
        this.processQuery(text);
    }

    addUserMessage(text) {
        const div = document.createElement('div');
        div.className = 'chat-message user-msg';
        div.textContent = text;
        this.msgList.appendChild(div);
        this.scrollToBottom();
    }

    addBotMessage(markdownText, actionsTaken = []) {
        const div = document.createElement('div');
        div.className = 'chat-message bot-msg';

        let html = markdownText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');

        div.innerHTML = html;

        if (actionsTaken && actionsTaken.length > 0) {
            const badgeContainer = document.createElement('div');
            badgeContainer.className = 'action-badges';
            actionsTaken.forEach(action => {
                const b = document.createElement('span');
                b.className = 'action-badge';
                b.innerHTML = `⚡ ${action}`;
                badgeContainer.appendChild(b);
            });
            div.appendChild(badgeContainer);
        }

        this.msgList.appendChild(div);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.msgList.scrollTop = this.msgList.scrollHeight;
    }

    // Natural Language Intent Engine & 3D Manipulator
    processQuery(query) {
        const q = query.toLowerCase();
        const actions = [];
        let reply = "";

        // 1. Environment & Presets
        if (q.includes('일몰') || q.includes('노을') || q.includes('sunset') || q.includes('골든아워') || q.includes('황혼')) {
            this.app.applyEnvironmentPreset('sunset');
            actions.push("대기 환경: 일몰 골든아워 적용");
            reply = "🌅 씬의 태양광과 대기 환경을 **일몰 골든아워(Sunset)**로 변경했습니다! 낮은 태양 고도와 따뜻한 호박색 노을빛이 적용되었습니다.";
        }
        else if (q.includes('정오') || q.includes('한낮') || q.includes('맑음') || q.includes('midday') || (q.includes('낮') && !q.includes('낮춰'))) {
            this.app.applyEnvironmentPreset('midday');
            actions.push("대기 환경: 한낮 맑음 적용");
            reply = "☀️ 태양광과 하늘을 **한낮 맑음(Midday Clear)**으로 변경했습니다! 선명한 직사광선과 푸른 하늘이 설정되었습니다.";
        }
        else if (q.includes('흐림') || q.includes('흐린') || q.includes('구름') || q.includes('overcast')) {
            this.app.applyEnvironmentPreset('overcast');
            actions.push("대기 환경: 흐린 하늘 적용");
            reply = "☁️ 부드러운 확산광을 가진 **흐린 하늘(Overcast)** 환경으로 전환되었습니다.";
        }
        else if (q.includes('밤') || q.includes('야경') || q.includes('나이트') || q.includes('night') || q.includes('어둡게')) {
            this.app.applyEnvironmentPreset('night');
            actions.push("대기 환경: 나이트 스튜디오 적용");
            reply = "🌙 건축 조명과 LED 스트립이 돋보이는 **나이트 스튜디오(Night Studio)** 분위기로 변경했습니다.";
        }

        // 2. Add 3D Primitives
        else if (q.includes('큐브') || q.includes('상자') || q.includes('박스') || q.includes('box') || q.includes('cube')) {
            this.app.addPrimitive('box');
            actions.push("3D 오브젝트: 큐브(Cube) 생성");
            reply = "📦 뷰포트 중심에 **큐브(Cube)** 3D 메쉬를 새로 생성하여 배치했습니다. 우측 패널에서 위치와 재질을 조절하실 수 있습니다.";
        }
        else if (q.includes('구체') || q.includes('구') || q.includes('sphere') || q.includes('공')) {
            this.app.addPrimitive('sphere');
            actions.push("3D 오브젝트: 구(Sphere) 생성");
            reply = "⚪ 뷰포트 중심에 부드러운 **구(Sphere)** 3D 메쉬를 생성했습니다!";
        }
        else if (q.includes('원기둥') || q.includes('기둥') || q.includes('실린더') || q.includes('cylinder') || q.includes('column')) {
            this.app.addPrimitive('cylinder');
            actions.push("3D 오브젝트: 원기둥(Cylinder) 생성");
            reply = "🏛️ 건축용 **원기둥(Cylinder Column)** 오브젝트를 장면에 추가했습니다.";
        }
        else if (q.includes('바닥') || q.includes('슬래브') || q.includes('플로어') || q.includes('plane') || q.includes('floor')) {
            this.app.addPrimitive('plane');
            actions.push("3D 오브젝트: 바닥 슬래브(Floor) 생성");
            reply = "⬛ 넓은 **바닥 슬래브(Floor Plane)**를 추가했습니다.";
        }

        // 3. Turntable Animation
        else if (q.includes('턴테이블') || q.includes('360') || q.includes('회전') || q.includes('돌려')) {
            this.app.turntableActive = !this.app.turntableActive;
            const btn = document.getElementById('turntableBtn');
            if (btn) btn.classList.toggle('active', this.app.turntableActive);
            actions.push(`360° 턴테이블: ${this.app.turntableActive ? '활성화' : '정지'}`);
            reply = this.app.turntableActive
                ? "🔄 카메라 **360° 턴테이블 자동 회전**을 시작했습니다! 오브젝트의 전방위 뷰를 감상하세요."
                : "⏸️ 턴테이블 자동 회전을 정지했습니다.";
        }

        // 4. Render & Snapshot Export
        else if (q.includes('렌더') || q.includes('사진') || q.includes('촬영') || q.includes('캡처') || q.includes('내보내') || q.includes('export')) {
            const modal = document.getElementById('renderModal');
            if (modal) {
                modal.classList.add('show');
                actions.push("고화질 렌더링 내보내기 창 오픈");
                reply = "📷 **고화질 렌더링 내보내기 창**을 열었습니다! Full HD, 2K, 4K 해상도를 선택하여 무손실 PNG 파일로 저장하세요.";
            }
        }

        // 5. Material / Color Modification
        else if (this.app.selectedId && (q.includes('금속') || q.includes('메탈') || q.includes('골드') || q.includes('실버') || q.includes('색') || q.includes('재질') || q.includes('유리') || q.includes('투명'))) {
            const obj = this.app.scene.getObjectById(this.app.selectedId);
            if (obj) {
                if (q.includes('골드') || q.includes('금')) {
                    obj.material.color = [0.95, 0.75, 0.25];
                    obj.material.metallic = 0.95;
                    obj.material.roughness = 0.15;
                    actions.push(`재질 변경: [${obj.name}] -> 골드 메탈릭`);
                    reply = `✨ 선택된 객체(<strong>${obj.name}</strong>)를 화려한 **골드 금속(Gold Metallic)** 재질로 변경했습니다!`;
                }
                else if (q.includes('실버') || q.includes('은') || q.includes('크롬')) {
                    obj.material.color = [0.9, 0.92, 0.95];
                    obj.material.metallic = 0.98;
                    obj.material.roughness = 0.08;
                    actions.push(`재질 변경: [${obj.name}] -> 실버 크롬`);
                    reply = `✨ 선택된 객체(<strong>${obj.name}</strong>)를 반사율이 높은 **실버 크롬(Silver Chrome)** 재질로 설정했습니다.`;
                }
                else if (q.includes('유리') || q.includes('투명')) {
                    obj.material.color = [0.7, 0.85, 0.95];
                    obj.material.metallic = 0.9;
                    obj.material.roughness = 0.05;
                    obj.material.opacity = 0.4;
                    actions.push(`재질 변경: [${obj.name}] -> 투명 유리`);
                    reply = `💎 선택된 객체(<strong>${obj.name}</strong>)를 투과율을 지닌 **유리(Glass)** 재질로 변경했습니다.`;
                }
                else if (q.includes('빨간') || q.includes('레드')) {
                    obj.material.color = [0.9, 0.15, 0.15];
                    actions.push(`색상 변경: [${obj.name}] -> 레드`);
                    reply = `🎨 선택된 객체의 색상을 선명한 **레드(Red)**로 변경했습니다.`;
                }
                else if (q.includes('파란') || q.includes('블루')) {
                    obj.material.color = [0.1, 0.45, 0.95];
                    actions.push(`색상 변경: [${obj.name}] -> 블루`);
                    reply = `🎨 선택된 객체의 색상을 시원한 **블루(Blue)**로 변경했습니다.`;
                }
                else {
                    obj.material.metallic = 0.85;
                    obj.material.roughness = 0.2;
                    actions.push(`재질 변경: [${obj.name}] -> PBR 메탈`);
                    reply = `선택된 객체(<strong>${obj.name}</strong>)의 메탈릭 및 러프니스 수치를 조절했습니다.`;
                }
                this.app.updateInspectorUI();
            }
        }

        // 6. Camera Views / Navigation
        else if (q.includes('외관') || q.includes('전면') || q.includes('빌라')) {
            const v = this.app.cameraViews[0];
            if (v) {
                this.app.flyCameraTo(v.pos, v.target);
                actions.push("카메라 이동: 빌라 정면 뷰");
                reply = "🎥 카메라를 **빌라 정면 외관 뷰(Front Exterior)**로 부드럽게 비행 이동시켰습니다.";
            }
        }
        else if (q.includes('수영장') || q.includes('풀') || q.includes('pool')) {
            const v = this.app.cameraViews[1];
            if (v) {
                this.app.flyCameraTo(v.pos, v.target);
                actions.push("카메라 이동: 인피니티 풀 테라스");
                reply = "🎥 카메라를 **인피니티 풀 테라스 뷰(Pool Terrace)**로 이동시켰습니다.";
            }
        }
        else if (q.includes('실내') || q.includes('인테리어')) {
            const v = this.app.cameraViews[2];
            if (v) {
                this.app.flyCameraTo(v.pos, v.target);
                actions.push("카메라 이동: 인테리어 라운지");
                reply = "🎥 카메라를 **실내 라운지 뷰(Interior View)**로 이동시켰습니다.";
            }
        }
        else if (q.includes('위에서') || q.includes('탑뷰') || q.includes('조감')) {
            const v = this.app.cameraViews[3];
            if (v) {
                this.app.flyCameraTo(v.pos, v.target);
                actions.push("카메라 이동: 탑 아이소메트릭 뷰");
                reply = "🎥 건축 전체 조망을 볼 수 있는 **탑 아이소메트릭 뷰(Top Isometric)**로 이동했습니다.";
            }
        }
        else if (q.includes('포커스') || q.includes('초점') || q.includes('가까이')) {
            if (this.app.selectedId) {
                this.app.focusOnSelected();
                actions.push("선택된 객체로 카메라 포커스");
                reply = "🎯 선택된 3D 객체로 카메라 시점을 즉시 정렬했습니다.";
            } else {
                reply = "뷰포트에서 먼저 포커스를 맞출 3D 객체를 클릭하여 선택해주세요!";
            }
        }

        // 7. General Help & Navigation Shortcut Guide
        else if (q.includes('도움말') || q.includes('단축키') || q.includes('조작') || q.includes('사용법') || q.includes('help')) {
            reply = `
                📖 <strong>PrismVista 3D 조작 안내서</strong><br><br>
                • <strong>마우스 조작</strong>:<br>
                - 좌클릭 드래그: 뷰포트 중심 궤도 회전(Orbit)<br>
                - 우클릭/휠 드래그: 화면 평행 이동(Pan)<br>
                - 휠 스크롤: 줌 인/아웃(Zoom)<br><br>
                • <strong>키보드 건축 워크스루</strong>:<br>
                - <code>W / A / S / D</code>: 전진/좌/후진/우측 보행 이동<br>
                - <code>Q / E</code>: 수직 하강/상승<br>
                - <code>Shift</code>: 고속 이동<br>
                - <code>F</code>: 선택 객체 카메라 포커스<br>
                - <code>Ctrl + D</code>: 선택 객체 복제 | <code>Del</code>: 삭제<br><br>
                • <strong>3D 모델 로딩</strong>: <code>.obj</code> 파일을 화면에 드래그하면 즉시 배치됩니다!
            `;
        }

        // Fallback or LLM
        else {
            if (this.apiProvider !== 'local' && this.apiKey) {
                this.callExternalLLM(query);
                return;
            } else {
                reply = `
                    "${query}" 명령을 분석했습니다.<br><br>
                    제가 바로 실행할 수 있는 추천 작업입니다:<br>
                    • <strong>날씨/조명</strong>: <em>"일몰로 바꿔줘"</em>, <em>"한낮 맑음으로"</em>, <em>"나이트 야경"</em><br>
                    • <strong>3D 추가</strong>: <em>"큐브 추가"</em>, <em>"구 생성"</em>, <em>"원기둥 추가"</em><br>
                    • <strong>애니메이션</strong>: <em>"360도 회전 켜줘"</em><br>
                    • <strong>재질 편집</strong>: 객체 선택 후 <em>"골드 금속으로 바꿔줘"</em>, <em>"유리로 변경"</em><br>
                    • <strong>카메라 이동</strong>: <em>"수영장 뷰로 이동"</em>, <em>"실내 뷰"</em><br>
                    • <strong>내보내기</strong>: <em>"렌더링 창 열어줘"</em>
                `;
            }
        }

        this.addBotMessage(reply, actions);
    }

    async callExternalLLM(userPrompt) {
        // External LLM integration (OpenAI / Gemini)
        try {
            const loadingMsg = document.createElement('div');
            loadingMsg.className = 'chat-message bot-msg loading';
            loadingMsg.textContent = 'AI 응답 생성 중... ✨';
            this.msgList.appendChild(loadingMsg);
            this.scrollToBottom();

            let responseText = "";
            if (this.apiProvider === 'openai') {
                const res = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify({
                        model: "gpt-4o-mini",
                        messages: [
                            { role: "system", content: "You are the AI assistant inside PrismVista 3D, a professional real-time PBR ray tracing architectural visualization software." },
                            { role: "user", content: userPrompt }
                        ]
                    })
                });
                const data = await res.json();
                responseText = data.choices[0].message.content;
            } else if (this.apiProvider === 'gemini') {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: userPrompt }] }]
                    })
                });
                const data = await res.json();
                responseText = data.candidates[0].content.parts[0].text;
            }

            loadingMsg.remove();
            this.addBotMessage(responseText);
        } catch (err) {
            this.addBotMessage("외부 AI API 연결 중 오류가 발생했습니다: " + err.message);
        }
    }
}


// Auto-initialize chatbot on DOM load
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.app && !window.chatbot) {
            window.chatbot = new PrismChatbot(window.app);
        }
    }, 50);
});

