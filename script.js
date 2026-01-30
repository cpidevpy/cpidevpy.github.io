// github-proxy/script.js

class ProxyManager {
    constructor() {
        this.proxies = {
            'cors-anywhere': 'https://cors-anywhere.herokuapp.com/',
            'allorigins': 'https://api.allorigins.win/raw?url=',
            'corsproxy': 'https://corsproxy.io/?',
            'thingproxy': 'https://thingproxy.freeboard.io/fetch/',
            'codetabs': 'https://api.codetabs.com/v1/proxy?quest='
        };
        
        this.currentProxy = localStorage.getItem('proxy') || 'cors-anywhere';
        this.cache = new Map();
        this.maxCacheSize = 100;
    }
    
    // Получить проксированный URL
    getProxyUrl(url) {
        const proxy = this.proxies[this.currentProxy];
        if (!proxy) {
            throw new Error('Прокси не найден');
        }
        
        return proxy + encodeURIComponent(url);
    }
    
    // Тест всех прокси
    async testAllProxies(url = 'https://httpbin.org/ip') {
        const results = [];
        
        for (const [name, proxyUrl] of Object.entries(this.proxies)) {
            try {
                const start = Date.now();
                const response = await fetch(proxyUrl + encodeURIComponent(url), {
                    timeout: 5000
                });
                const time = Date.now() - start;
                
                results.push({
                    name,
                    status: response.ok ? 'online' : 'offline',
                    time,
                    success: response.ok
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
        }
        
        return results;
    }
    
    // Кэширование
    setCache(url, content) {
        if (this.cache.size >= this.maxCacheSize) {
            // Удаляем самый старый элемент
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(url, {
            content,
            timestamp: Date.now(),
            size: content.length
        });
    }
    
    getCache(url) {
        const cached = this.cache.get(url);
        if (cached && Date.now() - cached.timestamp < 3600000) { // 1 час
            return cached.content;
        }
        return null;
    }
    
    // Сохранение настроек
    saveSettings() {
        localStorage.setItem('proxy', this.currentProxy);
        localStorage.setItem('proxy_cache', JSON.stringify(Array.from(this.cache.entries())));
    }
    
    // Загрузка настроек
    loadSettings() {
        const savedCache = localStorage.getItem('proxy_cache');
        if (savedCache) {
            try {
                this.cache = new Map(JSON.parse(savedCache));
            } catch (e) {
                console.warn('Не удалось загрузить кэш');
            }
        }
    }
}

// Инициализация
const proxyManager = new ProxyManager();
proxyManager.loadSettings();

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProxyManager };
}
