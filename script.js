// Global variable to hold all data after fetching
window.allAlerts = []; 

document.addEventListener('DOMContentLoaded', () => {
    // 1. Start the core function to fetch data and run detection
    fetchAndAnalyzeAlerts();
    
    // 2. Keep existing quick actions handlers for the footer section
    const quickActions = document.querySelectorAll('.actions-grid .action-item');
    quickActions.forEach(action => {
        action.addEventListener('click', (e) => {
            const link = action.getAttribute('href');
            if (link === '#') {
                e.preventDefault(); 
                const actionName = action.querySelector('span').textContent;
                console.log(`${actionName} action triggered.`);
            }
        });
    });
});

// --------------------------------------------------------------
// CORE DETECTION AND DISPLAY LOGIC
// --------------------------------------------------------------

async function fetchAndAnalyzeAlerts() {
    const alertsContainer = document.getElementById('alerts-container');
    alertsContainer.innerHTML = '<p style="text-align:center;">Analyzing data with detection engine...</p>';

    try {
        // This connects to the function you created in the netlify/functions folder
        const response = await fetch('/.netlify/functions/analyze-fraud'); 
        
        if (!response.ok) {
            throw new Error(`Detection Engine Error! Status: ${response.status}`);
        }
        
        const analyzedData = await response.json(); 
        
        window.allAlerts = analyzedData; // Save all data
        
        renderAlerts(analyzedData);
        
        // Show the overall system accuracy (using the static value from the function)
        if (analyzedData.length > 0) {
            displayAccuracyMeter(analyzedData[0].system_accuracy);
        }

    } catch (error) {
        console.error("Error fetching/analyzing alerts:", error);
        alertsContainer.innerHTML = '<p style="text-align:center; color: red;">Error: Could not connect to Detection Engine. Check Netlify deployment.</p>';
    }
}

function renderAlerts(alerts) {
    const alertsContainer = document.getElementById('alerts-container');
    alertsContainer.innerHTML = ''; 

    if (alerts.length === 0) {
        alertsContainer.innerHTML = '<p style="text-align:center;">No current alerts found matching the filter.</p>';
        return;
    }
    
    alerts.forEach(alert => {
        // Determine display properties based on detection result
        const statusText = alert.is_fraud ? "FRAUD DETECTED" : "SAFE / UNCERTAIN";
        const statusClass = alert.is_fraud ? "critical" : "low";

        const card = document.createElement('div');
        // Use a unique class for styling
        card.className = `alert-card-item ${alert.type.toLowerCase().replace(/\s/g, '-')}`;

        card.innerHTML = `
            <div class="card-header-dynamic">
                <span class="scam-type-tag">${alert.type}</span>
                <span class="timestamp">${alert.location || 'N/A'}</span>
            </div>
            <div class="card-body-dynamic">
                <h3>Incident: ${alert.type}</h3>
                <p><strong>Keywords:</strong> ${alert.keywords}</p>
                <p>URL: ${alert.url || 'N/A'}</p>
            </div>
            <div class="card-footer-dynamic">
                <span class="status ${statusClass}">${statusText}</span>
                <span class="confidence-score">Confidence: ${alert.confidence_score.toFixed(1)}%</span>
            </div>
        `;
        alertsContainer.appendChild(card);
    });
}

// Function triggered by the HTML <select onchange="filterAlerts()">
function filterAlerts() {
    const filterValue = document.getElementById('scam-type-filter').value;
    
    if (filterValue === 'all') {
        renderAlerts(window.allAlerts);
    } else {
        const filtered = window.allAlerts.filter(alert => alert.type === filterValue);
        renderAlerts(filtered);
    }
}
// Redirect to URL Analysis Dashboard
function redirectToAnalysis() {
    window.location.href = 'url-analysis-dashboard.html';
}

// Function to display the required overall accuracy number
function displayAccuracyMeter(accuracy) {
    const meterHTML = `
        <div class="accuracy-meter-box">
            <h3 class="meter-title">System Performance</h3>
            <p class="meter-score">Overall Accuracy: <strong>${accuracy.toFixed(1)}%</strong></p>
            <p class="meter-note">(Based on Rule-Engine evaluation against synthetic data)</p>
        </div>
    `;
    document.getElementById('accuracy-display').innerHTML = meterHTML;

}
// Add this at the top with other global variables
let urlSearchHistory = JSON.parse(localStorage.getItem('cyberAlertUrlHistory')) || [];

// Add this in DOMContentLoaded event
document.addEventListener('DOMContentLoaded', () => {
    fetchAndAnalyzeAlerts();
    updateSearchHistory(); // Add this line
});

// Save URL search to history
function saveToSearchHistory(url, analysis) {
    const searchEntry = {
        url: url,
        status: analysis.safe ? 'safe' : 'danger',
        confidence: analysis.confidence,
        timestamp: new Date().toLocaleString(),
        result: analysis.safe ? 'Safe' : 'Suspicious'
    };
    
    // Add to beginning of array
    urlSearchHistory.unshift(searchEntry);
    
    // Keep only last 10 searches
    if (urlSearchHistory.length > 10) {
        urlSearchHistory = urlSearchHistory.slice(0, 10);
    }
    
    // Save to localStorage
    localStorage.setItem('cyberAlertUrlHistory', JSON.stringify(urlSearchHistory));
    
    // Update display
    updateSearchHistory();
}

// Update search history display
function updateSearchHistory() {
    const historyContainer = document.getElementById('searchHistory');
    
    if (urlSearchHistory.length === 0) {
        historyContainer.innerHTML = `
            <div class="search-history-item">
                <div class="search-url">No searches yet. Check a URL to see history here.</div>
            </div>
        `;
        return;
    }
    
    historyContainer.innerHTML = '';
    
    urlSearchHistory.forEach(entry => {
        const historyItem = document.createElement('div');
        historyItem.className = 'search-history-item';
        
        historyItem.innerHTML = `
            <div class="search-url" title="${entry.url}">${entry.url}</div>
            <div class="search-status ${entry.status === 'safe' ? 'status-safe' : 'status-danger'}">
                ${entry.result}
            </div>
            <div class="search-date">${entry.timestamp}</div>
        `;
        
        historyContainer.appendChild(historyItem);
    });
}

// Clear search history
function clearSearchHistory() {
    if (confirm('Are you sure you want to clear all search history?')) {
        urlSearchHistory = [];
        localStorage.setItem('cyberAlertUrlHistory', JSON.stringify(urlSearchHistory));
        updateSearchHistory();
    }
}
// Bulk Analysis Functions
let bulkAnalysis = null;
let analysisResults = [];

async function runBulkAnalysis() {
    if (bulkAnalysis) {
        alert('Analysis already running!');
        return;
    }

    const datasetSize = parseInt(document.getElementById('datasetSize').value);
    const batchSize = parseInt(document.getElementById('batchSize').value);

    // Generate synthetic dataset
    document.getElementById('bulkProgressText').textContent = 'Generating dataset...';
    const dataset = window.mlAnalyzer.generateBulkData(datasetSize);

    bulkAnalysis = {
        dataset: dataset,
        currentIndex: 0,
        batchSize: batchSize,
        results: [],
        startTime: Date.now()
    };

    // Reset UI
    document.getElementById('resultsGridLarge').innerHTML = '';
    document.getElementById('bulkProgressFill').style.width = '0%';
    document.getElementById('processedCount').textContent = '0';
    document.getElementById('maliciousCount').textContent = '0';
    document.getElementById('safeCount').textContent = '0';
    document.getElementById('accuracy').textContent = '0%';
    document.getElementById('reportSection').style.display = 'none';

    // Start processing
    await processBulkBatch();
}

async function processBulkBatch() {
    if (!bulkAnalysis) return;

    const { dataset, currentIndex, batchSize } = bulkAnalysis;
    
    if (currentIndex >= dataset.length) {
        // Analysis complete
        analysisResults = bulkAnalysis.results;
        document.getElementById('bulkProgressText').textContent = 
            `Analysis complete! Processed ${dataset.length} URLs`;
        
        const elapsed = ((Date.now() - bulkAnalysis.startTime) / 1000).toFixed(2);
        console.log(`Bulk analysis completed in ${elapsed} seconds`);
        
        bulkAnalysis = null;
        return;
    }

    const batch = dataset.slice(currentIndex, currentIndex + batchSize);
    
    // Update progress
    const progress = ((currentIndex + batch.length) / dataset.length * 100).toFixed(1);
    document.getElementById('bulkProgressFill').style.width = `${progress}%`;
    document.getElementById('bulkProgressText').textContent = 
        `Processing... ${currentIndex + batch.length}/${dataset.length} (${progress}%)`;

    // Process batch
    const batchResults = await window.mlAnalyzer.analyzeBulk(batch);
    bulkAnalysis.results.push(...batchResults);
    bulkAnalysis.currentIndex += batch.length;

    // Update real-time stats
    updateRealTimeStats(bulkAnalysis.results);

    // Display sample results
    displaySampleResults(batchResults);

    // Continue with next batch
    setTimeout(() => processBulkBatch(), 10);
}

function updateRealTimeStats(results) {
    const processed = results.length;
    const malicious = results.filter(r => r.actual === 'malicious').length;
    const safe = results.filter(r => r.actual === 'safe').length;
    
    const correct = results.filter(r => r.correct).length;
    const accuracy = processed > 0 ? ((correct / processed) * 100).toFixed(1) : 0;

    document.getElementById('processedCount').textContent = processed.toLocaleString();
    document.getElementById('maliciousCount').textContent = malicious.toLocaleString();
    document.getElementById('safeCount').textContent = safe.toLocaleString();
    document.getElementById('accuracy').textContent = `${accuracy}%`;
}

function displaySampleResults(results) {
    const container = document.getElementById('resultsGridLarge');
    
    // Show only last 20 results to prevent DOM overload
    const displayResults = results.slice(-20);
    
    container.innerHTML = displayResults.map(result => `
        <div class="result-card ${result.actual}">
            <div class="result-url" title="${result.url}">${result.url}</div>
            <div class="result-metrics">
                <span class="risk-score risk-${getRiskLevel(result.riskScore)}">
                    Risk: ${result.riskScore}%
                </span>
                <span class="result-type ${result.correct ? 'correct' : 'incorrect'}">
                    ${result.correct ? '✓' : '✗'} ${result.actual}
                </span>
            </div>
        </div>
    `).join('');
}

function getRiskLevel(score) {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
}

