// FM-200 Calculator - Complete Version with Print/PDF
// Version 5.2 - All features included

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const APP_CONFIG = {
    version: '5.2',
    appName: 'FM-200 Calculator',
    developer: 'Fire Safety Tools',
    contactEmail: 'contact@amjathkhan.com',
    contactPhone: '+91-9750816163',
    
    // Calculation Constants (NFPA 2001)
    MIN_CONCENTRATION: 7.0,
    SPECIFIC_VAPOR_BASE: 0.1269,
    SPECIFIC_VAPOR_TEMP_FACTOR: 0.0005,
    
    // Units
    units: {
        volume: 'm³',
        weight: 'kg',
        temperature: '°C',
        length: 'm',
        area: 'm²'
    },
    
    // Storage Keys
    storageKeys: {
        BUDGET_DATA: 'fm200_budget_data',
        USER_PREFERENCES: 'fm200_user_prefs',
        QUOTATION_DATA: 'fm200_quotation_data',
        VISITOR_COUNT: 'fm200_visitor_count'
    }
};

// ============================================================================
// DEFAULT DATA - INR ONLY
// ============================================================================

const DEFAULT_DATA = {
    costMultipliers: {
        "agentCostPerKg": 4000.00,        // INR per kg
        "cylinderCost": 90000.00,         // INR per cylinder
        "nozzleCost": 8000.00,           // INR per nozzle
        "pipingCostPerMeter": 1200.00,   // INR per meter
        "fittingsCost": 15000.00,        // INR
        "valveAssembly": 25000.00,       // INR
        "mountingHardware": 5000.00,     // INR
        "detectionPanel": 120000.00,     // INR
        "smokeDetector": 4500.00,        // INR
        "heatDetector": 3800.00,         // INR
        "manualCallPoint": 2500.00,      // INR
        "hooterStrobe": 3500.00,         // INR
        "warningSigns": 2000.00,         // INR
        "installationLaborPerHour": 850.00,  // INR per hour
        "engineeringDesign": 75000.00,   // INR
        "commissioningTesting": 50000.00, // INR
        "documentation": 15000.00,       // INR
        "installationFactor": 1.28,      // 28% installation factor
        "engineeringFactor": 1.15,       // 15% engineering factor
        "contingencyFactor": 1.18        // 18% contingency
    }
};

// ============================================================================
// FM200Calculator CLASS
// ============================================================================

class FM200Calculator {
    constructor() {
        this.currentData = null;
        this.userPrefs = this.loadPreferences();
        this.costMultipliers = DEFAULT_DATA.costMultipliers;
        
        this.initializeApp();
    }

    // ============================================================================
    // INITIALIZATION METHODS
    // ============================================================================

    initializeApp() {
        console.log('Initializing FM-200 Calculator v' + APP_CONFIG.version);
        
        // Hide loading screen
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }
        }, 800);

        const path = window.location.pathname;
        
        if (path.includes('index.html') || path === '/' || path.includes('/index.html')) {
            this.initCalculatorPage();
        } else if (path.includes('results.html')) {
            this.initResultsPage();
        } else if (path.includes('quotation.html')) {
            this.initQuotationPage();
        }

        this.initThemeToggle();
        this.initExpertMode();
        this.updateVisitorCounter();
        
        console.log('Application initialized successfully');
    }

    // ============================================================================
    // PREFERENCES MANAGEMENT
    // ============================================================================

    loadPreferences() {
        try {
            const prefs = localStorage.getItem(APP_CONFIG.storageKeys.USER_PREFERENCES);
            if (prefs) {
                return JSON.parse(prefs);
            }
        } catch (e) {
            console.warn('Error loading preferences:', e);
        }
        return {
            theme: 'light',
            expertMode: false,
            lastCurrency: 'INR'
        };
    }

    savePreferences() {
        try {
            localStorage.setItem(APP_CONFIG.storageKeys.USER_PREFERENCES, JSON.stringify(this.userPrefs));
        } catch (e) {
            console.warn('Error saving preferences:', e);
        }
    }

    // ============================================================================
    // CALCULATOR PAGE
    // ============================================================================

    initCalculatorPage() {
        console.log('Initializing Calculator Page');
        
        const form = document.getElementById('fm200Form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission();
            });
        }

        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset all inputs to default values?')) {
                    this.resetForm();
                }
            });
        }

        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.openSaveModal();
            });
        }

        const expertToggle = document.getElementById('expertModeToggle');
        if (expertToggle) {
            expertToggle.checked = this.userPrefs.expertMode;
            expertToggle.addEventListener('change', () => this.toggleExpertMode());
            
            const expertPanel = document.getElementById('expertModePanel');
            if (expertPanel) {
                expertPanel.style.display = this.userPrefs.expertMode ? 'block' : 'none';
            }
        }

        this.setDefaultValues();
        
        // Real-time preview updates
        ['room-length', 'room-width', 'room-height', 'room-temperature', 'hazard-class'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.updateQuickPreview());
            }
        });

        this.updateQuickPreview();
        this.initAccordion();
        
        console.log('Calculator Page Initialized');
    }

    setDefaultValues() {
        const today = new Date();
        const projectName = document.getElementById('project-name');
        if (projectName && !projectName.value) {
            projectName.value = `FM-200 Project ${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
        }
    }

    resetForm() {
        const form = document.getElementById('fm200Form');
        if (form) {
            form.reset();
            this.setDefaultValues();
            this.updateQuickPreview();
            this.showNotification('Form reset to default values', 'success');
        }
    }

    updateQuickPreview() {
        try {
            const length = parseFloat(document.getElementById('room-length')?.value) || 10;
            const width = parseFloat(document.getElementById('room-width')?.value) || 8;
            const height = parseFloat(document.getElementById('room-height')?.value) || 3;
            const temp = parseFloat(document.getElementById('room-temperature')?.value) || 20;
            const concentration = parseFloat(document.getElementById('hazard-class')?.value) || 7.5;

            const volume = length * width * height;
            const specificVolume = APP_CONFIG.SPECIFIC_VAPOR_BASE + (APP_CONFIG.SPECIFIC_VAPOR_TEMP_FACTOR * temp);
            const agentMass = (volume / specificVolume) * (concentration / (100 - concentration));

            this.setElementText('displayVolume', `${this.round(volume, 2)} m³`);
            this.setElementText('displaySpecificVolume', `${this.round(specificVolume, 4)} m³/kg`);
            this.setElementText('displayConcentration', `${concentration}%`);
            this.setElementText('displayAgentMass', `${this.round(agentMass, 2)} kg`);
        } catch (error) {
            console.error('Error updating preview:', error);
        }
    }

    initAccordion() {
        const accordionHeaders = document.querySelectorAll('.accordion-header');
        accordionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const item = header.parentElement;
                const content = header.nextElementSibling;
                
                item.classList.toggle('active');
                
                if (item.classList.contains('active')) {
                    content.style.maxHeight = content.scrollHeight + 'px';
                    content.style.padding = '15px';
                } else {
                    content.style.maxHeight = '0';
                    content.style.padding = '0 15px';
                }
            });
        });
    }

    openSaveModal() {
        const modal = document.getElementById('saveModal');
        if (modal) {
            modal.style.display = 'flex';
            const closeBtn = modal.querySelector('.close-modal');
            const confirmBtn = document.getElementById('confirmSaveBtn');
            
            if (closeBtn) {
                closeBtn.onclick = () => {
                    modal.style.display = 'none';
                };
            }
            
            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    this.saveCalculation();
                    modal.style.display = 'none';
                };
            }
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
    }

    saveCalculation() {
        const saveName = document.getElementById('saveName')?.value || 'My Calculation';
        const formData = this.collectFormData();
        
        if (formData) {
            try {
                const savedCalculations = JSON.parse(localStorage.getItem('fm200SavedCalculations') || '[]');
                savedCalculations.push({
                    name: saveName,
                    data: formData,
                    timestamp: new Date().toISOString()
                });
                
                localStorage.setItem('fm200SavedCalculations', JSON.stringify(savedCalculations));
                this.showNotification('Calculation saved successfully!', 'success');
            } catch (e) {
                this.showNotification('Error saving calculation: ' + e.message, 'error');
            }
        }
    }

    collectFormData() {
        const getValue = (id) => {
            const element = document.getElementById(id);
            return element ? element.value : null;
        };

        const getNumber = (id, defaultValue = 0) => {
            const value = getValue(id);
            return value ? parseFloat(value) : defaultValue;
        };

        const formData = {
            projectName: getValue('project-name') || 'FM-200 Project',
            clientLocation: getValue('location') || 'Not Specified',
            
            roomLength: getNumber('room-length', 10),
            roomWidth: getNumber('room-width', 8),
            roomHeight: getNumber('room-height', 3),
            
            designTemperature: getNumber('room-temperature', 20),
            altitude: getNumber('altitude', 0),
            concentration: getNumber('hazard-class', 7.5)
        };

        // Validation
        const errors = [];
        
        if (formData.roomLength <= 0 || formData.roomWidth <= 0 || formData.roomHeight <= 0) {
            errors.push('Room dimensions must be greater than zero');
        }
        
        if (formData.concentration < 7.0 || formData.concentration > 10.5) {
            errors.push('Concentration must be between 7.0% and 10.5%');
        }

        if (errors.length > 0) {
            this.showNotification(errors.join(', '), 'error');
            return null;
        }

        return formData;
    }

    handleFormSubmission() {
        try {
            const formData = this.collectFormData();
            if (!formData) return;
            
            const calculationResults = this.performNFPA2001Calculation(formData);
            
            const completeData = {
                formData: formData,
                calculationResults: calculationResults,
                metadata: {
                    timestamp: new Date().toISOString(),
                    projectId: this.generateProjectId(),
                    version: APP_CONFIG.version
                }
            };

            sessionStorage.setItem(APP_CONFIG.storageKeys.BUDGET_DATA, JSON.stringify(completeData));

            this.showNotification('Calculation successful! Redirecting to results...', 'success');
            
            setTimeout(() => {
                window.location.href = 'results.html';
            }, 1500);

        } catch (error) {
            console.error('Calculation Error:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    // ============================================================================
    // CORE CALCULATION
    // ============================================================================

    performNFPA2001Calculation(formData) {
        const { roomLength, roomWidth, roomHeight, designTemperature, altitude, concentration } = formData;

        // 1. Calculate volumes
        const grossVolume = roomLength * roomWidth * roomHeight;
        const netVolume = grossVolume;
        
        // 2. Calculate Specific Vapor Volume (S) per NFPA 2001
        const specificVaporVolume = APP_CONFIG.SPECIFIC_VAPOR_BASE + 
                                   (APP_CONFIG.SPECIFIC_VAPOR_TEMP_FACTOR * designTemperature);

        // 3. Calculate Agent Weight using NFPA 2001 formula
        let agentWeight = (netVolume / specificVaporVolume) * (concentration / (100 - concentration));

        // 4. Apply altitude correction (if altitude > 500m)
        if (altitude > 500) {
            const altitudeFactor = 1 + ((altitude - 500) / 300) * 0.01;
            agentWeight *= altitudeFactor;
        }

        // 5. Calculate cylinder count (assuming 54.4kg cylinders)
        const cylinderSize = 54.4;
        const cylinderCount = Math.ceil(agentWeight / cylinderSize);

        // 6. Calculate number of nozzles
        const floorArea = roomLength * roomWidth;
        const nozzleCoverage = 50; // m² per nozzle
        const nozzleCount = Math.max(2, Math.ceil(floorArea / nozzleCoverage));

        // 7. Estimate piping length
        const pipingLength = (roomLength + roomWidth) * 2 + (roomHeight * 2);

        // 8. Return all calculation results
        return {
            agentWeight: this.round(agentWeight, 2),
            cylinderCount: cylinderCount,
            nozzleCount: nozzleCount,
            cylinderSize: cylinderSize,
            
            grossVolume: this.round(grossVolume, 2),
            netVolume: this.round(netVolume, 2),
            floorArea: this.round(floorArea, 2),
            pipingLength: this.round(pipingLength, 2),
            
            specificVaporVolume: this.round(specificVaporVolume, 4),
            concentration: concentration,
            designTemperature: designTemperature,
            altitude: altitude,
            
            calculationMethod: 'NFPA 2001 Standard Formula',
            units: APP_CONFIG.units
        };
    }

    // ============================================================================
    // RESULTS PAGE
    // ============================================================================

    initResultsPage() {
        console.log('Initializing Results Page');
        
        this.loadCalculationData();
        this.renderResultsPage();
        this.initResultsEventListeners();

        console.log('Results Page Initialized');
    }

    loadCalculationData() {
        try {
            const dataJson = sessionStorage.getItem(APP_CONFIG.storageKeys.BUDGET_DATA);
            if (dataJson) {
                this.currentData = JSON.parse(dataJson);
                console.log('Calculation data loaded');
                
                // Calculate costs
                const costResults = this.calculateSystemCosts(this.currentData.calculationResults);
                this.currentData.costResults = costResults;
                
                // Update BOQ table
                setTimeout(() => this.renderBOQTable(), 100);
            } else {
                this.showNotification('No previous calculation found. Please use the calculator page first.', 'warning');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
            }
        } catch (e) {
            console.error('Error loading calculation data:', e);
            this.showNotification('Error loading calculation data. Please recalculate.', 'error');
        }
    }

    renderResultsPage() {
        if (!this.currentData) return;

        const { formData, calculationResults } = this.currentData;
        
        this.setElementText('displayProjectName', formData.projectName);
        this.setElementText('agentMassResult', `${calculationResults.agentWeight} kg`);
        this.setElementText('cylinderCountResult', `${calculationResults.cylinderCount} x ${calculationResults.cylinderSize} kg cylinders`);
        this.setElementText('roomVolumeResult', `${calculationResults.netVolume} m³`);
        this.setElementText('designTempResult', `${calculationResults.designTemperature} °C`);
        this.setElementText('altitudeResult', `${calculationResults.altitude} m`);
        this.setElementText('concentrationResult', `${calculationResults.concentration}%`);
        this.setElementText('specificVolumeResult', `${calculationResults.specificVaporVolume} m³/kg`);
        this.setElementText('nozzleCoverageResult', `${calculationResults.floorArea} m²`);
        this.setElementText('nozzleCountResult', calculationResults.nozzleCount);
    }

    calculateSystemCosts(calculationResults) {
        const m = this.costMultipliers;
        
        // Calculate all costs in INR
        const agentCost = calculationResults.agentWeight * m.agentCostPerKg;
        const cylinderCost = calculationResults.cylinderCount * m.cylinderCost;
        const valveCost = calculationResults.cylinderCount * m.valveAssembly;
        const mountingCost = calculationResults.cylinderCount * m.mountingHardware;
        const nozzleCost = calculationResults.nozzleCount * m.nozzleCost;
        const pipingCost = calculationResults.pipingLength * m.pipingCostPerMeter;
        const fittingsCost = m.fittingsCost;
        const detectionCost = m.detectionPanel;
        const smokeDetectors = Math.max(2, Math.ceil(calculationResults.floorArea / 100)) * m.smokeDetector;
        const heatDetectors = 2 * m.heatDetector;
        const manualCallPoints = 2 * m.manualCallPoint;
        const hooterStrobes = 4 * m.hooterStrobe;
        const warningSigns = m.warningSigns;
        
        // Equipment Subtotal
        const equipmentSubtotal = agentCost + cylinderCost + valveCost + mountingCost +
                                 nozzleCost + pipingCost + fittingsCost +
                                 detectionCost + smokeDetectors + heatDetectors +
                                 manualCallPoints + hooterStrobes + warningSigns;

        // Installation Labor
        const installationHours = 40 + (calculationResults.cylinderCount * 4) + 
                                 (calculationResults.nozzleCount * 2) + 
                                 (calculationResults.pipingLength * 0.5);
        const installationLabor = installationHours * m.installationLaborPerHour;

        const laborSubtotal = installationLabor + m.engineeringDesign + m.commissioningTesting + m.documentation;
        
        // Apply Factors
        const installationCost = equipmentSubtotal * (m.installationFactor - 1);
        const engineeringCost = equipmentSubtotal * (m.engineeringFactor - 1);
        const contingency = equipmentSubtotal * (m.contingencyFactor - 1);

        const totalEquipmentAndLabor = equipmentSubtotal + installationLabor + m.engineeringDesign + m.commissioningTesting + m.documentation;
        const totalINR = totalEquipmentAndLabor + installationCost + engineeringCost + contingency;

        return {
            agentCost: this.round(agentCost, 2),
            cylinderCost: this.round(cylinderCost, 2),
            valveCost: this.round(valveCost, 2),
            mountingCost: this.round(mountingCost, 2),
            nozzleCost: this.round(nozzleCost, 2),
            pipingCost: this.round(pipingCost, 2),
            fittingsCost: this.round(fittingsCost, 2),
            detectionCost: this.round(detectionCost, 2),
            smokeDetectors: this.round(smokeDetectors, 2),
            heatDetectors: this.round(heatDetectors, 2),
            manualCallPoints: this.round(manualCallPoints, 2),
            hooterStrobes: this.round(hooterStrobes, 2),
            warningSigns: this.round(warningSigns, 2),
            
            installationLabor: this.round(installationLabor, 2),
            engineeringDesign: this.round(m.engineeringDesign, 2),
            commissioningTesting: this.round(m.commissioningTesting, 2),
            documentation: this.round(m.documentation, 2),

            equipmentSubtotal: this.round(equipmentSubtotal, 2),
            laborSubtotal: this.round(laborSubtotal, 2),
            installationFactorCost: this.round(installationCost, 2),
            engineeringFactorCost: this.round(engineeringCost, 2),
            contingency: this.round(contingency, 2),
            
            totalINR: this.round(totalINR, 2),
            currency: 'INR'
        };
    }

    initResultsEventListeners() {
        // Print/PDF Button
        const printBtn = document.getElementById('printResults');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                this.printResultsAsPDF();
            });
        }

        // Export BOQ Button
        const exportBtn = document.getElementById('exportBOQ');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportBOQToCSV();
            });
        }
    }

    renderBOQTable() {
        if (!this.currentData) return;
        
        const { costResults, calculationResults } = this.currentData;
        const currency = 'INR';
        const boqBody = document.querySelector('#boqTable tbody');
        
        if (!boqBody) return;
        
        boqBody.innerHTML = '';
        
        const boqItems = [
            { 
                item: 'FM-200 Agent', 
                qty: calculationResults.agentWeight, 
                unit: 'kg', 
                unitPrice: costResults.agentCost / calculationResults.agentWeight 
            },
            { 
                item: 'Storage Cylinders', 
                qty: calculationResults.cylinderCount, 
                unit: 'pcs', 
                unitPrice: costResults.cylinderCost / calculationResults.cylinderCount 
            },
            { 
                item: 'Valve Assemblies', 
                qty: calculationResults.cylinderCount, 
                unit: 'pcs', 
                unitPrice: costResults.valveCost / calculationResults.cylinderCount 
            },
            { 
                item: 'Mounting Hardware', 
                qty: calculationResults.cylinderCount, 
                unit: 'sets', 
                unitPrice: costResults.mountingCost / calculationResults.cylinderCount 
            },
            { 
                item: 'Nozzles', 
                qty: calculationResults.nozzleCount, 
                unit: 'pcs', 
                unitPrice: costResults.nozzleCost / calculationResults.nozzleCount 
            },
            { 
                item: 'Piping', 
                qty: calculationResults.pipingLength, 
                unit: 'm', 
                unitPrice: costResults.pipingCost / calculationResults.pipingLength 
            },
            { 
                item: 'Fittings & Accessories', 
                qty: 1, 
                unit: 'lot', 
                unitPrice: costResults.fittingsCost 
            },
            { 
                item: 'Detection Panel', 
                qty: 1, 
                unit: 'pcs', 
                unitPrice: costResults.detectionCost 
            },
            { 
                item: 'Smoke Detectors', 
                qty: Math.max(2, Math.ceil(calculationResults.floorArea / 100)), 
                unit: 'pcs', 
                unitPrice: this.costMultipliers.smokeDetector 
            },
            { 
                item: 'Heat Detectors', 
                qty: 2, 
                unit: 'pcs', 
                unitPrice: this.costMultipliers.heatDetector 
            }
        ];
        
        let subtotal = 0;
        
        boqItems.forEach(item => {
            const total = item.unitPrice * item.qty;
            subtotal += total;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.item}</td>
                <td>${this.round(item.qty, 2)} ${item.unit}</td>
                <td>${this.formatCurrency(item.unitPrice, currency)}</td>
                <td>${this.formatCurrency(total, currency)}</td>
            `;
            boqBody.appendChild(row);
        });
        
        // Additional costs
        const additionalItems = [
            { item: 'Manual Call Points', cost: costResults.manualCallPoints },
            { item: 'Hooter Strobes', cost: costResults.hooterStrobes },
            { item: 'Warning Signs', cost: costResults.warningSigns },
            { item: 'Installation Labor', cost: costResults.installationLabor },
            { item: 'Engineering Design', cost: costResults.engineeringDesign },
            { item: 'Commissioning & Testing', cost: costResults.commissioningTesting },
            { item: 'Documentation', cost: costResults.documentation }
        ];
        
        additionalItems.forEach(item => {
            subtotal += item.cost;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.item}</td>
                <td>1</td>
                <td>${this.formatCurrency(item.cost, currency)}</td>
                <td>${this.formatCurrency(item.cost, currency)}</td>
            `;
            boqBody.appendChild(row);
        });
        
        const factorTotal = costResults.installationFactorCost + costResults.engineeringFactorCost + costResults.contingency;
        const grandTotal = subtotal + factorTotal;
        
        // Remove or hide currency selector since we only use INR
        const currencySelector = document.querySelector('.currency-selector-wrapper');
        if (currencySelector) {
            currencySelector.style.display = 'none';
        }
        
        const exchangeRateDisplay = document.querySelector('.exchange-rate');
        if (exchangeRateDisplay) {
            exchangeRateDisplay.innerHTML = '<i class="fas fa-rupee-sign"></i> All prices in Indian Rupees (INR)';
        }
        
        this.setElementText('subtotalCost', this.formatCurrency(subtotal, currency));
        this.setElementText('factorCost', this.formatCurrency(factorTotal, currency));
        this.setElementText('grandTotalCost', this.formatCurrency(grandTotal, currency));
        
        // Update currency symbols in table headers
        document.querySelectorAll('.currency-symbol').forEach(el => {
            el.textContent = 'INR';
        });
        
        const installPercent = (this.costMultipliers.installationFactor - 1) * 100;
        const engineerPercent = (this.costMultipliers.engineeringFactor - 1) * 100;
        const contingencyPercent = (this.costMultipliers.contingencyFactor - 1) * 100;
        
        this.setElementText('installFactor', `${installPercent.toFixed(0)}%`);
        this.setElementText('engineerFactor', `${engineerPercent.toFixed(0)}%`);
        
        // Update cost note
        const costNote = document.querySelector('.cost-note');
        if (costNote) {
            costNote.innerHTML = `Note: Total cost includes installation factor (${installPercent.toFixed(0)}%), engineering factor (${engineerPercent.toFixed(0)}%), and contingency (${contingencyPercent.toFixed(0)}%). Prices are indicative and subject to change.`;
        }
    }

    printResultsAsPDF() {
        try {
            // Create a printable version
            const printContent = document.createElement('div');
            printContent.className = 'print-section';
            printContent.style.cssText = `
                padding: 20px;
                background: white;
                color: black;
                font-family: Arial, sans-serif;
            `;
            
            const { formData, calculationResults, costResults } = this.currentData;
            
            printContent.innerHTML = `
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ff4c4c; padding-bottom: 20px;">
                    <h1 style="color: #ff4c4c; margin: 0;">FM-200 CALCULATION REPORT</h1>
                    <p style="color: #666; margin: 10px 0 0 0;">Generated on ${new Date().toLocaleDateString()}</p>
                    <p style="color: #666; margin: 5px 0;">Project: ${formData.projectName}</p>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <h2 style="color: #0099e5; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Project Information</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Project Name:</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${formData.projectName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Location:</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${formData.clientLocation}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Generated Date:</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <h2 style="color: #0099e5; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Calculation Results</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Room Volume:</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${calculationResults.netVolume} m³</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>FM-200 Agent Required:</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${calculationResults.agentWeight} kg</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Cylinders Required:</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${calculationResults.cylinderCount} x ${calculationResults.cylinderSize} kg</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Nozzles Required:</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${calculationResults.nozzleCount} pcs</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Design Concentration:</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${calculationResults.concentration}%</td>
                        </tr>
                    </table>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <h2 style="color: #0099e5; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Cost Estimate (INR)</h2>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <thead>
                            <tr style="background: #ff4c4c; color: white;">
                                <th style="padding: 10px; border: 1px solid #ddd;">Item</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">Amount (INR)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">FM-200 Agent</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${this.formatCurrency(costResults.agentCost, 'INR')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">Cylinders & Accessories</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${this.formatCurrency(costResults.cylinderCost + costResults.valveCost + costResults.mountingCost, 'INR')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">Nozzles & Piping</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${this.formatCurrency(costResults.nozzleCost + costResults.pipingCost + costResults.fittingsCost, 'INR')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">Detection System</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${this.formatCurrency(costResults.detectionCost + costResults.smokeDetectors + costResults.heatDetectors, 'INR')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">Installation & Engineering</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${this.formatCurrency(costResults.installationLabor + costResults.engineeringDesign + costResults.commissioningTesting + costResults.documentation, 'INR')}</td>
                            </tr>
                            <tr style="background: #f9f9f9;">
                                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Subtotal</strong></td>
                                <td style="padding: 8px; border: 1px solid #ddd;"><strong>${this.formatCurrency(costResults.equipmentSubtotal + costResults.laborSubtotal, 'INR')}</strong></td>
                            </tr>
                            <tr style="background: #e9f7e9;">
                                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Additional Factors & Contingency</strong></td>
                                <td style="padding: 8px; border: 1px solid #ddd;"><strong>${this.formatCurrency(costResults.installationFactorCost + costResults.engineeringFactorCost + costResults.contingency, 'INR')}</strong></td>
                            </tr>
                            <tr style="background: #34bf49; color: white;">
                                <td style="padding: 10px; border: 1px solid #ddd;"><strong>GRAND TOTAL ESTIMATE</strong></td>
                                <td style="padding: 10px; border: 1px solid #ddd;"><strong>${this.formatCurrency(costResults.totalINR, 'INR')}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div style="margin-top: 40px; padding: 20px; border: 1px solid #ff4c4c; border-radius: 5px; background: #fff9f9;">
                    <h3 style="color: #ff4c4c; margin-top: 0;">Important Notes:</h3>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>This is a preliminary estimate based on the provided room dimensions.</li>
                        <li>Final design must be verified by a qualified fire protection engineer.</li>
                        <li>Prices are in Indian Rupees (INR) and include GST where applicable.</li>
                        <li>Installation timeline: 4-6 weeks from order confirmation.</li>
                        <li>System warranty: 12 months from commissioning date.</li>
                    </ul>
                </div>
                
                <div style="margin-top: 40px; text-align: center; color: #666; font-size: 0.9rem; border-top: 1px solid #ddd; padding-top: 20px;">
                    <p>Generated by FM-200 Calculator v${APP_CONFIG.version}</p>
                    <p>Contact: ${APP_CONFIG.contactEmail} | Phone: ${APP_CONFIG.contactPhone}</p>
                    <p>Website: https://fm-200-room-flooding-system-calcula.vercel.app/</p>
                </div>
            `;
            
            // Open print dialog
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>FM-200 Calculation Report - ${formData.projectName}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                        @media print {
                            body { margin: 0; }
                            .no-print { display: none; }
                        }
                        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                        th { background: #ff4c4c; color: white; padding: 10px; text-align: left; }
                        td { padding: 8px; border: 1px solid #ddd; }
                        .total-row { background: #34bf49; color: white; font-weight: bold; }
                        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 0.9rem; border-top: 1px solid #ddd; padding-top: 20px; }
                    </style>
                </head>
                <body>
                    ${printContent.innerHTML}
                    <div class="footer no-print" style="margin-top: 30px;">
                        <button onclick="window.print()" style="padding: 10px 20px; background: #ff4c4c; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-right: 10px;">
                            <i class="fas fa-print"></i> Print Report
                        </button>
                        <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
                            Close Window
                        </button>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            
            // Auto-print after a short delay
            setTimeout(() => {
                printWindow.print();
            }, 500);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            this.showNotification('Error generating print report. Please try again.', 'error');
        }
    }

    exportBOQToCSV() {
        if (!this.currentData) return;
        
        const { formData, calculationResults, costResults } = this.currentData;
        
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Header
        csvContent += `FM-200 Bill of Quantities Export\r\n`;
        csvContent += `Project: ${formData.projectName}\r\n`;
        csvContent += `Date: ${new Date().toLocaleDateString()}\r\n`;
        csvContent += `\r\n`;
        
        // Items
        csvContent += `Item,Quantity,Unit Price (INR),Total (INR)\r\n`;
        
        const items = [
            [`FM-200 Agent`, calculationResults.agentWeight, this.costMultipliers.agentCostPerKg, costResults.agentCost],
            [`Storage Cylinders`, calculationResults.cylinderCount, this.costMultipliers.cylinderCost, costResults.cylinderCost],
            [`Nozzles`, calculationResults.nozzleCount, this.costMultipliers.nozzleCost, costResults.nozzleCost],
            [`Piping (${calculationResults.pipingLength}m)`, calculationResults.pipingLength, this.costMultipliers.pipingCostPerMeter, costResults.pipingCost],
            [`Detection Panel`, 1, this.costMultipliers.detectionPanel, costResults.detectionCost]
        ];
        
        items.forEach(item => {
            csvContent += `${item[0]},${item[1]},${item[2].toFixed(2)},${item[3].toFixed(2)}\r\n`;
        });
        
        csvContent += `\r\n`;
        csvContent += `Subtotal,,,${costResults.equipmentSubtotal.toFixed(2)}\r\n`;
        csvContent += `Installation & Engineering,,,${costResults.laborSubtotal.toFixed(2)}\r\n`;
        csvContent += `Additional Factors,,,${(costResults.installationFactorCost + costResults.engineeringFactorCost + costResults.contingency).toFixed(2)}\r\n`;
        csvContent += `GRAND TOTAL,,,${costResults.totalINR.toFixed(2)}\r\n`;
        
        // Create download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `FM200_BOQ_${formData.projectName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification('BOQ exported as CSV file', 'success');
    }

    // ============================================================================
    // QUOTATION PAGE
    // ============================================================================

    initQuotationPage() {
        console.log('Initializing Quotation Page');
        
        this.setQuotationDates();
        this.loadQuotationData();
        
        const autoFillBtn = document.getElementById('autoFill');
        if (autoFillBtn) {
            autoFillBtn.addEventListener('click', () => {
                this.autoFillQuotationForm();
            });
        }

        const generatePDFBtn = document.getElementById('generatePDF');
        if (generatePDFBtn) {
            generatePDFBtn.addEventListener('click', () => {
                this.generateQuotationPDF();
            });
        }

        // Live form updates
        this.setupQuotationFormUpdates();
        
        console.log('Quotation Page Initialized');
    }

    setQuotationDates() {
        const today = new Date().toISOString().split('T')[0];
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const validUntil = nextMonth.toISOString().split('T')[0];

        const dateField = document.getElementById('quotationDate');
        const validField = document.getElementById('validUntil');

        if (dateField) dateField.value = today;
        if (validField) validField.value = validUntil;
        
        // Update preview
        this.updateQuotationPreview();
    }

    loadQuotationData() {
        try {
            const dataJson = sessionStorage.getItem(APP_CONFIG.storageKeys.BUDGET_DATA);
            if (dataJson) {
                this.currentData = JSON.parse(dataJson);
                console.log('Quotation data loaded from calculator');
                
                // Calculate costs for quotation
                const costResults = this.calculateSystemCosts(this.currentData.calculationResults);
                this.currentData.costResults = costResults;
                
                // Auto-fill if data exists
                this.autoFillQuotationForm();
            }
        } catch (e) {
            console.error('Error loading quotation data:', e);
        }
    }

    autoFillQuotationForm() {
        if (!this.currentData) {
            this.showNotification('No calculation data available for auto-fill. Please use calculator first.', 'warning');
            return;
        }
        
        const { formData, calculationResults, costResults } = this.currentData;

        // Generate quotation number
        const quoteNumber = `Q-FM200-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        
        // Set form values
        this.setFormValue('quotationNumber', quoteNumber);
        this.setFormValue('clientName', formData.projectName);
        this.setFormValue('clientAddress', formData.clientLocation);
        
        // Set scope of work
        const scopeOfWork = `Design, Supply, Installation, and Commissioning of FM-200 Fire Suppression System as per NFPA 2001 standard for ${calculationResults.netVolume} m³ room volume. System includes ${calculationResults.cylinderCount} cylinders, ${calculationResults.nozzleCount} nozzles, and complete detection system.`;
        this.setFormValue('scopeOfWork', scopeOfWork);
        
        // Update preview
        this.updateQuotationPreview();
        
        this.showNotification('Quotation form auto-filled with project data', 'success');
    }

    setupQuotationFormUpdates() {
        // Update preview on form changes
        const formElements = [
            'quotationNumber', 'quotationDate', 'validUntil', 'currency',
            'clientName', 'clientContact', 'clientEmail', 'clientPhone', 'clientAddress',
            'senderName', 'senderEmail', 'senderPhone', 'senderWebsite',
            'paymentTerms', 'scopeOfWork'
        ];
        
        formElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.updateQuotationPreview());
                element.addEventListener('change', () => this.updateQuotationPreview());
            }
        });
    }

    updateQuotationPreview() {
        // Update preview elements with form values
        const previewMappings = {
            'quotationNumber': 'previewQuoteNumber',
            'quotationDate': 'previewDate',
            'validUntil': 'previewValidUntil',
            'currency': 'previewCurrency',
            'clientName': 'previewClientName',
            'clientContact': 'previewClientContact',
            'clientEmail': 'previewClientEmail',
            'clientPhone': 'previewClientPhone',
            'senderName': 'previewSenderName',
            'senderEmail': 'previewSenderEmail',
            'senderPhone': 'previewSenderPhone',
            'senderWebsite': 'previewSenderWebsite',
            'paymentTerms': 'previewPaymentTerms',
            'scopeOfWork': 'previewScopeOfWork'
        };

        for (const [formId, previewId] of Object.entries(previewMappings)) {
            const formElement = document.getElementById(formId);
            const previewElement = document.getElementById(previewId);
            
            if (formElement && previewElement) {
                previewElement.textContent = formElement.value || '--';
            }
        }

        // Update calculation results if available
        if (this.currentData) {
            const { calculationResults, costResults } = this.currentData;
            
            this.setElementText('previewRoomVolume', `${calculationResults.netVolume} m³`);
            this.setElementText('previewAgentWeight', `${calculationResults.agentWeight} kg`);
            this.setElementText('previewCylinderCount', `${calculationResults.cylinderCount} pcs`);
            this.setElementText('previewNozzleCount', `${calculationResults.nozzleCount} pcs`);
            
            // Update cost table
            const systemCost = costResults.agentCost + costResults.cylinderCost + costResults.valveCost + 
                             costResults.mountingCost + costResults.nozzleCost + costResults.pipingCost + 
                             costResults.fittingsCost + costResults.detectionCost + costResults.smokeDetectors + 
                             costResults.heatDetectors + costResults.manualCallPoints + costResults.hooterStrobes + 
                             costResults.warningSigns;
            
            const installationCost = costResults.installationLabor;
            const engineeringCost = costResults.engineeringDesign + costResults.commissioningTesting + costResults.documentation;
            const contingencyCost = costResults.installationFactorCost + costResults.engineeringFactorCost + costResults.contingency;
            
            this.setElementText('previewSystemCost', this.formatCurrency(systemCost, 'INR'));
            this.setElementText('previewInstallationCost', this.formatCurrency(installationCost, 'INR'));
            this.setElementText('previewEngineeringCost', this.formatCurrency(engineeringCost, 'INR'));
            this.setElementText('previewContingencyCost', this.formatCurrency(contingencyCost, 'INR'));
            
            const totalCost = systemCost + installationCost + engineeringCost + contingencyCost;
            this.setElementText('previewTotalCost', this.formatCurrency(totalCost, 'INR'));
            
            // Update currency in terms
            const finalCurrencyElement = document.getElementById('finalCurrency');
            if (finalCurrencyElement) {
                finalCurrencyElement.textContent = 'INR';
            }
        }
    }

    generateQuotationPDF() {
        try {
            const previewElement = document.getElementById('quotationPreview');
            if (!previewElement) {
                this.showNotification('Cannot generate PDF. Preview not found.', 'error');
                return;
            }

            // Create a print-friendly version
            const printWindow = window.open('', '_blank');
            
            // Get form data
            const quoteNumber = document.getElementById('quotationNumber')?.value || 'Q-FM200-2024-001';
            const quoteDate = document.getElementById('quotationDate')?.value || new Date().toISOString().split('T')[0];
            const clientName = document.getElementById('clientName')?.value || 'Client Name';
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>FM-200 Quotation - ${quoteNumber}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 40px;
                            color: #333;
                            line-height: 1.6;
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 40px;
                            border-bottom: 3px solid #ff4c4c;
                            padding-bottom: 20px;
                        }
                        .header h1 {
                            color: #ff4c4c;
                            margin: 0;
                        }
                        .info-section {
                            margin-bottom: 30px;
                            display: flex;
                            justify-content: space-between;
                        }
                        .sender-info, .client-info {
                            width: 48%;
                        }
                        .client-info {
                            border-left: 3px solid #0099e5;
                            padding-left: 15px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 20px 0;
                        }
                        th {
                            background: #ff4c4c;
                            color: white;
                            padding: 12px;
                            text-align: left;
                        }
                        td {
                            padding: 10px;
                            border: 1px solid #ddd;
                        }
                        .total-row {
                            background: #34bf49;
                            color: white;
                            font-weight: bold;
                        }
                        .terms {
                            margin-top: 40px;
                            padding: 20px;
                            border: 1px solid #ddd;
                            border-radius: 5px;
                        }
                        .signature {
                            margin-top: 60px;
                            text-align: right;
                            font-style: italic;
                        }
                        @media print {
                            body { margin: 20px; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>FM-200 FIRE SUPPRESSION SYSTEM QUOTATION</h1>
                        <h2>Quotation Number: ${quoteNumber}</h2>
                        <p>Date: ${quoteDate}</p>
                    </div>
                    
                    ${previewElement.innerHTML}
                    
                    <div class="no-print" style="margin-top: 40px; text-align: center;">
                        <button onclick="window.print()" style="padding: 12px 30px; background: #ff4c4c; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-right: 15px;">
                            <i class="fas fa-print"></i> Print Quotation
                        </button>
                        <button onclick="window.close()" style="padding: 12px 30px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
                            Close Window
                        </button>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            
            // Auto-print after a short delay
            setTimeout(() => {
                printWindow.print();
            }, 1000);
            
            this.showNotification('Quotation generated. Printing preview...', 'success');
            
        } catch (error) {
            console.error('Error generating quotation PDF:', error);
            this.showNotification('Error generating quotation. Please try again.', 'error');
        }
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    round(value, decimals) {
        if (isNaN(value) || value === null || value === undefined) return 0;
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    formatCurrency(amount, currency = 'INR') {
        try {
            let symbol = '₹';
            let formattedAmount = amount.toFixed(2);
            
            formattedAmount = formattedAmount.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return `${symbol} ${formattedAmount}`;
        } catch (error) {
            return `₹ ${amount.toFixed(2)}`;
        }
    }

    setElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    setFormValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = value;
        }
    }

    generateProjectId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `FM200-${timestamp}-${random}`.toUpperCase();
    }

    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
            max-width: 400px;
        `;
        
        switch(type) {
            case 'success':
                notification.style.backgroundColor = '#34bf49';
                break;
            case 'error':
                notification.style.backgroundColor = '#ff4444';
                break;
            case 'warning':
                notification.style.backgroundColor = '#ff9800';
                break;
            default:
                notification.style.backgroundColor = '#0099e5';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    initThemeToggle() {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            if (this.userPrefs.theme === 'dark') {
                document.body.classList.add('dark-mode');
                toggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
            } else {
                document.body.classList.remove('dark-mode');
                toggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
            }
            
            toggleBtn.addEventListener('click', () => {
                if (document.body.classList.contains('dark-mode')) {
                    document.body.classList.remove('dark-mode');
                    toggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
                    this.userPrefs.theme = 'light';
                } else {
                    document.body.classList.add('dark-mode');
                    toggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
                    this.userPrefs.theme = 'dark';
                }
                this.savePreferences();
            });
        }
    }

    initExpertMode() {
        const expertToggle = document.getElementById('expertModeToggle');
        if (expertToggle) {
            expertToggle.checked = this.userPrefs.expertMode;
            
            const expertPanel = document.getElementById('expertModePanel');
            if (expertPanel) {
                expertPanel.style.display = this.userPrefs.expertMode ? 'block' : 'none';
            }
        }
    }

    toggleExpertMode() {
        const expertToggle = document.getElementById('expertModeToggle');
        const expertPanel = document.getElementById('expertModePanel');
        
        if (expertToggle && expertPanel) {
            this.userPrefs.expertMode = expertToggle.checked;
            expertPanel.style.display = expertToggle.checked ? 'block' : 'none';
            this.savePreferences();
            
            const message = expertToggle.checked ? 
                'Expert Mode Activated. Advanced parameters are now visible.' : 
                'Expert Mode Deactivated.';
            this.showNotification(message, 'info');
        }
    }

    updateVisitorCounter() {
        const counterElement = document.getElementById('visitorCount');
        if (!counterElement) return;
        
        try {
            let visitorCount = localStorage.getItem(APP_CONFIG.storageKeys.VISITOR_COUNT);
            
            if (!visitorCount) {
                // Start with a realistic number
                visitorCount = Math.floor(Math.random() * 500) + 1500;
                localStorage.setItem(APP_CONFIG.storageKeys.VISITOR_COUNT, visitorCount.toString());
            } else {
                visitorCount = parseInt(visitorCount);
                visitorCount += 1;
                localStorage.setItem(APP_CONFIG.storageKeys.VISITOR_COUNT, visitorCount.toString());
            }
            
            counterElement.textContent = visitorCount.toLocaleString();
        } catch (e) {
            console.warn('Could not update visitor counter:', e);
            counterElement.textContent = '1,500+';
        }
    }
}

// ============================================================================
// GLOBAL INITIALIZATION
// ============================================================================

// Add CSS for notifications and animations
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes modalSlideIn {
        from { opacity: 0; transform: translateY(-50px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .dark-mode {
        background: #1a1a1a !important;
        color: #ffffff !important;
    }
    .dark-mode .panel {
        background: #2d2d2d !important;
        color: #ffffff !important;
    }
    .dark-mode input,
    .dark-mode select,
    .dark-mode textarea {
        background: #444 !important;
        color: #ffffff !important;
        border-color: #555 !important;
    }
`;
document.head.appendChild(notificationStyle);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('FM-200 Calculator v5.2 - Initializing...');
    
    try {
        // Initialize calculator
        window.fm200Calculator = new FM200Calculator();
        console.log('FM-200 Calculator v5.2 - Ready!');
    } catch (error) {
        console.error('Failed to initialize FM-200 Calculator:', error);
        
        // Show error to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff4444;
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        `;
        errorDiv.innerHTML = `
            <h3 style="margin-top: 0;">Application Error</h3>
            <p>${error.message}</p>
            <button onclick="location.reload()" style="margin-top: 20px; padding: 12px 30px; background: white; color: #ff4444; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                Reload Application
            </button>
        `;
        document.body.appendChild(errorDiv);
    }
});

// Handle unhandled errors
window.addEventListener('error', function(e) {
    console.error('Unhandled error:', e.message);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled Promise Rejection:', event.reason);
});
