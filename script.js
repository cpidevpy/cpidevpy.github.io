// github-proxy/script.js - ИСПРАВЛЕННАЯ ВЕРСИЯ

class ProxyManager {
    constructor() {
        // ОБНОВЛЕННЫЕ ПРОКСИ (рабочие на 2024)
        this.proxies = {
            'allorigins': {
                url: 'https://api.allorigins.win/raw?url=',
                method: 'GET',
                headers: {}
            },
            'corsproxy': {
                url: 'https://corsproxy.io/?',
                method: 'GET',
                headers: {}
            },
            'thingproxy': {
                url: 'https://thingproxy.freeboard.io/fetch/',
                method: 'GET',
                headers: {}
            },
            'codetabs': {
                url: 'https://api.codetabs.com/v1/proxy?quest=',
                method: 'GET',
                headers: {}
            },
            'ghproxy': {
                url: 'https://ghproxy.com/',
                method: 'GET',
                headers: {}
            },
            'cors-anywhere-new': {
                url: 'https://cors-anywhere.azm.workers.dev/?',
                method: 'GET',
                headers: {
                    'Origin': 'https://cpidevpy.github.io',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }
        };
        
        this.currentProxy = localStorage.getItem('proxy') || 'allorigins';
        this.cache = new Map();
        this.maxCacheSize = 50;
        this.retryCount = 0;
        this.maxRetries = 3;
    }
    
    // ИСПРАВЛЕННЫЙ метод получения прокси URL
    getProxyUrl(targetUrl) {
        const proxy = this.proxies[this.currentProxy];
        if (!proxy) {
            throw new Error('Прокси не найден');
        }
        
        // Кодируем URL правильно
        const encodedUrl = encodeURIComponent(targetUrl);
        return proxy.url + encodedUrl;
    }
    
    // ИСПРАВЛЕННЫЙ метод загрузки через прокси
    async fetchViaProxy(url, options = {}) {
        const proxy = this.proxies[this.currentProxy];
        const proxyUrl = this.getProxyUrl(url);
        
        // Пробуем кэш
        const cached = this.getCache(url);
        if (cached) {
            console.log('Используем кэш для:', url);
            return cached;
        }
        
        // Настройки запроса
        const fetchOptions = {
            method: proxy.method || 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
                ...proxy.headers,
                ...options.headers
            },
            mode: 'cors',
            cache: 'no-cache'
        };
        
        try {
            console.log('Загружаем через прокси:', this.currentProxy);
            
            const response = await fetch(proxyUrl, fetchOptions);
            
            // Обрабатываем ответ
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const content = await response.text();
            
            // Сохраняем в кэш
            this.setCache(url, content);
            
            return content;
            
        } catch (error) {
            console.error('Ошибка прокси:', error.message);
            
            // Автоматический переход к следующему прокси
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`Пробуем другой прокси (попытка ${this.retryCount})`);
                return this.tryNextProxy(url, options);
            }
            
            throw error;
        }
    }
    
    // Попробовать следующий прокси
    async tryNextProxy(url, options) {
        const proxyNames = Object.keys(this.proxies);
        const currentIndex = proxyNames.indexOf(this.currentProxy);
        const nextIndex = (currentIndex + 1) % proxyNames.length;
        
        this.currentProxy = proxyNames[nextIndex];
        localStorage.setItem('proxy', this.currentProxy);
        
        console.log(`Переключились на прокси: ${this.currentProxy}`);
        
        return this.fetchViaProxy(url, options);
    }
    
    // Тест всех прокси
    async testAllProxies(testUrl = 'https://httpbin.org/html') {
        const results = [];
        const proxyNames = Object.keys(this.proxies);
        
        for (const name of proxyNames) {
            const originalProxy = this.currentProxy;
            this.currentProxy = name;
            
            try {
                const start = Date.now();
                const response = await fetch(this.getProxyUrl(testUrl), {
                    method: 'HEAD',
                    headers: {
                        'User-Agent': 'Mozilla/5.0'
                    }
                });
                const time = Date.now() - start;
                
                results.push({
                    name,
                    status: response.ok ? 'online' : 'offline',
                    time,
                    success: response.ok,
                    statusCode: response.status
                });
                
            } catch (error) {
                results.push({
                    name,
                    status: 'error',
                    time: 0,
                    success: false,
                    error: error.message
                });
            }
            
            this.currentProxy = originalProxy;
        }
        
        // Сортируем по успешности и скорости
        results.sort((a, b) => {
            if (a.success && !b.success) return -1;
            if (!a.success && b.success) return 1;
            return a.time - b.time;
        });
        
        return results;
    }
    
    // Кэширование (исправлено)
    setCache(url, content) {
        const cacheKey = `${url}_${this.currentProxy}`;
        
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(cacheKey, {
            content,
            timestamp: Date.now(),
            size: content.length,
            url: url
        });
        
        // Автосохранение
        this.saveSettings();
    }
    
    getCache(url) {
        const cacheKey = `${url}_${this.currentProxy}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < 1800000) { // 30 минут
            return cached.content;
        }
        
        // Удаляем устаревший кэш
        if (cached) {
            this.cache.delete(cacheKey);
        }
        
        return null;
    }
    
    // Очистка кэша
    clearCache() {
        this.cache.clear();
        localStorage.removeItem('proxy_cache');
    }
    
    // Сохранение настроек
    saveSettings() {
        localStorage.setItem('proxy', this.currentProxy);
        
        // Сохраняем только свежий кэш (менее 1 часа)
        const freshCache = Array.from(this.cache.entries()).filter(
            ([key, value]) => Date.now() - value.timestamp < 3600000
        );
        
        localStorage.setItem('proxy_cache', JSON.stringify(freshCache));
    }
    
    // Загрузка настроек
    loadSettings() {
        const savedCache = localStorage.getItem('proxy_cache');
        if (savedCache) {
            try {
                const cacheArray = JSON.parse(savedCache);
                this.cache = new Map(cacheArray);
                console.log('Загружен кэш:', this.cache.size, 'записей');
            } catch (e) {
                console.warn('Не удалось загрузить кэш');
                this.cache = new Map();
            }
        }
    }
}

// Инициализация глобального менеджера
const proxyManager = new ProxyManager();
proxyManager.loadSettings();

// Глобальные функции для использования в HTML
window.proxyManager = proxyManager;

// Быстрая функция для загрузки сайта
window.loadSiteViaProxy = async function(url, targetElementId) {
    try {
        const html = await proxyManager.fetchViaProxy(url);
        
        if (targetElementId) {
            const element = document.getElementById(targetElementId);
            if (element) {
                // Для iframe
                if (element.tagName === 'IFRAME') {
                    element.srcdoc = html;
                } else {
                    // Для div
                    element.innerHTML = html;
                }
            }
        }
        
        return html;
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        throw error;
    }
};
