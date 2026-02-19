const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// ОТДАЕМ СТАТИЧЕСКИЕ ФАЙЛЫ ИЗ ПАПКИ PUBLIC
app.use(express.static(path.join(__dirname, 'public')));

// Если нет public/index.html, создаем его
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// Создание index.html если его нет
const indexPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(indexPath)) {
    const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SoinLinkx OS</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app">
        <h1>Загрузка SoinLinkx OS...</h1>
    </div>
    <script src="os.js"></script>
</body>
</html>`;
    fs.writeFileSync(indexPath, htmlContent);
}

// Хранилище данных
const users = new Map();
const sessions = new Map();
const packages = new Map();
const stats = {
    startTime: Date.now(),
    totalRequests: 0,
    activeSessions: 0,
    totalUsers: 0
};

// Инициализация пакетов
function initPackages() {
    const packagesList = [
        {
            id: 'core-system',
            name: 'Базовые компоненты системы',
            version: '2.0.0',
            size: 245,
            dependencies: [],
            description: 'Ядро и основные библиотеки SoinLinkx OS',
            author: 'Soinnofi',
            license: 'MIT',
            downloads: 15420
        },
        {
            id: 'terminal-pro',
            name: 'Terminal Pro',
            version: '1.8.5',
            size: 18,
            dependencies: ['core-system'],
            description: 'Профессиональный терминал с расширенными возможностями',
            author: 'Soinnofi',
            license: 'MIT',
            downloads: 8920
        }
    ];
    
    packagesList.forEach(pkg => packages.set(pkg.id, pkg));
}

initPackages();

// Создание директорий
const dirs = ['logs', 'user_data', 'packages', 'backups', 'temp'];
dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
});

// Логирование
function log(level, message, data = {}) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...data
    };
    
    const logFile = path.join(__dirname, 'logs', `server_${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFile(logFile, JSON.stringify(logEntry) + '\n', (err) => {
        if (err) console.error('Error writing log:', err);
    });
    
    if (level === 'error') {
        console.error(`[${level.toUpperCase()}] ${message}`, data);
    } else {
        console.log(`[${level.toUpperCase()}] ${message}`);
    }
}

// Middleware для логирования запросов
app.use((req, res, next) => {
    stats.totalRequests++;
    log('info', `${req.method} ${req.url}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    next();
});

// Регистрация пользователя
app.post('/api/register', (req, res) => {
    const { username, password, email, theme } = req.body;
    
    if (!username || !password) {
        log('warn', 'Registration failed: missing fields', { username });
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Проверка существования
    for (let [id, user] of users) {
        if (user.username === username) {
            log('warn', 'Registration failed: username exists', { username });
            return res.status(400).json({ error: 'Username already exists' });
        }
    }
    
    const userId = 'user_' + crypto.randomBytes(16).toString('hex');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    
    const user = {
        userId,
        username,
        email,
        theme,
        salt,
        hash,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        settings: {
            theme,
            animations: true,
            fontSize: 14,
            autoSave: true,
            syncEnabled: true
        },
        installedApps: ['core-system', 'file-manager'],
        errorLog: [],
        stats: {
            files: 0,
            apps: 0,
            sessions: 0
        }
    };
    
    users.set(userId, user);
    stats.totalUsers++;
    
    // Создание директории пользователя
    const userDir = path.join(__dirname, 'user_data', userId);
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
        
        // Создание начальных файлов
        const initialFiles = {
            'Documents': { type: 'folder' },
            'Downloads': { type: 'folder' },
            'Pictures': { type: 'folder' },
            'Music': { type: 'folder' },
            'Videos': { type: 'folder' },
            'README.txt': { type: 'file', content: 'Добро пожаловать в SoinLinkx OS!' }
        };
        
        Object.entries(initialFiles).forEach(([name, data]) => {
            const filePath = path.join(userDir, name);
            if (data.type === 'folder') {
                if (!fs.existsSync(filePath)) {
                    fs.mkdirSync(filePath);
                }
            } else {
                fs.writeFileSync(filePath, data.content);
            }
        });
    }
    
    log('info', 'User registered', { userId, username });
    
    res.json({
        success: true,
        userId,
        message: 'User registered successfully'
    });
});

// Вход пользователя
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    let foundUser = null;
    let foundId = null;
    
    for (let [id, user] of users) {
        if (user.username === username) {
            foundUser = user;
            foundId = id;
            break;
        }
    }
    
    if (!foundUser) {
        log('warn', 'Login failed: user not found', { username });
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const hash = crypto.pbkdf2Sync(password, foundUser.salt, 1000, 64, 'sha512').toString('hex');
    
    if (hash !== foundUser.hash) {
        log('warn', 'Login failed: invalid password', { username });
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const sessionToken = crypto.randomBytes(32).toString('hex');
    sessions.set(sessionToken, {
        userId: foundId,
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString()
    });
    
    foundUser.lastLogin = new Date().toISOString();
    stats.activeSessions++;
    
    log('info', 'User logged in', { userId: foundId, username });
    
    res.json({
        success: true,
        sessionToken,
        userId: foundId,
        user: {
            username: foundUser.username,
            email: foundUser.email,
            theme: foundUser.theme,
            settings: foundUser.settings
        }
    });
});

// Синхронизация данных
app.get('/api/sync/:userId', (req, res) => {
    const { userId } = req.params;
    const { sessionToken } = req.query;
    
    // Проверка сессии
    if (!sessions.has(sessionToken)) {
        return res.status(401).json({ error: 'Invalid session' });
    }
    
    if (!users.has(userId)) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users.get(userId);
    const userDir = path.join(__dirname, 'user_data', userId);
    
    // Сбор файлов пользователя
    const files = [];
    
    function readDir(dir, basePath = '') {
        if (!fs.existsSync(dir)) return;
        
        const items = fs.readdirSync(dir);
        items.forEach(item => {
            const itemPath = path.join(dir, item);
            const stat = fs.statSync(itemPath);
            
            files.push({
                name: item,
                path: path.join(basePath, item),
                type: stat.isDirectory() ? 'folder' : 'file',
                size: stat.size,
                modified: stat.mtime,
                created: stat.birthtime
            });
            
            if (stat.isDirectory()) {
                readDir(itemPath, path.join(basePath, item));
            }
        });
    }
    
    if (fs.existsSync(userDir)) {
        readDir(userDir);
    }
    
    // Обновление сессии
    const session = sessions.get(sessionToken);
    session.lastActivity = new Date().toISOString();
    
    log('info', 'Data synced', { userId });
    
    res.json({
        success: true,
        user: {
            username: user.username,
            email: user.email,
            theme: user.theme,
            settings: user.settings
        },
        files,
        installedApps: user.installedApps || ['core-system', 'file-manager'],
        errorLog: user.errorLog || []
    });
});

// Сохранение файла
app.post('/api/save-file', (req, res) => {
    const { userId, sessionToken, path: filePath, content } = req.body;
    
    if (!sessions.has(sessionToken)) {
        return res.status(401).json({ error: 'Invalid session' });
    }
    
    if (!users.has(userId)) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const fullPath = path.join(__dirname, 'user_data', userId, filePath);
    
    // Проверка безопасности (предотвращение выхода за пределы директории)
    const userDir = path.join(__dirname, 'user_data', userId);
    if (!fullPath.startsWith(userDir)) {
        log('warn', 'Security: attempted path traversal', { userId, filePath });
        return res.status(403).json({ error: 'Access denied' });
    }
    
    try {
        // Создание директории если нужно
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(fullPath, content);
        
        log('info', 'File saved', { userId, filePath });
        
        res.json({
            success: true,
            message: 'File saved successfully'
        });
    } catch (error) {
        log('error', 'Error saving file', { userId, filePath, error: error.message });
        res.status(500).json({ error: 'Error saving file' });
    }
});

// Получение файла
app.get('/api/file/:userId/*', (req, res) => {
    const { userId } = req.params;
    const filePath = req.params[0];
    const { sessionToken } = req.query;
    
    if (!sessions.has(sessionToken)) {
        return res.status(401).json({ error: 'Invalid session' });
    }
    
    const fullPath = path.join(__dirname, 'user_data', userId, filePath);
    const userDir = path.join(__dirname, 'user_data', userId);
    
    if (!fullPath.startsWith(userDir)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    res.sendFile(fullPath);
});

// Установка пакета
app.post('/api/install-package', (req, res) => {
    const { userId, sessionToken, packageId } = req.body;
    
    if (!sessions.has(sessionToken)) {
        return res.status(401).json({ error: 'Invalid session' });
    }
    
    if (!users.has(userId)) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const pkg = packages.get(packageId);
    if (!pkg) {
        return res.status(404).json({ error: 'Package not found' });
    }
    
    const user = users.get(userId);
    if (!user.installedApps) user.installedApps = [];
    
    // Проверка зависимостей
    const missingDeps = [];
    pkg.dependencies.forEach(dep => {
        if (!user.installedApps.includes(dep) && dep !== packageId) {
            missingDeps.push(dep);
        }
    });
    
    if (missingDeps.length > 0) {
        return res.status(400).json({
            error: 'Missing dependencies',
            dependencies: missingDeps
        });
    }
    
    if (!user.installedApps.includes(packageId)) {
        user.installedApps.push(packageId);
        
        // Обновление статистики пакета
        pkg.downloads = (pkg.downloads || 0) + 1;
    }
    
    log('info', 'Package installed', { userId, packageId });
    
    res.json({
        success: true,
        message: `Package ${packageId} installed`,
        installedApps: user.installedApps
    });
});

// Удаление пакета
app.post('/api/remove-package', (req, res) => {
    const { userId, sessionToken, packageId } = req.body;
    
    if (!sessions.has(sessionToken)) {
        return res.status(401).json({ error: 'Invalid session' });
    }
    
    if (!users.has(userId)) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users.get(userId);
    if (user.installedApps) {
        user.installedApps = user.installedApps.filter(id => id !== packageId);
    }
    
    log('info', 'Package removed', { userId, packageId });
    
    res.json({
        success: true,
        message: `Package ${packageId} removed`,
        installedApps: user.installedApps
    });
});

// Список пакетов
app.get('/api/packages', (req, res) => {
    const packagesList = Array.from(packages.values());
    res.json(packagesList);
});

// Информация о пакете
app.get('/api/package/:id', (req, res) => {
    const { id } = req.params;
    const pkg = packages.get(id);
    
    if (!pkg) {
        return res.status(404).json({ error: 'Package not found' });
    }
    
    res.json(pkg);
});

// Поиск пакетов
app.get('/api/search-packages', (req, res) => {
    const { q } = req.query;
    
    if (!q) {
        return res.json([]);
    }
    
    const results = Array.from(packages.values()).filter(pkg =>
        pkg.name.toLowerCase().includes(q.toLowerCase()) ||
        pkg.id.toLowerCase().includes(q.toLowerCase()) ||
        pkg.description.toLowerCase().includes(q.toLowerCase())
    );
    
    res.json(results);
});

// Логирование ошибок
app.post('/api/log-error', (req, res) => {
    const { userId, error } = req.body;
    
    if (userId && users.has(userId)) {
        const user = users.get(userId);
        if (!user.errorLog) user.errorLog = [];
        user.errorLog.push(error);
        
        // Сохраняем в файл
        const logFile = path.join(__dirname, 'logs', `${userId}.log`);
        const logEntry = `[${error.time}] [${error.code}] ${error.message}\n${error.stack || ''}\n---\n`;
        
        fs.appendFile(logFile, logEntry, (err) => {
            if (err) log('error', 'Error writing log file', { error: err.message });
        });
    }
    
    log('error', 'Client error reported', error);
    
    res.json({ success: true });
});

// Статистика системы
app.get('/api/stats', (req, res) => {
    const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    
    const systemStats = {
        uptime: `${hours}ч ${minutes}м ${seconds}с`,
        totalRequests: stats.totalRequests,
        activeSessions: stats.activeSessions,
        totalUsers: stats.totalUsers,
        totalPackages: packages.size,
        memory: process.memoryUsage(),
        cpu: os.cpus().length,
        platform: os.platform(),
        arch: os.arch()
    };
    
    res.json(systemStats);
});

// Выход из системы
app.post('/api/logout', (req, res) => {
    const { sessionToken } = req.body;
    
    if (sessions.has(sessionToken)) {
        sessions.delete(sessionToken);
        stats.activeSessions--;
        log('info', 'User logged out');
    }
    
    res.json({ success: true });
});

// Очистка неактивных сессий (каждый час)
setInterval(() => {
    const now = new Date();
    let expired = 0;
    
    for (let [token, session] of sessions) {
        const lastActivity = new Date(session.lastActivity);
        const hours = (now - lastActivity) / (1000 * 60 * 60);
        
        if (hours > 24) { // Неактивные более 24 часов
            sessions.delete(token);
            stats.activeSessions--;
            expired++;
        }
    }
    
    if (expired > 0) {
        log('info', `Cleaned up ${expired} expired sessions`);
    }
}, 60 * 60 * 1000);

// Создание бэкапа (каждый день)
setInterval(() => {
    const backupDir = path.join(__dirname, 'backups', new Date().toISOString().split('T')[0]);
    
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
        
        // Копирование данных пользователей
        const userDataDir = path.join(__dirname, 'user_data');
        if (fs.existsSync(userDataDir)) {
            const users = fs.readdirSync(userDataDir);
            users.forEach(user => {
                const src = path.join(userDataDir, user);
                const dest = path.join(backupDir, 'user_data', user);
                if (fs.existsSync(src)) {
                    fs.cpSync(src, dest, { recursive: true, force: true });
                }
            });
        }
        
        // Сохранение состояния
        const state = {
            timestamp: new Date().toISOString(),
            users: Array.from(users.entries()),
            stats
        };
        
        fs.writeFileSync(
            path.join(backupDir, 'state.json'),
            JSON.stringify(state, null, 2)
        );
        
        log('info', 'Backup created', { backupDir });
    }
}, 24 * 60 * 60 * 1000);

// Обработка ошибок
app.use((err, req, res, next) => {
    log('error', 'Server error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
});

// Запуск сервера
const server = app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════════════════╗
    ║                                                          ║
    ║   ███████  ██████  ██ ███    ██ ██      ██ ███    ██ ██║
    ║   ██      ██    ██ ██ ████   ██ ██      ██ ████   ██ ██║
    ║   ███████ ██    ██ ██ ██ ██  ██ ██      ██ ██ ██  ██ ██║
    ║        ██ ██    ██ ██ ██  ██ ██ ██      ██ ██  ██ ██ ██║
    ║   ███████  ██████  ██ ██   ████ ███████ ██ ██   ████ ██║
    ║                                                          ║
    ║   SoinLinkx OS Server v2.0                              ║
    ║   ==================================================   ║
    ║                                                          ║
    ║   Port:         ${PORT}                                         ║
    ║   URL:          http://localhost:${PORT}                        ║
    ║   Static files: ./public/                                ║
    ║   Environment:  ${process.env.NODE_ENV || 'development'}                        ║
    ║   Platform:     ${os.platform()} ${os.arch()}                         ║
    ║   CPU:          ${os.cpus().length} cores                                   ║
    ║   Memory:       ${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB RAM                                ║
    ║                                                          ║
    ║   Directories:                                          ║
    ║     • Public:    ./public                               ║
    ║     • Logs:      ./logs                                 ║
    ║     • User data: ./user_data                            ║
    ║     • Backups:   ./backups                              ║
    ║     • Packages:  ./packages                             ║
    ║                                                          ║
    ║   System ready for connections                           ║
    ║   Started at: ${new Date().toLocaleString()}                 ║
    ║                                                          ║
    ╚══════════════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    log('info', 'SIGTERM received, shutting down gracefully');
    server.close(() => {
        log('info', 'Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    log('info', 'SIGINT received, shutting down gracefully');
    server.close(() => {
        log('info', 'Server closed');
        process.exit(0);
    });
});
