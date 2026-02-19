// SoinLinkx OS v2.0 - Полноценное ядро
class SoinLinkxOS {
    constructor() {
        this.version = '2.0.0';
        this.build = '2024.1';
        this.user = null;
        this.windows = [];
        this.apps = [];
        this.files = [];
        this.notifications = [];
        this.errors = [];
        this.settings = {};
        this.networkStatus = true;
        this.batteryLevel = 100;
        this.theme = 'dark';
        this.syncEnabled = false;
        this.userId = null;
        this.windowZIndex = 100;
        
        this.init();
    }

    async init() {
        this.showBootScreen();
        await this.loadSettings();
        this.checkNetwork();
        this.initBattery();
        this.initEventListeners();
        this.loadApps();
        
        setTimeout(() => {
            if (localStorage.getItem('soinlinkx_session')) {
                this.autoLogin();
            } else {
                this.showSetup();
            }
        }, 5000);
    }

    showBootScreen() {
        const bootScreen = document.getElementById('boot-screen');
        const bootProgress = document.getElementById('bootProgress');
        const bootStatus = document.getElementById('bootStatus');
        const bootDetails = document.getElementById('bootDetails');
        
        const stages = [
            'Инициализация ядра...',
            'Загрузка модулей...',
            'Проверка оборудования...',
            'Запуск служб...',
            'Подготовка интерфейса...'
        ];
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += 20;
            bootProgress.style.width = progress + '%';
            
            if (progress <= 100) {
                bootStatus.textContent = stages[Math.floor(progress / 20) - 1];
                bootDetails.textContent = `Загружено ${progress}%`;
            }
            
            if (progress >= 100) {
                clearInterval(interval);
            }
        }, 1000);
    }

    async loadSettings() {
        const savedSettings = localStorage.getItem('soinlinkx_settings');
        if (savedSettings) {
            this.settings = JSON.parse(savedSettings);
            this.theme = this.settings.theme || 'dark';
            this.applyTheme();
        }
    }

    applyTheme() {
        document.body.className = `theme-${this.theme}`;
        
        // Применяем переменные темы
        const root = document.documentElement;
        switch(this.theme) {
            case 'dark':
                root.style.setProperty('--bg-primary', '#1a202c');
                root.style.setProperty('--bg-secondary', '#2d3748');
                root.style.setProperty('--text-primary', '#ffffff');
                break;
            case 'light':
                root.style.setProperty('--bg-primary', '#f7fafc');
                root.style.setProperty('--bg-secondary', '#edf2f7');
                root.style.setProperty('--text-primary', '#2d3748');
                break;
            case 'soin':
                root.style.setProperty('--bg-primary', '#000000');
                root.style.setProperty('--bg-secondary', '#1a1a1a');
                root.style.setProperty('--text-primary', '#ffffff');
                root.style.setProperty('--primary-color', '#00ff88');
                break;
            case 'hacker':
                root.style.setProperty('--bg-primary', '#0d0f0d');
                root.style.setProperty('--bg-secondary', '#1a2b1a');
                root.style.setProperty('--text-primary', '#00ff00');
                root.style.setProperty('--primary-color', '#00ff00');
                break;
            case 'amethyst':
                root.style.setProperty('--bg-primary', '#2d1b3a');
                root.style.setProperty('--bg-secondary', '#3d2a4d');
                root.style.setProperty('--text-primary', '#e0d0ff');
                root.style.setProperty('--primary-color', '#b8a0ff');
                break;
        }
    }

    checkNetwork() {
        this.networkStatus = navigator.onLine;
        const indicator = document.getElementById('networkIndicator');
        if (indicator) {
            indicator.innerHTML = this.networkStatus ? 
                '<span class="network-dot"></span><span>Онлайн</span>' : 
                '<span class="network-dot offline"></span><span>Оффлайн</span>';
        }
        
        window.addEventListener('online', () => this.updateNetworkStatus(true));
        window.addEventListener('offline', () => this.updateNetworkStatus(false));
    }

    updateNetworkStatus(status) {
        this.networkStatus = status;
        const indicator = document.getElementById('networkIndicator');
        if (indicator) {
            indicator.innerHTML = status ? 
                '<span class="network-dot"></span><span>Онлайн</span>' : 
                '<span class="network-dot offline"></span><span>Оффлайн</span>';
        }
        
        this.showNotification(
            status ? 'Соединение восстановлено' : 'Потеряно соединение',
            status ? 'success' : 'warning'
        );
    }

    async initBattery() {
        if ('getBattery' in navigator) {
            const battery = await navigator.getBattery();
            this.updateBatteryStatus(battery);
            
            battery.addEventListener('levelchange', () => this.updateBatteryStatus(battery));
            battery.addEventListener('chargingchange', () => this.updateBatteryStatus(battery));
        }
    }

    updateBatteryStatus(battery) {
        this.batteryLevel = Math.round(battery.level * 100);
        const percent = document.getElementById('batteryPercent');
        const icon = document.getElementById('batteryIcon');
        
        if (percent) percent.textContent = this.batteryLevel + '%';
        if (icon) {
            if (battery.charging) {
                icon.textContent = '⚡';
            } else if (this.batteryLevel < 20) {
                icon.textContent = '🪫';
            } else {
                icon.textContent = '🔋';
            }
        }
        
        if (this.batteryLevel < 15 && !battery.charging) {
            this.showNotification('Низкий заряд батареи', 'warning');
        }
    }

    initEventListeners() {
        // Глобальные обработчики
        document.addEventListener('click', (e) => this.handleGlobalClick(e));
        document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));
        document.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        
        // Часы
        setInterval(() => this.updateClock(), 1000);
        
        // Поиск
        document.getElementById('global-search')?.addEventListener('input', (e) => {
            this.searchGlobal(e.target.value);
        });
    }

    handleGlobalClick(e) {
        // Закрытие меню при клике вне
        if (!e.target.closest('#app-menu') && !e.target.closest('.app-menu-button')) {
            document.getElementById('app-menu')?.classList.add('hidden');
        }
        
        if (!e.target.closest('.user-menu') && !e.target.closest('#user-menu-panel')) {
            document.getElementById('user-menu-panel')?.classList.add('hidden');
        }
    }

    handleGlobalKeydown(e) {
        // Глобальные горячие клавиши
        if (e.ctrlKey && e.key === 'q') {
            e.preventDefault();
            this.showShutdownDialog();
        }
        
        if (e.ctrlKey && e.key === 't') {
            e.preventDefault();
            this.launchApp('terminal');
        }
        
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            this.showNotification('Тестовое уведомление', 'info');
        }
        
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            document.getElementById('global-search')?.focus();
        }
        
        if (e.altKey && e.key === 'F4') {
            e.preventDefault();
            if (this.windows.length > 0) {
                this.closeWindow(this.windows[this.windows.length - 1].id);
            }
        }
    }

    handleContextMenu(e) {
        if (e.target.closest('#desktop-workspace')) {
            e.preventDefault();
            this.showDesktopContextMenu(e.clientX, e.clientY);
        }
    }

    updateClock() {
        const now = new Date();
        document.getElementById('clock').textContent = now.toLocaleTimeString();
        document.getElementById('date').textContent = now.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    searchGlobal(query) {
        if (!query) return;
        
        const results = this.apps.filter(app => 
            app.name.toLowerCase().includes(query.toLowerCase())
        );
        
        if (results.length > 0) {
            this.showNotification(`Найдено приложений: ${results.length}`, 'info');
        }
    }

    loadApps() {
        // Загрузка доступных приложений
        this.apps = [
            { id: 'terminal', name: 'Терминал', icon: '💻', category: 'system', path: 'apps/terminal.html' },
            { id: 'file-manager', name: 'Файлы', icon: '📁', category: 'system', path: 'apps/filemanager.html' },
            { id: 'browser', name: 'Браузер', icon: '🌐', category: 'multimedia', path: 'apps/browser.html' },
            { id: 'store', name: 'SoinStore', icon: '📱', category: 'system', path: 'apps/store.html' },
            { id: 'soin-ui', name: 'SoinUI', icon: '📲', category: 'system', path: 'apps/soinui.html' },
            { id: 'calculator', name: 'Калькулятор', icon: '🧮', category: 'office', path: 'apps/calc.html' },
            { id: 'notes', name: 'Заметки', icon: '📝', category: 'office', path: 'apps/notes.html' },
            { id: 'gallery', name: 'Галерея', icon: '🖼️', category: 'multimedia', path: 'apps/gallery.html' },
            { id: 'music', name: 'Музыка', icon: '🎵', category: 'multimedia', path: 'apps/music.html' },
            { id: 'settings', name: 'Настройки', icon: '⚙️', category: 'system', path: 'apps/settings.html' },
            { id: 'games', name: 'Игры', icon: '🎮', category: 'games', path: 'apps/games.html' },
            { id: 'code', name: 'Редактор кода', icon: '📟', category: 'dev', path: 'apps/code.html' },
            { id: 'terminal-pro', name: 'Terminal Pro', icon: '⌨️', category: 'dev', path: 'apps/terminal-pro.html' },
            { id: 'package-manager', name: 'SoinPackage', icon: '📦', category: 'system', path: 'apps/package.html' }
        ];
        
        this.renderAppMenu();
        this.renderDesktopIcons();
    }

    renderAppMenu() {
        const grid = document.getElementById('appGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        this.apps.forEach(app => {
            const item = document.createElement('div');
            item.className = 'app-menu-item';
            item.setAttribute('data-category', app.category);
            item.onclick = () => this.launchApp(app.id);
            item.innerHTML = `
                <span class="app-icon">${app.icon}</span>
                <span class="app-name">${app.name}</span>
            `;
            grid.appendChild(item);
        });
        
        // Обработчики категорий
        document.querySelectorAll('.category-item').forEach(cat => {
            cat.addEventListener('click', (e) => {
                document.querySelectorAll('.category-item').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                
                const category = e.target.dataset.category;
                document.querySelectorAll('.app-menu-item').forEach(item => {
                    if (category === 'all' || item.dataset.category === category) {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });
    }

    renderDesktopIcons() {
        const desktop = document.getElementById('desktopIcons');
        if (!desktop) return;
        
        const defaultIcons = ['file-manager', 'terminal', 'store', 'soin-ui', 'settings'];
        defaultIcons.forEach(appId => {
            const app = this.apps.find(a => a.id === appId);
            if (app) {
                const icon = document.createElement('div');
                icon.className = 'desktop-icon';
                icon.ondblclick = () => this.launchApp(app.id);
                icon.onclick = (e) => {
                    if (e.ctrlKey) {
                        this.selectDesktopIcon(icon);
                    }
                };
                icon.innerHTML = `
                    <span class="icon">${app.icon}</span>
                    <span class="label">${app.name}</span>
                `;
                desktop.appendChild(icon);
            }
        });
    }

    selectDesktopIcon(icon) {
        document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
        icon.classList.add('selected');
    }

    showDesktopContextMenu(x, y) {
        const menu = document.getElementById('desktop-context-menu');
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.classList.remove('hidden');
        
        const hideMenu = () => {
            menu.classList.add('hidden');
            document.removeEventListener('click', hideMenu);
        };
        
        setTimeout(() => {
            document.addEventListener('click', hideMenu);
        }, 100);
    }

    async autoLogin() {
        const session = JSON.parse(localStorage.getItem('soinlinkx_session'));
        if (session) {
            this.user = session.user;
            this.userId = session.userId;
            this.theme = session.user.theme;
            this.applyTheme();
            
            document.getElementById('boot-screen').classList.add('hidden');
            document.getElementById('desktop').classList.remove('hidden');
            
            document.getElementById('userInitial').textContent = this.user.username[0].toUpperCase();
            document.getElementById('current-user').textContent = this.user.username;
            
            this.showNotification('Добро пожаловать, ' + this.user.username, 'success');
            
            if (this.networkStatus) {
                await this.syncWithServer();
            }
        }
    }

    showSetup() {
        document.getElementById('boot-screen').classList.add('hidden');
        document.getElementById('setup-screen').classList.remove('hidden');
    }

    async handleRegistration(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirm-password').value;
        const email = document.getElementById('email').value;
        const theme = document.getElementById('theme').value;
        const syncCloud = document.getElementById('sync-cloud').checked;
        
        // Валидация
        if (password !== confirm) {
            this.showError('Пароли не совпадают', 'AUTH001');
            return;
        }
        
        if (password.length < 6) {
            this.showError('Пароль должен быть не менее 6 символов', 'AUTH002');
            return;
        }
        
        const btn = document.getElementById('setupBtn');
        btn.querySelector('span').classList.add('hidden');
        btn.querySelector('.btn-loader').classList.remove('hidden');
        
        try {
            let userId = 'local-' + Date.now();
            let userData = {
                username,
                theme,
                email,
                createdAt: new Date().toISOString()
            };
            
            if (this.networkStatus && syncCloud) {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, email, theme })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    userId = data.userId;
                    this.syncEnabled = true;
                }
            }
            
            this.user = userData;
            this.userId = userId;
            this.theme = theme;
            
            localStorage.setItem('soinlinkx_session', JSON.stringify({
                user: userData,
                userId: userId
            }));
            
            localStorage.setItem('soinlinkx_settings', JSON.stringify({
                theme,
                syncEnabled: syncCloud
            }));
            
            this.applyTheme();
            
            document.getElementById('setup-screen').classList.add('hidden');
            document.getElementById('desktop').classList.remove('hidden');
            
            document.getElementById('userInitial').textContent = username[0].toUpperCase();
            
            this.showNotification('Аккаунт успешно создан!', 'success');
            
            // Создание начальных файлов
            this.createInitialFiles();
            
        } catch (error) {
            this.showError('Ошибка регистрации: ' + error.message, 'REG001');
        } finally {
            btn.querySelector('span').classList.remove('hidden');
            btn.querySelector('.btn-loader').classList.add('hidden');
        }
    }

    createInitialFiles() {
        this.files = [
            { name: 'Документы', type: 'folder', path: '/Documents', items: [] },
            { name: 'Загрузки', type: 'folder', path: '/Downloads', items: [] },
            { name: 'Изображения', type: 'folder', path: '/Pictures', items: [] },
            { name: 'Музыка', type: 'folder', path: '/Music', items: [] },
            { name: 'Видео', type: 'folder', path: '/Videos', items: [] },
            { name: 'README.txt', type: 'file', path: '/README.txt', content: 'Добро пожаловать в SoinLinkx OS!' }
        ];
        
        localStorage.setItem('soinlinkx_files', JSON.stringify(this.files));
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        // Проверка локального пользователя
        const session = localStorage.getItem('soinlinkx_session');
        if (session) {
            const data = JSON.parse(session);
            if (data.user.username === username) {
                this.user = data.user;
                this.userId = data.userId;
                
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('desktop').classList.remove('hidden');
                
                document.getElementById('userInitial').textContent = username[0].toUpperCase();
                
                this.showNotification('Вход выполнен успешно', 'success');
                return;
            }
        }
        
        this.showError('Неверное имя пользователя или пароль', 'AUTH003');
    }

    async syncWithServer() {
        if (!this.networkStatus || !this.userId) return;
        
        try {
            const response = await fetch(`/api/sync/${this.userId}`);
            if (response.ok) {
                const data = await response.json();
                
                if (data.files) {
                    this.files = data.files;
                    localStorage.setItem('soinlinkx_files', JSON.stringify(this.files));
                }
                
                if (data.settings) {
                    this.settings = { ...this.settings, ...data.settings };
                }
                
                this.showNotification('Синхронизация завершена', 'success');
            }
        } catch (error) {
            console.log('Sync error:', error);
        }
    }

    launchApp(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) {
            this.showError(`Приложение ${appId} не найдено`, 'APP404');
            return;
        }
        
        // Проверяем, не запущено ли уже
        const existingWindow = this.windows.find(w => w.appId === appId && !w.minimized);
        if (existingWindow) {
            this.focusWindow(existingWindow.id);
            return;
        }
        
        // Создаем окно
        const windowId = 'window-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const windowEl = document.createElement('div');
        windowEl.className = 'window';
        windowEl.id = windowId;
        windowEl.style.left = (50 + this.windows.length * 30) + 'px';
        windowEl.style.top = (50 + this.windows.length * 30) + 'px';
        windowEl.style.width = '800px';
        windowEl.style.height = '600px';
        windowEl.style.zIndex = ++this.windowZIndex;
        
        windowEl.innerHTML = `
            <div class="window-header">
                <div class="window-title">
                    <span>${app.icon}</span>
                    <span>${app.name}</span>
                </div>
                <div class="window-controls">
                    <span onclick="os.minimizeWindow('${windowId}')">─</span>
                    <span onclick="os.maximizeWindow('${windowId}')">□</span>
                    <span class="close" onclick="os.closeWindow('${windowId}')">✕</span>
                </div>
            </div>
            <div class="window-content" id="${windowId}-content">
                <div class="app-loading">
                    <div class="loader"></div>
                    <div>Загрузка ${app.name}...</div>
                </div>
            </div>
        `;
        
        document.getElementById('windows-container').appendChild(windowEl);
        
        this.windows.push({
            id: windowId,
            appId: appId,
            name: app.name,
            icon: app.icon,
            minimized: false,
            maximized: false,
            element: windowEl
        });
        
        this.updateTaskbar();
        this.makeWindowDraggable(windowEl);
        
        // Загружаем контент приложения
        setTimeout(() => {
            this.loadAppContent(appId, windowId);
        }, 500);
    }

    loadAppContent(appId, windowId) {
        const content = document.getElementById(windowId + '-content');
        if (!content) return;
        
        switch(appId) {
            case 'terminal':
                content.innerHTML = this.renderTerminal();
                break;
            case 'file-manager':
                content.innerHTML = this.renderFileManager();
                break;
            case 'browser':
                content.innerHTML = this.renderBrowser();
                break;
            case 'store':
                content.innerHTML = this.renderStore();
                break;
            case 'soin-ui':
                content.innerHTML = this.renderSoinUI();
                break;
            case 'calculator':
                content.innerHTML = this.renderCalculator();
                break;
            case 'notes':
                content.innerHTML = this.renderNotes();
                break;
            case 'settings':
                content.innerHTML = this.renderSettings();
                break;
            case 'package-manager':
                content.innerHTML = this.renderPackageManager();
                break;
            default:
                content.innerHTML = `
                    <div style="padding: 20px; text-align: center;">
                        <h2>${appId}</h2>
                        <p>Приложение в разработке</p>
                        <button onclick="os.closeWindow('${windowId}')">Закрыть</button>
                    </div>
                `;
        }
        
        // Инициализируем обработчики для приложения
        this.initAppHandlers(appId, windowId);
    }

    renderTerminal() {
        return `
            <div class="terminal" id="terminal-${Date.now()}">
                <div class="terminal-header">
                    <span>SoinLinkx Terminal v2.0</span>
                    <span>${this.user?.username || 'guest'}@soinlinkx</span>
                </div>
                <div class="terminal-output" id="terminal-output">
                    <div>Добро пожаловать в SoinLinkx OS Terminal</div>
                    <div>Введите 'help' для списка команд</div>
                    <div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
                </div>
                <div class="terminal-input-line">
                    <span class="terminal-prompt">${this.user?.username || 'guest'}@soinlinkx:~$</span>
                    <input type="text" class="terminal-input" id="terminal-input" autofocus>
                </div>
            </div>
        `;
    }

    renderFileManager() {
        return `
            <div class="file-manager">
                <div class="file-manager-toolbar">
                    <button onclick="os.goBack()">←</button>
                    <button onclick="os.goForward()">→</button>
                    <button onclick="os.refreshFolder()">↻</button>
                    <input type="text" class="path-bar" value="/home/${this.user?.username || 'user'}" readonly>
                    <button onclick="os.createNewFolder()">📁 Новая папка</button>
                    <button onclick="os.uploadFile()">📤 Загрузить</button>
                </div>
                <div class="file-manager-sidebar">
                    <div class="sidebar-item active">🏠 Главная</div>
                    <div class="sidebar-item">📁 Документы</div>
                    <div class="sidebar-item">📥 Загрузки</div>
                    <div class="sidebar-item">🖼️ Изображения</div>
                    <div class="sidebar-item">🎵 Музыка</div>
                    <div class="sidebar-item">🎥 Видео</div>
                    <div class="sidebar-item">🗑️ Корзина</div>
                </div>
                <div class="file-manager-content" id="fileList">
                    ${this.renderFileList()}
                </div>
            </div>
        `;
    }

    renderFileList() {
        let html = '';
        this.files.forEach(file => {
            html += `
                <div class="file-item" ondblclick="os.openFile('${file.path}')">
                    <span class="file-icon">${file.type === 'folder' ? '📁' : '📄'}</span>
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${file.type === 'folder' ? '—' : '1.2 KB'}</span>
                    <span class="file-date">${new Date().toLocaleDateString()}</span>
                </div>
            `;
        });
        return html;
    }

    renderBrowser() {
        return `
            <div class="browser">
                <div class="browser-toolbar">
                    <button onclick="os.browserBack()">←</button>
                    <button onclick="os.browserForward()">→</button>
                    <button onclick="os.browserRefresh()">↻</button>
                    <input type="text" class="browser-url" value="https://soinlinkx.local" id="browserUrl">
                    <button onclick="os.browserGo()">Перейти</button>
                </div>
                <div class="browser-content" id="browserContent">
                    <div style="text-align: center; padding: 50px;">
                        <h1>SoinLinkx Browser</h1>
                        <p>Введите URL для начала работы</p>
                        <div class="quick-links">
                            <div class="quick-link" onclick="os.browserNavigate('https://google.com')">Google</div>
                            <div class="quick-link" onclick="os.browserNavigate('https://github.com')">GitHub</div>
                            <div class="quick-link" onclick="os.browserNavigate('https://soinlinkx.com')">SoinLinkx</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderStore() {
        return `
            <div class="store">
                <div class="store-header">
                    <h2>SoinStore</h2>
                    <input type="text" placeholder="Поиск приложений..." id="storeSearch">
                </div>
                <div class="store-categories">
                    <div class="store-category active">Все</div>
                    <div class="store-category">Популярные</div>
                    <div class="store-category">Новые</div>
                    <div class="store-category">Обновления</div>
                </div>
                <div class="store-grid" id="storeGrid">
                    ${this.renderStoreApps()}
                </div>
            </div>
        `;
    }

    renderStoreApps() {
        const storeApps = [
            { name: 'Terminal Pro', icon: '⌨️', desc: 'Профессиональный терминал', price: 'Бесплатно' },
            { name: 'Code Editor', icon: '📟', desc: 'Редактор кода', price: '299 ₽' },
            { name: 'Media Player', icon: '🎬', desc: 'Видеоплеер', price: 'Бесплатно' },
            { name: 'Games Pack', icon: '🎮', desc: 'Сборник игр', price: '499 ₽' },
            { name: 'Office Suite', icon: '📊', desc: 'Офисный пакет', price: '999 ₽' },
            { name: 'Photo Editor', icon: '🖼️', desc: 'Редактор фото', price: '199 ₽' }
        ];
        
        let html = '';
        storeApps.forEach(app => {
            html += `
                <div class="store-app-card" onclick="os.installApp('${app.name}')">
                    <span class="app-icon-large">${app.icon}</span>
                    <h3>${app.name}</h3>
                    <p>${app.desc}</p>
                    <span class="app-price">${app.price}</span>
                </div>
            `;
        });
        return html;
    }

    renderSoinUI() {
        return `
            <div class="soin-ui-container">
                <div class="soin-ui-phone">
                    <div class="soin-ui-status">
                        <span>${new Date().toLocaleTimeString()}</span>
                        <span>📶 🔋 ${this.batteryLevel}%</span>
                    </div>
                    <div class="soin-ui-screen">
                        <div class="soin-ui-app-grid">
                            <div class="soin-ui-app" onclick="os.launchApp('phone')">
                                <span>📞</span>
                                <span>Телефон</span>
                            </div>
                            <div class="soin-ui-app" onclick="os.launchApp('messages')">
                                <span>💬</span>
                                <span>Сообщения</span>
                            </div>
                            <div class="soin-ui-app" onclick="os.launchApp('contacts')">
                                <span>👥</span>
                                <span>Контакты</span>
                            </div>
                            <div class="soin-ui-app" onclick="os.launchApp('camera')">
                                <span>📷</span>
                                <span>Камера</span>
                            </div>
                            <div class="soin-ui-app" onclick="os.launchApp('gallery')">
                                <span>🖼️</span>
                                <span>Галерея</span>
                            </div>
                            <div class="soin-ui-app" onclick="os.launchApp('music')">
                                <span>🎵</span>
                                <span>Музыка</span>
                            </div>
                            <div class="soin-ui-app" onclick="os.launchApp('settings')">
                                <span>⚙️</span>
                                <span>Настройки</span>
                            </div>
                            <div class="soin-ui-app" onclick="os.launchApp('browser')">
                                <span>🌐</span>
                                <span>Браузер</span>
                            </div>
                        </div>
                    </div>
                    <div class="soin-ui-home-button" onclick="os.soinUIHome()">
                        <div class="home-indicator"></div>
                    </div>
                </div>
            </div>
        `;
    }

    renderCalculator() {
        return `
            <div class="calculator">
                <div class="calc-display" id="calcDisplay">0</div>
                <div class="calc-buttons">
                    <button onclick="os.calcInput('C')" class="calc-clear">C</button>
                    <button onclick="os.calcInput('±')">±</button>
                    <button onclick="os.calcInput('%')">%</button>
                    <button onclick="os.calcInput('/')" class="calc-operator">÷</button>
                    
                    <button onclick="os.calcInput('7')">7</button>
                    <button onclick="os.calcInput('8')">8</button>
                    <button onclick="os.calcInput('9')">9</button>
                    <button onclick="os.calcInput('*')" class="calc-operator">×</button>
                    
                    <button onclick="os.calcInput('4')">4</button>
                    <button onclick="os.calcInput('5')">5</button>
                    <button onclick="os.calcInput('6')">6</button>
                    <button onclick="os.calcInput('-')" class="calc-operator">−</button>
                    
                    <button onclick="os.calcInput('1')">1</button>
                    <button onclick="os.calcInput('2')">2</button>
                    <button onclick="os.calcInput('3')">3</button>
                    <button onclick="os.calcInput('+')" class="calc-operator">+</button>
                    
                    <button onclick="os.calcInput('0')" class="calc-zero">0</button>
                    <button onclick="os.calcInput('.')">.</button>
                    <button onclick="os.calcInput('=')" class="calc-equals">=</button>
                </div>
            </div>
        `;
    }

    renderNotes() {
        return `
            <div class="notes-app">
                <div class="notes-sidebar">
                    <button onclick="os.createNewNote()" class="new-note-btn">➕ Новая заметка</button>
                    <div class="notes-list">
                        <div class="note-item active">Заметка 1</div>
                        <div class="note-item">Заметка 2</div>
                        <div class="note-item">Заметка 3</div>
                    </div>
                </div>
                <div class="notes-editor">
                    <input type="text" class="note-title" value="Заметка 1" placeholder="Заголовок">
                    <textarea class="note-content" placeholder="Введите текст заметки...">Это пример заметки в SoinLinkx OS</textarea>
                </div>
            </div>
        `;
    }

    renderSettings() {
        return `
            <div class="settings-app">
                <div class="settings-sidebar">
                    <div class="settings-category active" onclick="os.showSettingsCategory('personal')">
                        <span>👤</span> Личные данные
                    </div>
                    <div class="settings-category" onclick="os.showSettingsCategory('appearance')">
                        <span>🎨</span> Внешний вид
                    </div>
                    <div class="settings-category" onclick="os.showSettingsCategory('system')">
                        <span>⚙️</span> Система
                    </div>
                    <div class="settings-category" onclick="os.showSettingsCategory('network')">
                        <span>📶</span> Сеть
                    </div>
                    <div class="settings-category" onclick="os.showSettingsCategory('privacy')">
                        <span>🔒</span> Приватность
                    </div>
                    <div class="settings-category" onclick="os.showSettingsCategory('updates')">
                        <span>🔄</span> Обновления
                    </div>
                </div>
                <div class="settings-content" id="settingsContent">
                    ${this.renderPersonalSettings()}
                </div>
            </div>
        `;
    }

    renderPersonalSettings() {
        return `
            <div class="settings-section">
                <h2>Личные данные</h2>
                <div class="settings-item">
                    <label>Имя пользователя</label>
                    <input type="text" value="${this.user?.username || ''}" readonly>
                </div>
                <div class="settings-item">
                    <label>Email</label>
                    <input type="email" value="${this.user?.email || ''}" placeholder="не указан">
                </div>
                <div class="settings-item">
                    <label>Пароль</label>
                    <button onclick="os.changePassword()">Изменить пароль</button>
                </div>
                <div class="settings-item">
                    <label>Аватар</label>
                    <button onclick="os.changeAvatar()">Загрузить фото</button>
                </div>
            </div>
        `;
    }

    renderPackageManager() {
        return `
            <div class="package-manager">
                <div class="package-header">
                    <h2>SoinPackage Manager</h2>
                    <div class="package-search">
                        <input type="text" placeholder="Поиск пакетов..." id="packageSearch">
                    </div>
                </div>
                <div class="package-tabs">
                    <div class="package-tab active" onclick="os.showPackageTab('installed')">Установленные</div>
                    <div class="package-tab" onclick="os.showPackageTab('available')">Доступные</div>
                    <div class="package-tab" onclick="os.showPackageTab('updates')">Обновления</div>
                </div>
                <div class="package-list" id="packageList">
                    ${this.renderInstalledPackages()}
                </div>
            </div>
        `;
    }

    renderInstalledPackages() {
        const packages = [
            { name: 'core-system', version: '2.0.0', size: '245 MB', description: 'Базовые компоненты системы' },
            { name: 'terminal-base', version: '1.5.2', size: '12 MB', description: 'Базовый терминал' },
            { name: 'file-manager', version: '1.2.0', size: '8 MB', description: 'Файловый менеджер' },
            { name: 'soin-ui-base', version: '2.1.0', size: '156 MB', description: 'Базовые компоненты SoinUI' }
        ];
        
        let html = '';
        packages.forEach(pkg => {
            html += `
                <div class="package-item">
                    <div class="package-info">
                        <strong>${pkg.name}</strong>
                        <span class="package-version">v${pkg.version}</span>
                        <span class="package-size">${pkg.size}</span>
                        <p>${pkg.description}</p>
                    </div>
                    <div class="package-actions">
                        <button onclick="os.removePackage('${pkg.name}')" class="danger-btn">Удалить</button>
                    </div>
                </div>
            `;
        });
        return html;
    }

    initAppHandlers(appId, windowId) {
        switch(appId) {
            case 'terminal':
                this.initTerminal(windowId);
                break;
            case 'calculator':
                this.initCalculator(windowId);
                break;
            case 'browser':
                this.initBrowser(windowId);
                break;
        }
    }

    initTerminal(windowId) {
        const input = document.getElementById('terminal-input');
        if (!input) return;
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleTerminalCommand(input.value, windowId);
            }
        });
        
        input.focus();
    }

    handleTerminalCommand(cmd, windowId) {
        const output = document.getElementById('terminal-output');
        const input = document.getElementById('terminal-input');
        
        if (!output || !input) return;
        
        // Добавляем команду в вывод
        const cmdLine = document.createElement('div');
        cmdLine.innerHTML = `<span style="color: #00ff00">$ ${cmd}</span>`;
        output.appendChild(cmdLine);
        
        // Обработка команд
        let result = '';
        const parts = cmd.split(' ');
        const command = parts[0].toLowerCase();
        
        // Проверка на опасные команды
        if (this.isDangerousCommand(cmd)) {
            this.showError('Обнаружена потенциально опасная команда!', 'SEC001');
            result = 'Команда заблокирована системой безопасности';
            this.logError('SEC001', `Опасная команда: ${cmd}`);
        } else {
            switch(command) {
                case 'help':
                    result = `Доступные команды:
                    help - показать справку
                    clear - очистить терминал
                    ls - список файлов
                    cd - сменить директорию
                    pwd - текущая директория
                    cat - показать файл
                    echo - вывести текст
                    date - показать дату
                    whoami - текущий пользователь
                    ps - список процессов
                    kill - завершить процесс
                    install - установить пакет
                    remove - удалить пакет
                    update - обновить систему
                    network - информация о сети
                    battery - состояние батареи
                    theme - сменить тему
                    reboot - перезагрузка
                    shutdown - выключение`;
                    break;
                    
                case 'clear':
                    output.innerHTML = '';
                    result = '';
                    break;
                    
                case 'ls':
                    result = 'Documents  Downloads  Pictures  Music  Videos  Desktop  README.txt';
                    break;
                    
                case 'pwd':
                    result = `/home/${this.user?.username || 'guest'}`;
                    break;
                    
                case 'date':
                    result = new Date().toString();
                    break;
                    
                case 'whoami':
                    result = this.user?.username || 'guest';
                    break;
                    
                case 'echo':
                    result = parts.slice(1).join(' ');
                    break;
                    
                case 'ps':
                    result = `  PID  COMMAND
  1    init
  2    kernel
  ${Math.floor(Math.random() * 1000)}  terminal
  ${Math.floor(Math.random() * 1000)}  file-manager`;
                    break;
                    
                case 'network':
                    result = `Статус: ${this.networkStatus ? 'Онлайн' : 'Оффлайн'}
IP: ${this.networkStatus ? '192.168.1.' + Math.floor(Math.random() * 255) : '0.0.0.0'}
Скорость: 100 Mbps`;
                    break;
                    
                case 'battery':
                    result = `Уровень: ${this.batteryLevel}%
Состояние: ${this.batteryLevel > 20 ? 'Хорошее' : 'Низкое'}`;
                    break;
                    
                case 'theme':
                    if (parts[1]) {
                        const themes = ['dark', 'light', 'soin', 'hacker', 'amethyst'];
                        if (themes.includes(parts[1])) {
                            this.theme = parts[1];
                            this.applyTheme();
                            result = `Тема изменена на ${parts[1]}`;
                        } else {
                            result = `Доступные темы: ${themes.join(', ')}`;
                        }
                    } else {
                        result = `Текущая тема: ${this.theme}`;
                    }
                    break;
                    
                case 'install':
                    if (parts[1]) {
                        result = `Установка пакета ${parts[1]}...`;
                        setTimeout(() => {
                            this.showNotification(`Пакет ${parts[1]} установлен`, 'success');
                        }, 2000);
                    } else {
                        result = 'Использование: install <package>';
                    }
                    break;
                    
                case 'remove':
                    if (parts[1]) {
                        result = `Удаление пакета ${parts[1]}...`;
                    } else {
                        result = 'Использование: remove <package>';
                    }
                    break;
                    
                case 'update':
                    result = 'Проверка обновлений...';
                    setTimeout(() => {
                        this.showNotification('Система обновлена до последней версии', 'success');
                    }, 3000);
                    break;
                    
                case 'reboot':
                    result = 'Перезагрузка системы...';
                    setTimeout(() => {
                        this.reboot();
                    }, 2000);
                    break;
                    
                case 'shutdown':
                    result = 'Завершение работы...';
                    setTimeout(() => {
                        this.shutdown();
                    }, 2000);
                    break;
                    
                default:
                    result = `Команда не найдена: ${command}. Введите 'help' для справки.`;
            }
        }
        
        if (result) {
            const resultLine = document.createElement('div');
            resultLine.textContent = result;
            resultLine.style.whiteSpace = 'pre';
            output.appendChild(resultLine);
        }
        
        // Очищаем ввод
        input.value = '';
        
        // Прокрутка вниз
        output.scrollTop = output.scrollHeight;
    }

    isDangerousCommand(cmd) {
        const dangerous = [
            'rm -rf',
            'sudo',
            'chmod 777',
            'dd if=',
            'mkfs',
            'format',
            ':(){ :|:& };:',
            '> /dev/sda',
            'mv / /dev/null',
            'wget http://malware',
            'curl http://malware | sh'
        ];
        
        return dangerous.some(d => cmd.includes(d));
    }

    initCalculator(windowId) {
        let currentValue = '0';
        let operator = null;
        let previousValue = null;
        
        window.calcInput = (value) => {
            const display = document.getElementById('calcDisplay');
            if (!display) return;
            
            if (value === 'C') {
                currentValue = '0';
                operator = null;
                previousValue = null;
            } else if (value === '=') {
                if (previousValue !== null && operator) {
                    const num1 = parseFloat(previousValue);
                    const num2 = parseFloat(currentValue);
                    
                    switch(operator) {
                        case '+': currentValue = (num1 + num2).toString(); break;
                        case '-': currentValue = (num1 - num2).toString(); break;
                        case '*': currentValue = (num1 * num2).toString(); break;
                        case '/': currentValue = (num1 / num2).toString(); break;
                        case '%': currentValue = (num1 % num2).toString(); break;
                    }
                    
                    operator = null;
                    previousValue = null;
                }
            } else if (['+', '-', '*', '/', '%'].includes(value)) {
                if (previousValue === null) {
                    previousValue = currentValue;
                    currentValue = '0';
                    operator = value;
                }
            } else {
                if (currentValue === '0' && value !== '.') {
                    currentValue = value;
                } else {
                    currentValue += value;
                }
            }
            
            display.textContent = currentValue;
        };
    }

    initBrowser(windowId) {
        window.browserGo = () => {
            const url = document.getElementById('browserUrl').value;
            this.browserNavigate(url);
        };
        
        window.browserBack = () => {
            this.showNotification('Навигация назад', 'info');
        };
        
        window.browserForward = () => {
            this.showNotification('Навигация вперед', 'info');
        };
        
        window.browserRefresh = () => {
            const content = document.getElementById('browserContent');
            if (content) {
                content.innerHTML = '<div style="text-align: center; padding: 50px;">Загрузка...</div>';
                setTimeout(() => {
                    content.innerHTML = '<div style="text-align: center; padding: 50px;">Страница обновлена</div>';
                }, 1000);
            }
        };
    }

    browserNavigate(url) {
        const content = document.getElementById('browserContent');
        if (!content) return;
        
        content.innerHTML = '<div style="text-align: center; padding: 50px;">Загрузка ' + url + '...</div>';
        
        // Имитация загрузки
        setTimeout(() => {
            if (url.includes('google')) {
                content.innerHTML = `
                    <div style="text-align: center; padding: 50px;">
                        <h1 style="color: #4285f4;">Google</h1>
                        <input type="text" style="width: 80%; padding: 10px; margin: 20px;" placeholder="Поиск в Google">
                        <div>
                            <button>Поиск в Google</button>
                            <button>Мне повезёт</button>
                        </div>
                    </div>
                `;
            } else if (url.includes('github')) {
                content.innerHTML = `
                    <div style="padding: 20px;">
                        <h1>GitHub</h1>
                        <p>Репозитории:</p>
                        <ul>
                            <li>soinlinkx/os</li>
                            <li>soinlinkx/apps</li>
                            <li>soinlinkx/kernel</li>
                        </ul>
                    </div>
                `;
            } else {
                content.innerHTML = `
                    <div style="text-align: center; padding: 50px;">
                        <h1>${url}</h1>
                        <p>Страница загружена (демо-режим)</p>
                    </div>
                `;
            }
        }, 1500);
    }

    makeWindowDraggable(windowEl) {
        const header = windowEl.querySelector('.window-header');
        let offsetX, offsetY, mouseX, mouseY;
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.window-controls')) return;
            
            e.preventDefault();
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', stopDrag);
            
            // Поднимаем окно
            windowEl.style.zIndex = ++this.windowZIndex;
        });
        
        const drag = (e) => {
            e.preventDefault();
            
            if (windowEl.classList.contains('maximized')) return;
            
            offsetX = mouseX - e.clientX;
            offsetY = mouseY - e.clientY;
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            const newTop = windowEl.offsetTop - offsetY;
            const newLeft = windowEl.offsetLeft - offsetX;
            
            // Ограничения
            if (newTop >= 0 && newTop <= window.innerHeight - 100) {
                windowEl.style.top = newTop + 'px';
            }
            if (newLeft >= 0 && newLeft <= window.innerWidth - 100) {
                windowEl.style.left = newLeft + 'px';
            }
        };
        
        const stopDrag = () => {
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', stopDrag);
        };
    }

    minimizeWindow(windowId) {
        const windowEl = document.getElementById(windowId);
        const taskbarItem = document.querySelector(`[data-window="${windowId}"]`);
        
        if (windowEl) {
            windowEl.classList.add('minimized');
            const win = this.windows.find(w => w.id === windowId);
            if (win) win.minimized = true;
        }
        
        if (taskbarItem) {
            taskbarItem.classList.remove('active');
        }
    }

    maximizeWindow(windowId) {
        const windowEl = document.getElementById(windowId);
        
        if (windowEl) {
            if (windowEl.classList.contains('maximized')) {
                windowEl.classList.remove('maximized');
                const win = this.windows.find(w => w.id === windowId);
                if (win) win.maximized = false;
            } else {
                windowEl.classList.add('maximized');
                const win = this.windows.find(w => w.id === windowId);
                if (win) win.maximized = true;
            }
        }
    }

    closeWindow(windowId) {
        const windowEl = document.getElementById(windowId);
        if (windowEl) {
            windowEl.remove();
            this.windows = this.windows.filter(w => w.id !== windowId);
            this.updateTaskbar();
        }
    }

    focusWindow(windowId) {
        const windowEl = document.getElementById(windowId);
        if (windowEl) {
            windowEl.style.zIndex = ++this.windowZIndex;
            
            if (windowEl.classList.contains('minimized')) {
                windowEl.classList.remove('minimized');
                const win = this.windows.find(w => w.id === windowId);
                if (win) win.minimized = false;
            }
        }
    }

    updateTaskbar() {
        const taskbar = document.getElementById('taskbarItems');
        if (!taskbar) return;
        
        taskbar.innerHTML = '';
        
        this.windows.forEach(win => {
            const item = document.createElement('div');
            item.className = 'taskbar-item' + (win.minimized ? '' : ' active');
            item.setAttribute('data-window', win.id);
            item.onclick = () => {
                if (win.minimized) {
                    this.focusWindow(win.id);
                } else {
                    this.minimizeWindow(win.id);
                }
            };
            item.innerHTML = `
                <span>${win.icon}</span>
                <span>${win.name}</span>
            `;
            taskbar.appendChild(item);
        });
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        const id = 'notif-' + Date.now();
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.id = id;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <div class="notification-header">
                <span>${icons[type] || '📢'} ${type.toUpperCase()}</span>
                <span class="notification-close" onclick="os.closeNotification('${id}')">✕</span>
            </div>
            <div class="notification-message">${message}</div>
        `;
        
        container.appendChild(notification);
        
        // Автоматическое закрытие через 5 секунд
        setTimeout(() => {
            this.closeNotification(id);
        }, 5000);
        
        this.notifications.push({ id, message, type });
    }

    closeNotification(id) {
        const notif = document.getElementById(id);
        if (notif) {
            notif.remove();
            this.notifications = this.notifications.filter(n => n.id !== id);
        }
    }

    showError(message, code) {
        const dialog = document.getElementById('error-dialog');
        const errorMessage = document.getElementById('errorMessage');
        const errorDetails = document.getElementById('errorDetails');
        const errorCode = document.getElementById('errorCodeBadge');
        const errorSuggestion = document.getElementById('errorSuggestion');
        
        errorMessage.textContent = message;
        errorCode.textContent = code;
        errorDetails.textContent = `Время: ${new Date().toLocaleString()}\nПользователь: ${this.user?.username || 'guest'}\nВерсия: ${this.version}`;
        
        // Предложения по исправлению
        const suggestions = {
            'APP404': 'Попробуйте переустановить приложение через SoinStore',
            'AUTH001': 'Убедитесь, что пароли совпадают',
            'AUTH002': 'Используйте более надежный пароль',
            'AUTH003': 'Проверьте правильность ввода',
            'SEC001': 'Это действие заблокировано системой безопасности',
            'REG001': 'Проверьте подключение к интернету',
            'NET001': 'Проверьте сетевое подключение',
            'FS001': 'Недостаточно прав для доступа к файлу'
        };
        
        errorSuggestion.textContent = suggestions[code] || 'Попробуйте перезапустить приложение';
        
        dialog.classList.remove('hidden');
        
        // Логирование ошибки
        this.logError(code, message);
    }

    logError(code, message) {
        const error = {
            code,
            message,
            time: new Date().toISOString(),
            user: this.user?.username,
            stack: new Error().stack
        };
        
        this.errors.push(error);
        
        // Сохраняем в localStorage
        localStorage.setItem('soinlinkx_errors', JSON.stringify(this.errors));
        
        // Отправка на сервер если онлайн
        if (this.networkStatus && this.userId) {
            fetch('/api/log-error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    error
                })
            }).catch(() => {});
        }
    }

    closeErrorDialog() {
        document.getElementById('error-dialog').classList.add('hidden');
    }

    copyErrorDetails() {
        const details = document.getElementById('errorDetails').textContent;
        navigator.clipboard.writeText(details).then(() => {
            this.showNotification('Скопировано в буфер обмена', 'success');
        });
    }

    sendErrorReport() {
        this.showNotification('Отчет об ошибке отправлен разработчикам', 'success');
        this.closeErrorDialog();
    }

    toggleAppMenu() {
        const menu = document.getElementById('app-menu');
        menu.classList.toggle('hidden');
    }

    toggleUserMenu() {
        // Создаем меню пользователя если его нет
        let menu = document.getElementById('user-menu-panel');
        
        if (!menu) {
            menu = document.createElement('div');
            menu.id = 'user-menu-panel';
            menu.className = 'context-menu';
            menu.style.top = '50px';
            menu.style.right = '10px';
            menu.style.left = 'auto';
            
            menu.innerHTML = `
                <div class="context-menu-item" onclick="os.openProfile()">👤 Профиль</div>
                <div class="context-menu-item" onclick="os.openSettings()">⚙️ Настройки</div>
                <div class="context-menu-divider"></div>
                <div class="context-menu-item" onclick="os.lockScreen()">🔒 Заблокировать</div>
                <div class="context-menu-item" onclick="os.showShutdownDialog()">⏻ Выйти</div>
            `;
            
            document.body.appendChild(menu);
        }
        
        menu.classList.toggle('hidden');
    }

    openProfile() {
        this.launchApp('settings');
        this.showSettingsCategory('personal');
        document.getElementById('user-menu-panel')?.classList.add('hidden');
    }

    openSettings() {
        this.launchApp('settings');
        document.getElementById('user-menu-panel')?.classList.add('hidden');
    }

    showSettingsCategory(category) {
        const content = document.getElementById('settingsContent');
        if (!content) return;
        
        document.querySelectorAll('.settings-category').forEach(c => c.classList.remove('active'));
        event.target.closest('.settings-category').classList.add('active');
        
        switch(category) {
            case 'personal':
                content.innerHTML = this.renderPersonalSettings();
                break;
            case 'appearance':
                content.innerHTML = `
                    <div class="settings-section">
                        <h2>Внешний вид</h2>
                        <div class="settings-item">
                            <label>Тема оформления</label>
                            <select onchange="os.changeTheme(this.value)">
                                <option value="dark" ${this.theme === 'dark' ? 'selected' : ''}>Темная</option>
                                <option value="light" ${this.theme === 'light' ? 'selected' : ''}>Светлая</option>
                                <option value="soin" ${this.theme === 'soin' ? 'selected' : ''}>SoinUI</option>
                                <option value="hacker" ${this.theme === 'hacker' ? 'selected' : ''}>Хакерская</option>
                                <option value="amethyst" ${this.theme === 'amethyst' ? 'selected' : ''}>Аметист</option>
                            </select>
                        </div>
                        <div class="settings-item">
                            <label>Размер шрифта</label>
                            <input type="range" min="12" max="24" value="14" onchange="os.changeFontSize(this.value)">
                        </div>
                        <div class="settings-item">
                            <label>Анимации</label>
                            <label class="switch">
                                <input type="checkbox" checked onchange="os.toggleAnimations(this.checked)">
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>
                `;
                break;
            case 'system':
                content.innerHTML = `
                    <div class="settings-section">
                        <h2>Система</h2>
                        <div class="settings-item">
                            <label>Имя компьютера</label>
                            <input type="text" value="soinlinkx-${this.user?.username || 'pc'}">
                        </div>
                        <div class="settings-item">
                            <label>Автоматический вход</label>
                            <label class="switch">
                                <input type="checkbox" onchange="os.toggleAutoLogin(this.checked)">
                                <span class="slider"></span>
                            </label>
                        </div>
                        <div class="settings-item">
                            <label>Язык системы</label>
                            <select>
                                <option>Русский</option>
                                <option>English</option>
                            </select>
                        </div>
                        <div class="settings-item">
                            <button onclick="os.clearCache()">Очистить кэш</button>
                            <button onclick="os.checkUpdates()" class="primary-btn">Проверить обновления</button>
                        </div>
                    </div>
                `;
                break;
        }
    }

    changeTheme(theme) {
        this.theme = theme;
        this.applyTheme();
        
        // Сохраняем в настройки
        this.settings.theme = theme;
        localStorage.setItem('soinlinkx_settings', JSON.stringify(this.settings));
        
        this.showNotification(`Тема изменена на ${theme}`, 'success');
    }

    changeFontSize(size) {
        document.documentElement.style.fontSize = size + 'px';
    }

    toggleAnimations(enabled) {
        if (enabled) {
            document.body.classList.remove('no-animations');
        } else {
            document.body.classList.add('no-animations');
        }
    }

    clearCache() {
        localStorage.clear();
        this.showNotification('Кэш очищен', 'success');
    }

    checkUpdates() {
        this.showNotification('Проверка обновлений...', 'info');
        setTimeout(() => {
            this.showNotification('Система обновлена до последней версии', 'success');
        }, 2000);
    }

    showPackageTab(tab) {
        const list = document.getElementById('packageList');
        if (!list) return;
        
        document.querySelectorAll('.package-tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
        
        if (tab === 'installed') {
            list.innerHTML = this.renderInstalledPackages();
        } else if (tab === 'available') {
            list.innerHTML = `
                <div class="package-item">
                    <div class="package-info">
                        <strong>dev-tools</strong>
                        <span class="package-version">v1.8.0</span>
                        <span class="package-size">45 MB</span>
                        <p>Инструменты разработчика</p>
                    </div>
                    <div class="package-actions">
                        <button onclick="os.installPackage('dev-tools')" class="primary-btn">Установить</button>
                    </div>
                </div>
                <div class="package-item">
                    <div class="package-info">
                        <strong>media-player</strong>
                        <span class="package-version">v2.3.1</span>
                        <span class="package-size">28 MB</span>
                        <p>Медиаплеер</p>
                    </div>
                    <div class="package-actions">
                        <button onclick="os.installPackage('media-player')" class="primary-btn">Установить</button>
                    </div>
                </div>
            `;
        } else if (tab === 'updates') {
            list.innerHTML = `
                <div class="package-item">
                    <div class="package-info">
                        <strong>core-system</strong>
                        <span class="package-version">2.0.0 → 2.1.0</span>
                        <span class="package-size">15 MB</span>
                        <p>Обновление безопасности</p>
                    </div>
                    <div class="package-actions">
                        <button onclick="os.updatePackage('core-system')" class="primary-btn">Обновить</button>
                    </div>
                </div>
            `;
        }
    }

    installPackage(name) {
        this.showNotification(`Установка ${name}...`, 'info');
        setTimeout(() => {
            this.showNotification(`${name} успешно установлен`, 'success');
        }, 2000);
    }

    removePackage(name) {
        if (confirm(`Удалить пакет ${name}?`)) {
            this.showNotification(`Удаление ${name}...`, 'info');
            setTimeout(() => {
                this.showNotification(`${name} удален`, 'success');
            }, 1000);
        }
    }

    updatePackage(name) {
        this.showNotification(`Обновление ${name}...`, 'info');
        setTimeout(() => {
            this.showNotification(`${name} обновлен до последней версии`, 'success');
        }, 2000);
    }

    createNewFolder() {
        const name = prompt('Введите имя папки:');
        if (name) {
            this.files.push({
                name: name,
                type: 'folder',
                path: `/${name}`,
                items: []
            });
            this.showNotification(`Папка ${name} создана`, 'success');
            this.refreshFileList();
        }
    }

    createNewFile() {
        const name = prompt('Введите имя файла:');
        if (name) {
            this.files.push({
                name: name,
                type: 'file',
                path: `/${name}`,
                content: ''
            });
            this.showNotification(`Файл ${name} создан`, 'success');
            this.refreshFileList();
        }
    }

    createNewNote() {
        this.showNotification('Новая заметка создана', 'success');
    }

    uploadFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        
        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            this.showUploadProgress(files);
        };
        
        input.click();
    }

    showUploadProgress(files) {
        const progress = document.getElementById('upload-progress');
        const filename = document.getElementById('uploadFilename');
        const progressBar = document.getElementById('uploadProgressBar');
        const speed = document.getElementById('uploadSpeed');
        
        progress.classList.remove('hidden');
        
        files.forEach((file, index) => {
            filename.textContent = file.name;
            
            let loaded = 0;
            const interval = setInterval(() => {
                loaded += 10;
                progressBar.style.width = loaded + '%';
                speed.textContent = `Скорость: ${Math.floor(Math.random() * 1000)} KB/s`;
                
                if (loaded >= 100) {
                    clearInterval(interval);
                    
                    if (index === files.length - 1) {
                        setTimeout(() => {
                            progress.classList.add('hidden');
                            this.showNotification('Загрузка завершена', 'success');
                            this.refreshFileList();
                        }, 1000);
                    }
                }
            }, 200);
        });
    }

    refreshFileList() {
        const fileList = document.getElementById('fileList');
        if (fileList) {
            fileList.innerHTML = this.renderFileList();
        }
    }

    openFile(path) {
        const file = this.files.find(f => f.path === path);
        if (file) {
            if (file.type === 'folder') {
                this.showNotification(`Открыта папка: ${file.name}`, 'info');
            } else {
                this.showNotification(`Открыт файл: ${file.name}`, 'info`);
                // Здесь можно открыть редактор
            }
        }
    }

    refreshDesktop() {
        this.showNotification('Рабочий стол обновлен', 'success');
    }

    changeWallpaper() {
        const wallpapers = [
            'url(https://images.unsplash.com/photo-1541701494587-cb58502866ab)',
            'url(https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05)',
            'url(https://images.unsplash.com/photo-1441974231531-c6227db76b6e)'
        ];
        
        const random = wallpapers[Math.floor(Math.random() * wallpapers.length)];
        document.getElementById('desktop-workspace').style.backgroundImage = random;
        
        this.showNotification('Обои изменены', 'success');
    }

    openTerminal() {
        this.launchApp('terminal');
    }

    lockScreen() {
        this.showNotification('Экран заблокирован', 'info');
        setTimeout(() => {
            document.getElementById('desktop').classList.add('hidden');
            document.getElementById('login-screen').classList.remove('hidden');
        }, 1000);
    }

    showShutdownDialog() {
        document.getElementById('shutdown-dialog').classList.remove('hidden');
        document.getElementById('user-menu-panel')?.classList.add('hidden');
    }

    closeShutdownDialog() {
        document.getElementById('shutdown-dialog').classList.add('hidden');
    }

    shutdown() {
        this.showNotification('Завершение работы...', 'warning');
        
        // Сохраняем состояние
        localStorage.setItem('soinlinkx_files', JSON.stringify(this.files));
        
        setTimeout(() => {
            document.getElementById('desktop').classList.add('hidden');
            document.getElementById('boot-screen').classList.remove('hidden');
            document.getElementById('boot-screen').querySelector('.boot-status').textContent = 'Завершение работы...';
            
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }, 1000);
    }

    reboot() {
        this.showNotification('Перезагрузка системы...', 'warning');
        
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }

    soinUIHome() {
        this.showNotification('Возврат на главный экран', 'info');
    }

    showCalendar() {
        this.showNotification('Календарь', 'info');
    }

    showNotifications() {
        if (this.notifications.length === 0) {
            this.showNotification('Нет новых уведомлений', 'info');
        } else {
            this.notifications.forEach(n => {
                this.showNotification(n.message, n.type);
            });
        }
    }

    showNetworkMenu() {
        this.showNotification(`Сеть: ${this.networkStatus ? 'Подключено' : 'Отключено'}`, 'info');
    }

    showVolumeMenu() {
        this.showNotification('Громкость: 50%', 'info');
    }

    showBluetoothMenu() {
        this.showNotification('Bluetooth: Вкл', 'info');
    }

    toggleSoundMenu() {
        const icon = document.getElementById('soundIcon');
        if (icon.textContent === '🔊') {
            icon.textContent = '🔇';
            this.showNotification('Звук выключен', 'info');
        } else {
            icon.textContent = '🔊';
            this.showNotification('Звук включен', 'info');
        }
    }
}

// Инициализация ОС
const os = new SoinLinkxOS();

// Глобальные функции для обработчиков событий
window.os = os;

// Обработчики форм
document.getElementById('setup-form')?.addEventListener('submit', (e) => os.handleRegistration(e));
document.getElementById('login-form')?.addEventListener('submit', (e) => os.handleLogin(e));

// Переключение между экранами
document.getElementById('show-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
});

document.getElementById('show-signup')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');
});

// Глобальные функции для HTML-вызовов
window.toggleAppMenu = () => os.toggleAppMenu();
window.toggleUserMenu = () => os.toggleUserMenu();
window.launchApp = (appId) => os.launchApp(appId);
window.showShutdownDialog = () => os.showShutdownDialog();
window.closeShutdownDialog = () => os.closeShutdownDialog();
window.shutdown = () => os.shutdown();
window.lockScreen = () => os.lockScreen();
window.showCalendar = () => os.showCalendar();
window.showNotifications = () => os.showNotifications();
window.showNetworkMenu = () => os.showNetworkMenu();
window.showVolumeMenu = () => os.showVolumeMenu();
window.showBluetoothMenu = () => os.showBluetoothMenu();
window.toggleSoundMenu = () => os.toggleSoundMenu();
window.closeError = () => os.closeErrorDialog();
window.copyErrorDetails = () => os.copyErrorDetails();
window.sendErrorReport = () => os.sendErrorReport();
window.installApp = (appName) => os.installPackage(appName);
window.removePackage = (name) => os.removePackage(name);
window.updatePackage = (name) => os.updatePackage(name);
window.createNewFolder = () => os.createNewFolder();
window.createNewFile = () => os.createNewFile();
window.refreshDesktop = () => os.refreshDesktop();
window.changeWallpaper = () => os.changeWallpaper();
window.openTerminal = () => os.openTerminal();
window.openSettings = () => os.openSettings();
window.uploadFile = () => os.uploadFile();
window.openFile = (path) => os.openFile(path);
