// FM-200 Calculator Application
const APP_CONFIG = {
    version: '2.1',
    defaultCurrency: 'USD'
};

const STORAGE_KEYS = {
    BUDGET_DATA: 'fm200_budget_data',
    USER_PREFERENCES: 'fm200_user_prefs'
};

class FM200Calculator {
    constructor() {
        this.currentData = null;
        this.configData = null;
        this.costChart = null;
        this.initializeApp();
    }

    async initializeApp() {
        await this.loadConfigData();
        
        // Check current page and initialize accordingly
        if (document.getElementById('budgetForm')) {
            this.initInputPage();
        } else if (document.getElementById('calculationResults')) {
            this.initResultsPage();
        } else if (document.getElementById('quotationForm')) {
            this.initQuotationPage();
        }
        
        this.initThemeToggle();
        this.initExpertMode();
        this.initQuickPreview();
    }

    async loadConfigData() {
        try {
            const response = await fetch('data.json');
            this.configData = await response.json();
        } catch (error) {
            console.error('Failed to load config:', error);
            // Fallback data
            this.configData = {
                exchangeRates: { USD: 1, EUR: 0.92, INR: 83.5, AED: 3.67 },
                costMultipliers: {
                    agentCostPerKg: 48.5,
                    cylinderCost: 1250,
                    nozzleCost: 175,
                    pipingCostPerMeter: 45,
                    detectionSystem: 1800,
                    actuationDevice: 450,
                    controlPanel: 2200,
                    warningSigns: 85,
                    installationLabor: 3200,
                    documentation: 450,
                    installationFactor: 1.28,
                    engineeringFactor: 1.15
                }
            };
        }
    }

    initInputPage() {
        const form = document.getElementById('budgetForm');
        const resetBtn = document.getElementById('resetBtn');
        const saveTemplateBtn = document.getElementById('saveTemplate');

        // Set today's date for new calculations
        const today = new Date().toLocaleDateString('en-CA');
        document.getElementById('projectName').value = `FM-200 Project ${today}`;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        resetBtn.addEventListener('click', () => {
            if (confirm('Reset all inputs to default?')) {
                form.reset();
                document.getElementById('projectName').value = `FM-200 Project ${today}`;
                document.getElementById('clientLocation').value = 'Dubai, UAE';
                document.getElementById('currency').value = 'AED';
                this.updateQuickPreview();
            }
        });

        // Update preview on input
        ['roomLength', 'roomWidth', 'roomHeight'].forEach(id => {
            const input = document.getElementById(id);
            input.addEventListener('input', () => this.updateQuickPreview());
        });

        // Expert mode toggle
        const expertToggle = document.getElementById('expertMode');
        if (expertToggle) {
            expertToggle.addEventListener('click', () => this.toggleExpertMode());
        }

        this.updateQuickPreview();
    }

    handleFormSubmit() {
        try {
            const formData = this.collectFormData();
            const calculationResults = this.calculateFM200(formData);
            const costResults = this.calculateCosts(calculationResults, formData.currency);

            this.currentData = {
                formData,
                calculationResults,
                costResults,
                timestamp: new Date().toISOString(),
                projectId: this.generateProjectId()
            };

            // Save to session storage
            sessionStorage.setItem(STORAGE_KEYS.BUDGET_DATA, JSON.stringify(this.currentData));

            // Redirect to results
            window.location.href = 'results.html';

        } catch (error) {
            console.error('Calculation error:', error);
            this.showNotification('Error: ' + error.message, 'error');
        }
    }

    collectFormData() {
        const formData = {
            roomLength: parseFloat(document.getElementById('roomLength').value),
            roomWidth: parseFloat(document.getElementById('roomWidth').value),
            roomHeight: parseFloat(document.getElementById('roomHeight').value),
            equipmentVolume: parseFloat(document.getElementById('equipmentVolume')?.value) || 0,
            minTemperature: parseFloat(document.getElementById('minTemperature').value),
            altitude: parseFloat(document.getElementById('altitude')?.value) || 0,
            projectName: document.getElementById('projectName').value,
            clientLocation: document.getElementById('clientLocation').value,
            currency: document.getElementById('currency').value,
            safetyFactor: parseInt(document.getElementById('safetyFactor').value) / 100,
            cylinderSize: parseFloat(document.getElementById('cylinderSize').value)
        };

        // Validation
        if (!formData.roomLength || !formData.roomWidth || !formData.roomHeight) {
            throw new Error('Please enter room dimensions');
        }
        if (formData.roomLength <= 0 || formData.roomWidth <= 0 || formData.roomHeight <= 0) {
            throw new Error('Dimensions must be greater than zero');
        }

        return formData;
    }

    calculateFM200(formData) {
        const { roomLength, roomWidth, roomHeight, equipmentVolume, minTemperature, altitude, safetyFactor, cylinderSize } = formData;

        // Calculate volumes
        const grossVolume = roomLength * roomWidth * roomHeight;
        const netVolume = Math.max(0, grossVolume - equipmentVolume);

        // NFPA 2001 calculation
        const specificVaporVolume = 0.1269 + (0.0005 * minTemperature);
        const concentration = 7.0; // Minimum concentration for Class A fires
        
        let agentWeight = (netVolume / specificVaporVolume) * (concentration / (100 - concentration));

        // Apply corrections
        if (altitude > 500) {
            const altitudeFactor = 1 + (altitude / 10000);
            agentWeight *= altitudeFactor;
        }

        agentWeight *= safetyFactor;

        // Calculate components
        const cylinderCount = Math.ceil(agentWeight / cylinderSize);
        const floorArea = roomLength * roomWidth;
        const nozzleCount = Math.max(2, Math.ceil(floorArea / 50)); // 50 m² per nozzle
        const pipingLength = (roomLength + roomWidth) * 2 + roomHeight * 2;

        return {
            agentWeight: parseFloat(agentWeight.toFixed(2)),
            netVolume: parseFloat(netVolume.toFixed(2)),
            grossVolume: parseFloat(grossVolume.toFixed(2)),
            cylinderCount,
            nozzleCount,
            cylinderSize,
            pipingLength: parseFloat(pipingLength.toFixed(2)),
            specificVaporVolume: parseFloat(specificVaporVolume.toFixed(4)),
            concentration,
            floorArea: parseFloat(floorArea.toFixed(2))
        };
    }

    calculateCosts(calculationResults, currency) {
        const m = this.configData.costMultipliers;
        const rates = this.configData.exchangeRates;

        // Calculate in USD
        const agentCost = calculationResults.agentWeight * m.agentCostPerKg;
        const cylinderCost = calculationResults.cylinderCount * m.cylinderCost;
        const nozzleCost = calculationResults.nozzleCount * m.nozzleCost;
        const pipingCost = calculationResults.pipingLength * m.pipingCostPerMeter;
        const equipmentSubtotal = agentCost + cylinderCost + nozzleCost + pipingCost + 
                                 m.detectionSystem + m.actuationDevice + m.controlPanel + m.warningSigns;
        
        const installationCost = equipmentSubtotal * (m.installationFactor - 1);
        const engineeringCost = equipmentSubtotal * (m.engineeringFactor - 1);
        
        const totalCostUSD = equipmentSubtotal + installationCost + engineeringCost + 
                           m.installationLabor + m.documentation;

        // Convert to selected currency
        const exchangeRate = rates[currency] || 1;
        const totalCostConverted = totalCostUSD * exchangeRate;

        return {
            agentCost: parseFloat(agentCost.toFixed(2)),
            cylinderCost: parseFloat(cylinderCost.toFixed(2)),
            nozzleCost: parseFloat(nozzleCost.toFixed(2)),
            pipingCost: parseFloat(pipingCost.toFixed(2)),
            equipmentSubtotal: parseFloat(equipmentSubtotal.toFixed(2)),
            installationCost: parseFloat(installationCost.toFixed(2)),
            engineeringCost: parseFloat(engineeringCost.toFixed(2)),
            installationLabor: parseFloat(m.installationLabor.toFixed(2)),
            documentation: parseFloat(m.documentation.toFixed(2)),
            totalCostUSD: parseFloat(totalCostUSD.toFixed(2)),
            totalCostConverted: parseFloat(totalCostConverted.toFixed(2)),
            exchangeRate
        };
    }

    initResultsPage() {
        this.loadCurrentData();
        if (!this.currentData) {
            this.showNotification('No calculation data found. Please use the calculator first.', 'warning');
            return;
        }

        const { formData, calculationResults, costResults } = this.currentData;
        
        // Populate data
        document.getElementById('displayProjectName').textContent = formData.projectName;
        document.getElementById('displayLocation').textContent = formData.clientLocation;
        document.getElementById('agentQuantity').textContent = `${calculationResults.agentWeight} kg`;
        document.getElementById('cylinderCount').textContent = `${calculationResults.cylinderCount} pcs`;
        document.getElementById('cylinderSizeDisplay').textContent = `${calculationResults.cylinderSize} kg`;
        document.getElementById('nozzleCount').textContent = `${calculationResults.nozzleCount} pcs`;
        document.getElementById('pipingLength').textContent = `${calculationResults.pipingLength} m`;
        document.getElementById('floorArea').textContent = `${calculationResults.floorArea} m²`;
        
        // Remove empty row and populate BOQ
        const emptyRow = document.getElementById('boqEmpty');
        if (emptyRow) emptyRow.remove();
        
        this.populateBOQ(calculationResults, costResults, formData.currency);
        this.initCostChart(costResults, formData.currency);
        
        // Set up buttons
        document.getElementById('printResults').addEventListener('click', () => window.print());
        document.getElementById('exportData').addEventListener('click', () => this.exportToCSV());
    }

    populateBOQ(calc, costs, currency) {
        const boqBody = document.getElementById('boqBody');
        const boqFooter = document.getElementById('boqFooter');
        
        const items = [
            ['FM-200 Agent', 'HFC-227ea Clean Agent', calc.agentWeight, 'kg', costs.agentCost / calc.agentWeight, costs.agentCost],
            ['Storage Cylinders', `${calc.cylinderSize}kg capacity`, calc.cylinderCount, 'pcs', costs.cylinderCost / calc.cylinderCount, costs.cylinderCost],
            ['Discharge Nozzles', 'Brass nozzles', calc.nozzleCount, 'pcs', costs.nozzleCost / calc.nozzleCount, costs.nozzleCost],
            ['Piping System', 'Steel piping & fittings', calc.pipingLength, 'm', costs.pipingCost / calc.pipingLength, costs.pipingCost],
            ['Detection System', 'Smoke/heat detectors', 1, 'set', 1800, 1800],
            ['Control Panel', 'Fire alarm panel', 1, 'set', 2200, 2200],
            ['Installation', 'Labor & commissioning', 1, 'job', costs.installationLabor, costs.installationLabor],
            ['Engineering', 'Design & certification', 1, 'job', costs.engineeringCost, costs.engineeringCost]
        ];

        boqBody.innerHTML = '';
        items.forEach(item => {
            const row = document.createElement('tr');
            const unitPrice = item[4] * costs.exchangeRate;
            const total = item[5] * costs.exchangeRate;
            
            row.innerHTML = `
                <td>${item[0]}</td>
                <td>${item[1]}</td>
                <td>${item[2].toFixed(item[3] === 'kg' || item[3] === 'm' ? 2 : 0)}</td>
                <td>${item[3]}</td>
                <td class="text-right">${this.formatCurrency(unitPrice, currency)}</td>
                <td class="text-right">${this.formatCurrency(total, currency)}</td>
            `;
            boqBody.appendChild(row);
        });

        boqFooter.innerHTML = `
            <tr class="total-row">
                <td colspan="5" class="text-right"><strong>Grand Total (${currency})</strong></td>
                <td class="text-right"><strong>${this.formatCurrency(costs.totalCostConverted, currency)}</strong></td>
            </tr>
        `;
    }

    initCostChart(costs, currency) {
        const ctx = document.getElementById('costBreakdownChart');
        if (!ctx) return;

        const chartNote = document.getElementById('chartNote');
        if (chartNote) chartNote.style.display = 'none';

        const data = [
            costs.agentCost * costs.exchangeRate,
            costs.cylinderCost * costs.exchangeRate,
            (costs.nozzleCost + costs.pipingCost) * costs.exchangeRate,
            4000 * costs.exchangeRate, // Detection + Control
            (costs.installationCost + costs.engineeringCost + costs.installationLabor) * costs.exchangeRate
        ];

        this.costChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Agent', 'Cylinders', 'Piping & Nozzles', 'Detection & Control', 'Installation & Engineering'],
                datasets: [{
                    data: data,
                    backgroundColor: ['#2c3e50', '#3498db', '#2ecc71', '#f39c12', '#e74c3c']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const value = ctx.parsed;
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const percent = ((value / total) * 100).toFixed(1);
                                return `${ctx.label}: ${this.formatCurrency(value, currency)} (${percent}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    initQuotationPage() {
        this.loadCurrentData();
        if (!this.currentData) {
            this.showNotification('No calculation data. Please use calculator first.', 'warning');
            return;
        }

        // Set default dates
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('quotationDate').value = today;
        
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        document.getElementById('validUntil').value = nextMonth.toISOString().split('T')[0];

        // Populate quotation data
        const { formData, calculationResults, costResults } = this.currentData;
        document.getElementById('quoteProjectName').textContent = formData.projectName;
        document.getElementById('quoteClientLocation').textContent = formData.clientLocation;
        document.getElementById('quotationGrandTotal').textContent = this.formatCurrency(costs.totalCostConverted, formData.currency);

        // Remove empty row and populate table
        const emptyRow = document.getElementById('quoteEmpty');
        if (emptyRow) emptyRow.remove();
        
        this.populateQuotationTable(calculationResults, costResults, formData.currency);

        // Set up export buttons
        document.getElementById('generatePDF').addEventListener('click', () => this.generatePDF());
        document.getElementById('generateExcel').addEventListener('click', () => this.exportToCSV());
    }

    populateQuotationTable(calc, costs, currency) {
        const tableBody = document.getElementById('quotationTableBody');
        
        const items = [
            ['FM-200 Clean Agent System', 'Complete HFC-227ea suppression system', 1, 'system', costs.totalCostConverted, costs.totalCostConverted]
        ];

        tableBody.innerHTML = '';
        items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${item[0]}</strong></td>
                <td>${item[1]}</td>
                <td>${item[2]}</td>
                <td>${item[3]}</td>
                <td class="text-right">${this.formatCurrency(item[4], currency)}</td>
                <td class="text-right"><strong>${this.formatCurrency(item[5], currency)}</strong></td>
            `;
            tableBody.appendChild(row);
        });
    }

    updateQuickPreview() {
        const preview = document.getElementById('quickPreviewMetrics');
        if (!preview) return;

        const length = parseFloat(document.getElementById('roomLength')?.value) || 0;
        const width = parseFloat(document.getElementById('roomWidth')?.value) || 0;
        const height = parseFloat(document.getElementById('roomHeight')?.value) || 0;

        if (length > 0 && width > 0 && height > 0) {
            const volume = (length * width * height).toFixed(1);
            const area = (length * width).toFixed(1);
            const agent = (volume * 0.73).toFixed(1); // Rough estimate

            preview.innerHTML = `
                <div class="preview-metrics">
                    <div class="preview-metric">
                        <div class="preview-value">${volume}</div>
                        <div class="preview-label">Volume (m³)</div>
                    </div>
                    <div class="preview-metric">
                        <div class="preview-value">${area}</div>
                        <div class="preview-label">Area (m²)</div>
                    </div>
                </div>
                <div class="preview-note">
                    <i class="fas fa-info-circle"></i> Est. agent: ${agent} kg
                </div>
            `;
        } else {
            preview.innerHTML = `
                <div class="preview-placeholder">
                    <i class="fas fa-ruler-combined"></i> Enter dimensions above
                </div>
            `;
        }
    }

    loadCurrentData() {
        const data = sessionStorage.getItem(STORAGE_KEYS.BUDGET_DATA);
        if (data) {
            this.currentData = JSON.parse(data);
        }
    }

    generateProjectId() {
        return 'FM' + Date.now().toString(36).toUpperCase();
    }

    formatCurrency(amount, currency) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount);
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('appNotification');
        if (!notification) return;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        notification.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
        notification.className = `notification show ${type}`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }

    initThemeToggle() {
        const toggleBtn = document.getElementById('themeToggle');
        if (!toggleBtn) return;

        // Check saved preference or default to light
        const savedTheme = localStorage.getItem('fm200_theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        toggleBtn.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';

        toggleBtn.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('fm200_theme', newTheme);
            toggleBtn.innerHTML = newTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        });
    }

    toggleExpertMode() {
        const isExpert = document.body.classList.toggle('expert-mode');
        const expertToggle = document.getElementById('expertMode');
        
        if (expertToggle) {
            expertToggle.innerHTML = isExpert ? 
                '<i class="fas fa-user-cog"></i> Expert Mode (ON)' : 
                '<i class="fas fa-user-cog"></i> Expert Mode';
            expertToggle.classList.toggle('active', isExpert);
        }
        
        localStorage.setItem('fm200_expert_mode', isExpert);
    }

    initExpertMode() {
        const savedMode = localStorage.getItem('fm200_expert_mode') === 'true';
        if (savedMode) {
            document.body.classList.add('expert-mode');
            const expertToggle = document.getElementById('expertMode');
            if (expertToggle) {
                expertToggle.innerHTML = '<i class="fas fa-user-cog"></i> Expert Mode (ON)';
                expertToggle.classList.add('active');
            }
        }
    }

    generatePDF() {
        this.showNotification('PDF generation requires additional setup. Export to CSV for now.', 'info');
    }

    exportToCSV() {
        if (!this.currentData) return;
        
        const { formData, calculationResults, costResults } = this.currentData;
        const today = new Date().toISOString().split('T')[0];
        
        let csv = `FM-200 Calculation Export,${today}\n`;
        csv += `Project,${formData.projectName}\n`;
        csv += `Location,${formData.clientLocation}\n`;
        csv += `Currency,${formData.currency}\n\n`;
        
        csv += `Room Dimensions,${calculationResults.grossVolume} m³\n`;
        csv += `Agent Required,${calculationResults.agentWeight} kg\n`;
        csv += `Cylinders,${calculationResults.cylinderCount} pcs\n`;
        csv += `Nozzles,${calculationResults.nozzleCount} pcs\n`;
        csv += `Piping,${calculationResults.pipingLength} m\n\n`;
        
        csv += `Total Cost,${this.formatCurrency(costResults.totalCostConverted, formData.currency)}\n`;
        csv += `Exchange Rate,${costResults.exchangeRate}\n`;
        
        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FM200-${formData.projectName.replace(/\s+/g, '-')}-${today}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        this.showNotification('Data exported to CSV', 'success');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.calculator = new FM200Calculator();
});
