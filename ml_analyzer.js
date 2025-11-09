// ml-analyzer.js - Machine Learning URL Analysis
class MLAnalyzer {
    constructor() {
        this.trainingData = [];
        this.model = null;
        this.features = [];
    }

    // Feature extraction from URLs
    extractFeatures(url) {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        
        return {
            length: url.length,
            hasHttps: url.startsWith('https'),
            numDots: (hostname.match(/\./g) || []).length,
            numHyphens: (hostname.match(/-/g) || []).length,
            hasIp: /\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(hostname),
            tld: this.getTLD(hostname),
            suspiciousKeywords: this.countSuspiciousKeywords(url),
            entropy: this.calculateEntropy(hostname),
            pathDepth: (urlObj.pathname.match(/\//g) || []).length,
            hasPort: urlObj.port !== '',
            specialChars: (url.match(/[~!@#$%^&*()_+={}|\[\]:;<>?,]/g) || []).length
        };
    }

    getTLD(hostname) {
        const parts = hostname.split('.');
        return parts.length > 1 ? parts[parts.length - 1] : '';
    }

    countSuspiciousKeywords(url) {
        const keywords = [
            'login', 'secure', 'verify', 'account', 'banking', 'password',
            'update', 'confirm', 'billing', 'payment', 'security', 'alert'
        ];
        return keywords.filter(keyword => 
            url.toLowerCase().includes(keyword)
        ).length;
    }

    calculateEntropy(str) {
        const len = str.length;
        const freq = {};
        for (let char of str) {
            freq[char] = (freq[char] || 0) + 1;
        }
        return -Object.values(freq).reduce((sum, f) => {
            const p = f / len;
            return sum + p * Math.log2(p);
        }, 0);
    }

    // Random Forest-like prediction (simplified)
    predict(url) {
        const features = this.extractFeatures(url);
        
        // Feature weights (trained on synthetic data)
        const weights = {
            length: 0.1,
            hasHttps: -0.3,
            numDots: 0.2,
            numHyphens: 0.15,
            hasIp: 0.8,
            suspiciousKeywords: 0.25,
            entropy: 0.12,
            pathDepth: 0.05,
            hasPort: 0.3,
            specialChars: 0.18
        };

        // TLD risk scores
        const tldRisk = {
            'com': 0.1, 'org': 0.1, 'net': 0.1, 'edu': 0.0,
            'gov': 0.0, 'xyz': 0.7, 'top': 0.6, 'club': 0.5,
            'gq': 0.8, 'ml': 0.7, 'tk': 0.9
        };

        let riskScore = 0;
        
        // Calculate base risk
        Object.keys(features).forEach(feature => {
            if (feature !== 'tld') {
                riskScore += features[feature] * (weights[feature] || 0);
            }
        });

        // Add TLD risk
        riskScore += tldRisk[features.tld] || 0.3;

        // Normalize to 0-100
        riskScore = Math.min(100, Math.max(0, riskScore * 20));

        return {
            riskScore: Math.round(riskScore),
            isMalicious: riskScore > 60,
            confidence: Math.min(95, riskScore * 0.9),
            features: features
        };
    }

    // Generate bulk test data
    generateBulkData(count = 12000) {
        const data = [];
        const maliciousCount = Math.floor(count * 0.3); // 30% malicious
        const genuineCount = count - maliciousCount;

        // Generate genuine URLs
        for (let i = 0; i < genuineCount; i++) {
            data.push(this.generateGenuineUrl());
        }

        // Generate malicious URLs
        for (let i = 0; i < maliciousCount; i++) {
            data.push(this.generateMaliciousUrl());
        }

        // Shuffle
        return this.shuffleArray(data);
    }

    generateGenuineUrl() {
        const domains = [
            'google.com', 'github.com', 'stackoverflow.com', 'wikipedia.org',
            'microsoft.com', 'apple.com', 'amazon.com', 'facebook.com',
            'youtube.com', 'twitter.com', 'linkedin.com', 'instagram.com',
            'reddit.com', 'netflix.com', 'paypal.com', 'spotify.com'
        ];

        const paths = [
            '', '/search', '/users', '/products', '/articles', '/download',
            '/help', '/support', '/blog', '/news', '/features', '/pricing'
        ];

        const domain = domains[Math.floor(Math.random() * domains.length)];
        const path = paths[Math.floor(Math.random() * paths.length)];
        const resource = path ? `/resource${Math.floor(Math.random() * 1000)}` : '';

        return {
            url: `https://www.${domain}${path}${resource}`,
            type: 'genuine',
            expected: 'safe'
        };
    }

    generateMaliciousUrl() {
        const services = ['bank', 'paypal', 'facebook', 'amazon', 'microsoft', 
                         'apple', 'whatsapp', 'instagram', 'twitter', 'netflix'];
        
        const patterns = [
            'secure-login', 'password-reset', 'account-verify', 'security-update',
            'verification-code', 'billing-alert', 'payment-confirm', 'login-secure'
        ];

        const tlds = ['.xyz', '.top', '.club', '.gq', '.ml', '.tk', '.cf', '.ga'];

        const service = services[Math.floor(Math.random() * services.length)];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        const tld = tlds[Math.floor(Math.random() * tlds.length)];
        const randomId = Math.floor(Math.random() * 1000);

        return {
            url: `http://${service}-${pattern}${randomId}${tld}`,
            type: 'malicious',
            expected: 'malicious'
        };
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Batch analysis
    async analyzeBulk(urls, batchSize = 100) {
        const results = [];
        
        for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);
            const batchResults = batch.map(urlData => {
                const analysis = this.predict(urlData.url);
                return {
                    ...urlData,
                    ...analysis,
                    actual: analysis.isMalicious ? 'malicious' : 'safe',
                    correct: (analysis.isMalicious && urlData.expected === 'malicious') || 
                            (!analysis.isMalicious && urlData.expected === 'safe')
                };
            });
            results.push(...batchResults);
            
            // Simulate API delay
            if (i + batchSize < urls.length) {
                await this.delay(10);
            }
        }
        
        return results;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Generate reports
    generateReport(results) {
        const total = results.length;
        const malicious = results.filter(r => r.expected === 'malicious').length;
        const genuine = results.filter(r => r.expected === 'safe').length;
        
        const truePositives = results.filter(r => 
            r.expected === 'malicious' && r.actual === 'malicious'
        ).length;
        
        const falsePositives = results.filter(r => 
            r.expected === 'safe' && r.actual === 'malicious'
        ).length;
        
        const trueNegatives = results.filter(r => 
            r.expected === 'safe' && r.actual === 'safe'
        ).length;
        
        const falseNegatives = results.filter(r => 
            r.expected === 'malicious' && r.actual === 'safe'
        ).length;

        const accuracy = ((truePositives + trueNegatives) / total * 100).toFixed(2);
        const precision = (truePositives / (truePositives + falsePositives) * 100).toFixed(2);
        const recall = (truePositives / (truePositives + falseNegatives) * 100).toFixed(2);
        const f1Score = (2 * ((precision * recall) / (precision + recall))).toFixed(2);

        return {
            summary: {
                total,
                malicious,
                genuine,
                accuracy: `${accuracy}%`,
                precision: `${precision}%`,
                recall: `${recall}%`,
                f1Score: `${f1Score}%`
            },
            confusionMatrix: {
                truePositives,
                falsePositives,
                trueNegatives,
                falseNegatives
            },
            details: results
        };
    }
}

// Global instance
window.mlAnalyzer = new MLAnalyzer();
