// FM-200 Calculator - Complete Application Logic
// Version 4.0 - Professional Edition with Print Functionality
// UPDATED: Added fallback data to handle missing data.json
// FIXED: Typo in method call - initExpertMode not imfExpertMode

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const APP_CONFIG = {
    version: '4.0',
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
        QUOTATION_DATA: 'fm200_quotation_data'
    }
};

// ============================================================================
// DATA LOADING & CONSTANTS
// ============================================================================

let EXTERNAL_DATA = {};

// DEFAULT DATA - Used if data.json is missing
const DEFAULT_DATA = {
    exchangeRates: {
        "USD": 1.00,
        "EUR": 0.92,
        "INR": 83.50,
        "AED": 3.67,
        "GBP": 0.79,
        "CAD": 1.36,
        "AUD": 1.52
    },
    costMultipliers: {
        "agentCostPerKg": 48.50,
        "cylinderCost": 1250.00,
        "nozzleCost": 175.00,
        "pipingCostPerMeter": 45.00,
        "fittingsCost": 320.00,
        "valveAssembly": 450.00,
        "mountingHardware": 85.00,
        "detectionPanel": 2200.00,
        "smokeDetector": 95.00,
        "heatDetector": 85.00,
        "manualCallPoint": 65.00,
        "hooterStrobe": 75.00,
        "warningSigns": 45.00,
        "installationLaborPerHour": 85.00,
        "engineeringDesign": 2500.00,
        "commissioningTesting": 1800.00,
        "documentation": 450.00,
        "installationFactor": 1.28,
        "engineeringFactor": 1.15,
        "contingencyFactor": 1.10
    }
};

let COST_MULTIPLIERS = DEFAULT_DATA.costMultipliers;
let EXCHANGE_RATES = DEFAULT_DATA.exchangeRates;

/**
 * Loads configuration data from the external data.json file with fallback to defaults.
 */
function loadExternalData() {
    console.log('Loading external configuration from data.json...');
    
    // Try to load data.json, but use defaults if it fails
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'data.json', false);
        xhr.send(null);
        
        if (xhr.status === 200) {
            EXTERNAL_DATA = JSON.parse(xhr.responseText);
            COST_MULTIPLIERS = EXTERNAL_DATA.costMultipliers || DEFAULT_DATA.costMultipliers;
            EXCHANGE_RATES = EXTERNAL_DATA.exchangeRates || DEFAULT_DATA.exchangeRates;
            console.log('External data loaded successfully.');
        } else {
            console.warn('Failed to load data.json. Status:', xhr.status, 'Using default values.');
            COST_MULTIPLIERS = DEFAULT_DATA.costMultipliers;
            EXCHANGE_RATES = DEFAULT_DATA.exchangeRates;
        }
    } catch (e) {
        console.warn('Error loading data.json:', e.message, 'Using default values.');
        COST_MULTIPLIERS = DEFAULT_DATA.costMultipliers;
        EXCHANGE_RATES = DEFAULT_DATA.exchangeRates;
    }
}

// OEM Suppliers Database
const OEM_SUPPLIERS = [
    {
        name: "Kidde-Fenwal",
        website: "https://www.kiddefenwal.com",
        description: "Leading manufacturer of fire suppression systems",
        products: ["FM-200", "Detection Systems", "Control Panels"],
        regions: ["Global"],
        contact: "sales@kiddefenwal.com"
    },
    {
        name: "Fike Corporation",
        website: "https://www.fike.com",
        description: "Specialists in clean agent fire protection",
        products: ["FM-200", "Novec 1230", "Detection Systems"],
        regions: ["Global"],
        contact: "info@fike.com"
    },
    {
        name: "Ansul (Tyco)",
        website: "https://www.ansul.com",
        description: "Tyco Fire Protection Products",
        products: ["FM-200", "Sapphire", "Inergen"],
        regions: ["Global"],
        contact: "ansul.support@tyco.com"
    },
    {
        name: "Rotarex Firetec",
        website: "https://www.rotarexfiretec.com",
        description: "Cylinder and valve specialists",
        products: ["Cylinders", "Valves", "Manifolds"],
        regions: ["Europe", "Middle East", "Asia"],
        contact: "firetec@rotarex.com"
    },
    {
        name: "3M",
        website: "https://www.3m.com",
        description: "Novec 1230 Fire Protection Fluid",
        products: ["Novec 1230", "Detection Systems"],
        regions: ["Global"],
        contact: "3mfiresuppression@3m.com"
    },
    {
        name: "Chemours",
        website: "https://www.chemours.com",
        description: "FM-200 Manufacturer",
        products: ["FM-200 Agent"],
        regions: ["Global"],
        contact: "fm200@chemours.com"
    }
];

// ============================================================================
// CORE CALCULATION FUNCTIONS (NFPA 2001 COMPLIANT)
// ============================================================================

class FM200Calculator {
    constructor() {
        this.currentData = null;
        this.costChart = null;
        this.userPrefs = this.loadPreferences();
        
        // Load external data first
        loadExternalData();
        
        this.initializeApp();
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    initializeApp() {
        // Hide loading screen
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }
        }, 500);

        // Error handling
        window.onerror = (msg, url, line, col, error) => {
            console.error(`Application Error: ${msg} at ${url}:${line}:${col}`);
            this.showNotification(`Application Error: ${msg}`, 'error');
            return false;
        };

        const path = window.location.pathname;
        
        if (path.includes('index.html') || path === '/') {
            this.initCalculatorPage();
        } else if (path.includes('results.html')) {
            this.initResultsPage();
        } else if (path.includes('quotation.html')) {
            this.initQuotationPage();
        }

        this.initThemeToggle();
        this.initExpertMode();  // FIXED: Was imfExpertMode
        this.initGoogleTranslate();
        this.initAffiliateLinks();
        this.initBuyMeCoffee();
        
        // Initialize visitor counter
        this.updateVisitorCounter();
    }

    // ============================================================================
    // CALCULATOR PAGE FUNCTIONS
    // ============================================================================

    initCalculatorPage() {
        console.log('Initializing Calculator Page');
        
        const form = document.getElementById('fm200Form');
        const resetBtn = document.getElementById('resetBtn');
        const saveBtn = document.getElementById('saveBtn');
        const expertToggle = document.getElementById('expertModeToggle');

        // Set default values
        this.setDefaultValues();

        // Form submission handler
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission();
            });
        }

        // Reset button handler
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset all inputs to default values?')) {
                    this.resetForm();
                }
            });
        }

        // Save button handler
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.openSaveModal();
            });
        }

        // Expert mode toggle
        if (expertToggle) {
            expertToggle.addEventListener('change', () => this.toggleExpertMode());
            const expertPanel = document.getElementById('expertModePanel');
            if (expertPanel) {
                expertPanel.style.display = this.userPrefs.expertMode ? 'block' : 'none';
            }
        }

        // Real-time preview updates
        ['room-length', 'room-width', 'room-height', 'room-temperature', 'hazard-class'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.updateQuickPreview());
            }
        });

        // Initialize quick preview
        this.updateQuickPreview();
        
        // Initialize accordion
        this.initAccordion();

        console.log('Calculator Page Initialized Successfully');
    }

    initAccordion() {
        const accordionHeaders = document.querySelectorAll('.accordion-header');
        accordionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const item = header.parentElement;
                const content = header.nextElementSibling;
                
                // Toggle active class
                item.classList.toggle('active');
                
                // Toggle content visibility
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

    updateVisitorCounter() {
        const counterElement = document.getElementById('visitorCount');
        if (!counterElement) return;
        
        try {
            let visitorCount = localStorage.getItem('fm200VisitorCount');
            
            if (!visitorCount) {
                visitorCount = Math.floor(Math.random() * 500) + 1500;
            } else {
                visitorCount = parseInt(visitorCount);
            }
            
            visitorCount += 1;
            localStorage.setItem('fm200VisitorCount', visitorCount.toString());
            counterElement.textContent = visitorCount.toLocaleString();
        } catch (e) {
            console.warn('Could not update visitor counter:', e);
            counterElement.textContent = '1,500+';
        }
    }

    setDefaultValues() {
        const today = new Date();
        const projectName = document.getElementById('project-name');
        if (projectName && !projectName.value) {
            projectName.value = `FM-200 Project ${today.toLocaleDateString()}`;
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
            
            // Close when clicking outside
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

    updateQuickPreview() {
        try {
            const length = parseFloat(document.getElementById('room-length')?.value) || 10;
            const width = parseFloat(document.getElementById('room-width')?.value) || 8;
            const height = parseFloat(document.getElementById('room-height')?.value) || 3;
            const temp = parseFloat(document.getElementById('room-temperature')?.value) || 20;
            const concentration = parseFloat(document.getElementById('hazard-class')?.value) || 7.5;

            // Calculate volume
            const volume = length * width * height;
            
            // Calculate specific volume (simplified formula)
            const specificVolume = APP_CONFIG.SPECIFIC_VAPOR_BASE + (APP_CONFIG.SPECIFIC_VAPOR_TEMP_FACTOR * temp);
            
            // Calculate agent mass (simplified for preview)
            const agentMass = (volume / specificVolume) * (concentration / (100 - concentration));

            // Update display
            this.setElementText('displayVolume', `${this.round(volume, 2)} m³`);
            this.setElementText('displaySpecificVolume', `${this.round(specificVolume, 4)} m³/kg`);
            this.setElementText('displayConcentration', `${concentration}%`);
            this.setElementText('displayAgentMass', `${this.round(agentMass, 2)} kg`);
        } catch (error) {
            console.error('Error updating preview:', error);
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

    // ============================================================================
    // CORE NFPA 2001 CALCULATION
    // ============================================================================

    handleFormSubmission() {
        try {
            // 1. Collect and validate form data
            const formData = this.collectFormData();
            if (!formData) return;
            
            // 2. Perform NFPA 2001 calculation
            const calculationResults = this.performNFPA2001Calculation(formData);
            
            // 3. Prepare complete data object
            const completeData = {
                formData: formData,
                calculationResults: calculationResults,
                metadata: {
                    timestamp: new Date().toISOString(),
                    projectId: this.generateProjectId(),
                    version: APP_CONFIG.version,
                    calculatedBy: APP_CONFIG.appName
                }
            };

            // 4. Store in sessionStorage for cross-page access
            sessionStorage.setItem(APP_CONFIG.storageKeys.BUDGET_DATA, JSON.stringify(completeData));

            // 5. Show success and redirect
            this.showNotification('Calculation successful! Redirecting to results...', 'success');
            
            setTimeout(() => {
                window.location.href = 'results.html';
            }, 1500);

        } catch (error) {
            console.error('Calculation Error:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

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
        const nozzleCoverage = 50;
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
            formulaUsed: 'W = (V/S) × (C/(100-C))',
            units: APP_CONFIG.units
        };
    }

    // ============================================================================
    // RESULTS PAGE FUNCTIONS
    // ============================================================================

    initResultsPage() {
        console.log('Initializing Results Page');
        
        this.loadCalculationData();
        this.renderResultsPage();
        this.initResultsEventListeners();

        console.log('Results Page Initialized Successfully');
    }

    loadCalculationData() {
        try {
            const dataJson = sessionStorage.getItem(APP_CONFIG.storageKeys.BUDGET_DATA);
            if (dataJson) {
                this.currentData = JSON.parse(dataJson);
                console.log('Calculation data loaded from session storage.');
                
                // Calculate costs with default currency (USD)
                const costResults = this.calculateSystemCosts(this.currentData.calculationResults, 'USD');
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
        
        // Project Information
        this.setElementText('displayProjectName', formData.projectName);
        this.setElementText('agentMassResult', `${calculationResults.agentWeight} kg`);
        this.setElementText('cylinderCountResult', `${calculationResults.cylinderCount} x ${calculationResults.cylinderSize} kg cylinders`);

        // Room details
        this.setElementText('roomVolumeResult', `${calculationResults.netVolume} m³`);
        this.setElementText('designTempResult', `${calculationResults.designTemperature} °C`);
        this.setElementText('altitudeResult', `${calculationResults.altitude} m`);
        this.setElementText('concentrationResult', `${calculationResults.concentration}%`);
        this.setElementText('specificVolumeResult', `${calculationResults.specificVaporVolume} m³/kg`);
        this.setElementText('safetyFactorResult', '1.00');
        this.setElementText('nozzleCoverageResult', `${calculationResults.floorArea} m²`);
        this.setElementText('nozzleCountResult', calculationResults.nozzleCount);
    }

    calculateSystemCosts(calculationResults, currency) {
        const m = COST_MULTIPLIERS;
        
        // 1. Agent Cost
        const agentCost = calculationResults.agentWeight * m.agentCostPerKg;
        
        // 2. Cylinder System
        const cylinderCost = calculationResults.cylinderCount * m.cylinderCost;
        const valveCost = calculationResults.cylinderCount * m.valveAssembly;
        const mountingCost = calculationResults.cylinderCount * m.mountingHardware;
        
        // 3. Distribution System
        const nozzleCost = calculationResults.nozzleCount * m.nozzleCost;
        const pipingCost = calculationResults.pipingLength * m.pipingCostPerMeter;
        const fittingsCost = m.fittingsCost;
        
        // 4. Detection & Control
        const detectionCost = m.detectionPanel;
        const smokeDetectors = Math.max(2, Math.ceil(calculationResults.floorArea / 100)) * m.smokeDetector;
        const heatDetectors = 2 * m.heatDetector;
        const manualCallPoints = 2 * m.manualCallPoint;
        const hooterStrobes = 4 * m.hooterStrobe;
        const warningSigns = m.warningSigns;
        
        // 5. Equipment Subtotal
        const equipmentSubtotal = agentCost + cylinderCost + valveCost + mountingCost +
                                 nozzleCost + pipingCost + fittingsCost +
                                 detectionCost + smokeDetectors + heatDetectors +
                                 manualCallPoints + hooterStrobes + warningSigns;

        // 6. Installation Labor
        const installationHours = 40 + (calculationResults.cylinderCount * 4) + 
                                 (calculationResults.nozzleCount * 2) + 
                                 (calculationResults.pipingLength * 0.5);
        const installationLabor = installationHours * m.installationLaborPerHour;

        const laborSubtotal = installationLabor + m.engineeringDesign + m.commissioningTesting + m.documentation;
        
        // 7. Apply Factors
        const installationCost = equipmentSubtotal * (m.installationFactor - 1);
        const engineeringCost = equipmentSubtotal * (m.engineeringFactor - 1);
        const contingency = equipmentSubtotal * (m.contingencyFactor - 1);

        const totalEquipmentAndLabor = equipmentSubtotal + installationLabor + m.engineeringDesign + m.commissioningTesting + m.documentation;
        const totalUSD = totalEquipmentAndLabor + installationCost + engineeringCost + contingency;

        // 8. Convert to selected currency
        const exchangeRate = EXCHANGE_RATES[currency] || 1;
        const totalConverted = totalUSD * exchangeRate;
        
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
            
            totalUSD: this.round(totalUSD, 2),
            totalConverted: this.round(totalConverted, 2),
            exchangeRate: this.round(exchangeRate, 4),
            currency: currency
        };
    }

    initResultsEventListeners() {
        const printBtn = document.getElementById('printResults');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                this.printResultsAsPDF();
            });
        }

        const exportBtn = document.getElementById('exportBOQ');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportBOQToCSV();
            });
        }

        const currencySelect = document.getElementById('currencySelect');
        if (currencySelect) {
            currencySelect.addEventListener('change', (e) => {
                this.updateResultsCurrency(e.target.value);
            });
        }
        
        // Update exchange rate display
        this.setElementText('exchangeRateDisplay', '1.0000 USD');
    }

    // ============================================================================
    // PRINT/PDF FUNCTIONALITY
    // ============================================================================

    printResultsAsPDF() {
        if (!this.currentData) {
            this.showNotification('No calculation data available for printing', 'warning');
            return;
        }

        const { formData, calculationResults, costResults } = this.currentData;
        const currency = costResults.currency;
        const today = new Date().toLocaleDateString();
        
        // Create printable content
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>FM-200 Calculation Results - ${formData.projectName}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
                    .print-header { text-align: center; border-bottom: 2px solid #ff4c4c; padding-bottom: 20px; margin-bottom: 30px; }
                    .print-header h1 { color: #ff4c4c; margin-bottom: 5px; font-size: 24px; }
                    .print-header h2 { color: #0099e5; margin-top: 5px; font-size: 18px; }
                    .print-section { margin-bottom: 20px; break-inside: avoid; }
                    .print-section h3 { color: #000; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; font-size: 14px; }
                    .print-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
                    .print-item { margin-bottom: 8px; padding: 5px; }
                    .print-item label { font-weight: bold; color: #666; display: block; margin-bottom: 2px; }
                    .print-item span { color: #000; }
                    .print-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
                    .print-table th, .print-table td { border: 1px solid #ccc; padding: 6px; text-align: left; }
                    .print-table th { background-color: #f5f5f5; font-weight: bold; }
                    .total-row { background-color: #e8f5e9; font-weight: bold; }
                    .print-footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 10px; color: #666; }
                    @page { margin: 20mm; }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none !important; }
                    }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <h1>FM-200 CLEAN AGENT SYSTEM CALCULATION RESULTS</h1>
                    <h2>${formData.projectName}</h2>
                    <p>Calculated on: ${today} | Location: ${formData.clientLocation} | Currency: ${currency}</p>
                </div>
                
                <div class="print-section">
                    <h3>Project Information</h3>
                    <div class="print-grid">
                        <div class="print-item">
                            <label>Project Name:</label>
                            <span>${formData.projectName}</span>
                        </div>
                        <div class="print-item">
                            <label>Location:</label>
                            <span>${formData.clientLocation}</span>
                        </div>
                        <div class="print-item">
                            <label>Calculation Date:</label>
                            <span>${today}</span>
                        </div>
                        <div class="print-item">
                            <label>Report ID:</label>
                            <span>${this.generateProjectId()}</span>
                        </div>
                    </div>
                </div>
                
                <div class="print-section">
                    <h3>Room Specifications</h3>
                    <div class="print-grid">
                        <div class="print-item">
                            <label>Room Dimensions:</label>
                            <span>${formData.roomLength} m × ${formData.roomWidth} m × ${formData.roomHeight} m</span>
                        </div>
                        <div class="print-item">
                            <label>Room Volume:</label>
                            <span>${calculationResults.netVolume} m³</span>
                        </div>
                        <div class="print-item">
                            <label>Floor Area:</label>
                            <span>${calculationResults.floorArea} m²</span>
                        </div>
                        <div class="print-item">
                            <label>Design Temperature:</label>
                            <span>${calculationResults.designTemperature} °C</span>
                        </div>
                        <div class="print-item">
                            <label>Altitude:</label>
                            <span>${calculationResults.altitude} m</span>
                        </div>
                        <div class="print-item">
                            <label>Required Concentration:</label>
                            <span>${calculationResults.concentration}%</span>
                        </div>
                    </div>
                </div>
                
                <div class="print-section">
                    <h3>System Requirements</h3>
                    <div class="print-grid">
                        <div class="print-item">
                            <label>FM-200 Agent Required:</label>
                            <span>${calculationResults.agentWeight} kg</span>
                        </div>
                        <div class="print-item">
                            <label>Cylinders Required:</label>
                            <span>${calculationResults.cylinderCount} × ${calculationResults.cylinderSize} kg cylinders</span>
                        </div>
                        <div class="print-item">
                            <label>Nozzles Required:</label>
                            <span>${calculationResults.nozzleCount} pcs</span>
                        </div>
                        <div class="print-item">
                            <label>Piping Length:</label>
                            <span>${calculationResults.pipingLength} m</span>
                        </div>
                        <div class="print-item">
                            <label>Specific Vapor Volume:</label>
                            <span>${calculationResults.specificVaporVolume} m³/kg</span>
                        </div>
                        <div class="print-item">
                            <label>Calculation Method:</label>
                            <span>${calculationResults.calculationMethod}</span>
                        </div>
                    </div>
                </div>
                
                <div class="print-section">
                    <h3>Cost Estimate (${currency})</h3>
                    <table class="print-table">
                        <tr>
                            <th>Item</th>
                            <th>Amount</th>
                        </tr>
                        <tr>
                            <td>FM-200 Agent Cost:</td>
                            <td>${this.formatCurrency(costResults.agentCost * costResults.exchangeRate, currency)}</td>
                        </tr>
                        <tr>
                            <td>Cylinder System Cost:</td>
                            <td>${this.formatCurrency((costResults.cylinderCost + costResults.valveCost + costResults.mountingCost) * costResults.exchangeRate, currency)}</td>
                        </tr>
                        <tr>
                            <td>Distribution System Cost:</td>
                            <td>${this.formatCurrency((costResults.nozzleCost + costResults.pipingCost + costResults.fittingsCost) * costResults.exchangeRate, currency)}</td>
                        </tr>
                        <tr>
                            <td>Detection & Control Cost:</td>
                            <td>${this.formatCurrency((costResults.detectionCost + costResults.smokeDetectors + costResults.heatDetectors + costResults.manualCallPoints + costResults.hooterStrobes + costResults.warningSigns) * costResults.exchangeRate, currency)}</td>
                        </tr>
                        <tr>
                            <td>Installation Labor:</td>
                            <td>${this.formatCurrency(costResults.installationLabor * costResults.exchangeRate, currency)}</td>
                        </tr>
                        <tr>
                            <td>Engineering & Design:</td>
                            <td>${this.formatCurrency(costResults.engineeringDesign * costResults.exchangeRate, currency)}</td>
                        </tr>
                        <tr>
                            <td>Installation Factor (${(COST_MULTIPLIERS.installationFactor * 100).toFixed(0)}%):</td>
                            <td>${this.formatCurrency(costResults.installationFactorCost * costResults.exchangeRate, currency)}</td>
                        </tr>
                        <tr>
                            <td>Engineering Factor (${(COST_MULTIPLIERS.engineeringFactor * 100).toFixed(0)}%):</td>
                            <td>${this.formatCurrency(costResults.engineeringFactorCost * costResults.exchangeRate, currency)}</td>
                        </tr>
                        <tr>
                            <td>Contingency (${(COST_MULTIPLIERS.contingencyFactor * 100).toFixed(0)}%):</td>
                            <td>${this.formatCurrency(costResults.contingency * costResults.exchangeRate, currency)}</td>
                        </tr>
                        <tr class="total-row">
                            <td><strong>TOTAL ESTIMATED COST:</strong></td>
                            <td><strong>${this.formatCurrency(costResults.totalConverted, currency)}</strong></td>
                        </tr>
                    </table>
                </div>
                
                <div class="print-footer">
                    <p><strong>Disclaimer:</strong> This calculation is for preliminary estimation only. All calculations should be verified by certified fire protection engineers.</p>
                    <p>Generated by FM-200 Calculator v${APP_CONFIG.version} | ${APP_CONFIG.developer}</p>
                    <p>For professional verification, contact: ${APP_CONFIG.contactEmail} | ${APP_CONFIG.contactPhone}</p>
                    <p>Website: https://fm-200-room-flooding-system-calcula.vercel.app/</p>
                </div>
            </body>
            </html>
        `;
        
        // Open print window
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        
        // Wait for content to load then print
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }

    updateResultsCurrency(newCurrency) {
        if (!this.currentData) return;
        
        const exchangeRate = EXCHANGE_RATES[newCurrency] || 1;
        const costResults = this.calculateSystemCosts(this.currentData.calculationResults, newCurrency);
        this.currentData.costResults = costResults;
        
        // Update displayed exchange rate
        this.setElementText('exchangeRateDisplay', `${this.round(exchangeRate, 4)} ${newCurrency}`);
        
        // Update BOQ table
        this.renderBOQTable();
    }

    renderBOQTable() {
        if (!this.currentData) return;
        
        const { costResults } = this.currentData;
        const currency = costResults.currency;
        const exchangeRate = costResults.exchangeRate;
        const boqBody = document.querySelector('#boqTable tbody');
        
        if (!boqBody) return;
        
        // Clear existing content
        boqBody.innerHTML = '';
        
        // Define BOQ items
        const boqItems = [
            { 
                item: 'FM-200 Agent', 
                qty: this.currentData.calculationResults.agentWeight, 
                unit: 'kg', 
                unitPrice: costResults.agentCost / this.currentData.calculationResults.agentWeight 
            },
            { 
                item: 'Storage Cylinders', 
                qty: this.currentData.calculationResults.cylinderCount, 
                unit: 'pcs', 
                unitPrice: costResults.cylinderCost / this.currentData.calculationResults.cylinderCount 
            },
            { 
                item: 'Nozzles', 
                qty: this.currentData.calculationResults.nozzleCount, 
                unit: 'pcs', 
                unitPrice: costResults.nozzleCost / this.currentData.calculationResults.nozzleCount 
            },
            { 
                item: 'Piping', 
                qty: this.currentData.calculationResults.pipingLength, 
                unit: 'm', 
                unitPrice: costResults.pipingCost / this.currentData.calculationResults.pipingLength 
            },
            { 
                item: 'Detection Panel', 
                qty: 1, 
                unit: 'pc', 
                unitPrice: costResults.detectionCost 
            },
            { 
                item: 'Installation Labor', 
                qty: 1, 
                unit: 'lot', 
                unitPrice: costResults.installationLabor 
            },
            { 
                item: 'Engineering Design', 
                qty: 1, 
                unit: 'lot', 
                unitPrice: costResults.engineeringDesign 
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
                <td>${this.formatCurrency(item.unitPrice * exchangeRate, currency)}</td>
                <td>${this.formatCurrency(total * exchangeRate, currency)}</td>
            `;
            boqBody.appendChild(row);
        });
        
        // Update totals
        const factorTotal = costResults.installationFactorCost + costResults.engineeringFactorCost + costResults.contingency;
        const grandTotal = subtotal + factorTotal;
        
        this.setElementText('subtotalCost', this.formatCurrency(subtotal * exchangeRate, currency));
        this.setElementText('factorCost', this.formatCurrency(factorTotal * exchangeRate, currency));
        this.setElementText('grandTotalCost', this.formatCurrency(grandTotal * exchangeRate, currency));
        
        // Update factor percentages
        const installPercent = (COST_MULTIPLIERS.installationFactor - 1) * 100;
        const engineerPercent = (COST_MULTIPLIERS.engineeringFactor - 1) * 100;
        this.setElementText('installFactor', `${installPercent.toFixed(0)}%`);
        this.setElementText('engineerFactor', `${engineerPercent.toFixed(0)}%`);
    }

    exportBOQToCSV() {
        if (!this.currentData) {
            this.showNotification('No data available for export', 'warning');
            return;
        }

        const { formData, calculationResults, costResults } = this.currentData;
        const currency = costResults.currency;
        const exchangeRate = costResults.exchangeRate;
        const today = new Date().toISOString().split('T')[0];

        let csv = `FM-200 SYSTEM BILL OF QUANTITIES\r\n`;
        csv += `Project: ${formData.projectName}\r\n`;
        csv += `Location: ${formData.clientLocation}\r\n`;
        csv += `Date: ${today}\r\n`;
        csv += `Currency: ${currency}\r\n\r\n`;

        csv += 'ITEM,QUANTITY,UNIT,UNIT PRICE,TOTAL\r\n';

        const exportItems = [
            ['FM-200 Agent', calculationResults.agentWeight, 'kg', costResults.agentCost / calculationResults.agentWeight, costResults.agentCost],
            ['Storage Cylinders', calculationResults.cylinderCount, 'pcs', costResults.cylinderCost / calculationResults.cylinderCount, costResults.cylinderCost],
            ['Nozzles', calculationResults.nozzleCount, 'pcs', costResults.nozzleCost / calculationResults.nozzleCount, costResults.nozzleCost],
            ['Piping', calculationResults.pipingLength, 'm', costResults.pipingCost / calculationResults.pipingLength, costResults.pipingCost],
            ['Detection Panel', 1, 'pc', costResults.detectionCost, costResults.detectionCost],
            ['Installation Labor', 1, 'lot', costResults.installationLabor, costResults.installationLabor],
            ['Engineering Design', 1, 'lot', costResults.engineeringDesign, costResults.engineeringDesign]
        ];

        exportItems.forEach(item => {
            const totalConverted = item[4] * exchangeRate;
            csv += `"${item[0]}",${this.round(item[1], 2)},"${item[2]}",${this.round(item[3] * exchangeRate, 2)},${this.round(totalConverted, 2)}\r\n`;
        });

        csv += `\r\nInstallation Factor (${(COST_MULTIPLIERS.installationFactor * 100).toFixed(0)}%),,,${this.round(costResults.installationFactorCost * exchangeRate, 2)}\r\n`;
        csv += `Engineering Factor (${(COST_MULTIPLIERS.engineeringFactor * 100).toFixed(0)}%),,,${this.round(costResults.engineeringFactorCost * exchangeRate, 2)}\r\n`;
        csv += `Contingency (${(COST_MULTIPLIERS.contingencyFactor * 100).toFixed(0)}%),,,${this.round(costResults.contingency * exchangeRate, 2)}\r\n`;
        csv += `GRAND TOTAL,,,${this.round(costResults.totalConverted, 2)}`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const fileName = `FM200_BOQ_${formData.projectName.replace(/\s+/g, '_')}_${today}.csv`;
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        
        this.showNotification('BOQ CSV file generated successfully!', 'success');
    }

    // ============================================================================
    // QUOTATION PAGE FUNCTIONS
    // ============================================================================

    initQuotationPage() {
        console.log('Initializing Quotation Page');
        
        this.setQuotationDates();
        this.loadCalculationData();
        
        const autoFillBtn = document.getElementById('autoFill');
        if (autoFillBtn) {
            autoFillBtn.addEventListener('click', () => {
                this.autoFillQuotationForm();
            });
        }

        const previewBtn = document.getElementById('previewQuotation');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                this.previewQuotation();
            });
        }
        
        // Initialize form with current data if available
        if (this.currentData) {
            this.autoFillQuotationForm();
        }

        console.log('Quotation Page Initialized Successfully');
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
    }

    autoFillQuotationForm() {
        if (!this.currentData) {
            this.showNotification('No calculation data available for auto-fill', 'warning');
            return;
        }
        
        const { formData } = this.currentData;

        // Fill client information
        const clientName = document.getElementById('clientName');
        if (clientName) clientName.value = formData.projectName;
        
        const clientAddress = document.getElementById('clientAddress');
        if (clientAddress) clientAddress.value = formData.clientLocation;

        this.showNotification('Quotation form auto-filled with project data', 'success');
    }

    previewQuotation() {
        this.showNotification('Generating quotation preview...', 'info');
        
        if (!this.currentData) {
            this.showNotification('No calculation data available', 'error');
            return;
        }

        // Get form values
        const quotationNumber = document.getElementById('quotationNumber')?.value || 'Q-FM200-2024-001';
        const quotationDate = document.getElementById('quotationDate')?.value || new Date().toISOString().split('T')[0];
        const clientName = document.getElementById('clientName')?.value || 'Client Name';
        
        // Create preview content
        const previewContent = this.generateQuotationPreview(quotationNumber, quotationDate, clientName);
        
        // Open preview in new window
        const previewWindow = window.open('', '_blank');
        previewWindow.document.write(previewContent);
        previewWindow.document.close();
    }

    generateQuotationPreview(quotationNumber, quotationDate, clientName) {
        const { formData, calculationResults } = this.currentData;
        const today = new Date().toLocaleDateString();
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>FM-200 Quotation - ${formData.projectName}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    .quotation-container { max-width: 800px; margin: 0 auto; border: 2px solid #ff4c4c; padding: 40px; }
                    .header { text-align: center; margin-bottom: 40px; }
                    .header h1 { color: #ff4c4c; margin-bottom: 10px; }
                    .header h2 { color: #0099e5; }
                    .details { margin-bottom: 30px; }
                    .details table { width: 100%; border-collapse: collapse; }
                    .details td { padding: 8px; border-bottom: 1px solid #eee; }
                    .system-requirements { margin: 30px 0; }
                    .system-requirements h3 { color: #34bf49; border-bottom: 2px solid #34bf49; padding-bottom: 10px; }
                    .requirement-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px; }
                    .requirement-item { background: #f8f9fa; padding: 15px; border-radius: 5px; }
                    .requirement-item label { font-weight: bold; color: #666; display: block; margin-bottom: 5px; }
                    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="quotation-container">
                    <div class="header">
                        <h1>FM-200 CLEAN AGENT SYSTEM QUOTATION</h1>
                        <h2>${formData.projectName}</h2>
                        <p>Quotation: ${quotationNumber} | Date: ${quotationDate}</p>
                    </div>
                    
                    <div class="details">
                        <h3>Project Details</h3>
                        <table>
                            <tr>
                                <td><strong>Client:</strong></td>
                                <td>${clientName}</td>
                            </tr>
                            <tr>
                                <td><strong>Location:</strong></td>
                                <td>${formData.clientLocation}</td>
                            </tr>
                            <tr>
                                <td><strong>Room Volume:</strong></td>
                                <td>${calculationResults.netVolume} m³</td>
                            </tr>
                            <tr>
                                <td><strong>Design Concentration:</strong></td>
                                <td>${calculationResults.concentration}%</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="system-requirements">
                        <h3>System Requirements</h3>
                        <div class="requirement-grid">
                            <div class="requirement-item">
                                <label>FM-200 Agent</label>
                                <span>${calculationResults.agentWeight} kg</span>
                            </div>
                            <div class="requirement-item">
                                <label>Storage Cylinders</label>
                                <span>${calculationResults.cylinderCount} × ${calculationResults.cylinderSize} kg</span>
                            </div>
                            <div class="requirement-item">
                                <label>Nozzles Required</label>
                                <span>${calculationResults.nozzleCount} pcs</span>
                            </div>
                            <div class="requirement-item">
                                <label>Piping Length</label>
                                <span>${calculationResults.pipingLength} m</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p><strong>Contact for Detailed Quotation:</strong></p>
                        <p>Email: ${APP_CONFIG.contactEmail} | Phone: ${APP_CONFIG.contactPhone}</p>
                        <p>Website: https://fm-200-room-flooding-system-calcula.vercel.app/</p>
                        <p><em>This is a preliminary quotation. Final pricing subject to site survey and detailed engineering.</em></p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    round(value, decimals) {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    formatCurrency(amount, currency) {
        try {
            // Handle different currency symbols
            let symbol = '';
            let formattedAmount = amount.toFixed(2);
            
            switch(currency) {
                case 'USD':
                    symbol = '$';
                    break;
                case 'EUR':
                    symbol = '€';
                    break;
                case 'INR':
                    symbol = '₹';
                    break;
                case 'AED':
                    symbol = 'AED ';
                    break;
                default:
                    symbol = currency + ' ';
            }
            
            // Add thousand separators
            formattedAmount = formattedAmount.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            
            return symbol + formattedAmount;
        } catch (error) {
            return `${currency} ${amount.toFixed(2)}`;
        }
    }

    setElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    generateProjectId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `FM200-${timestamp}-${random}`.toUpperCase();
    }

    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            animation: slideIn 0.3s ease;
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
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    loadPreferences() {
        try {
            const prefs = JSON.parse(localStorage.getItem(APP_CONFIG.storageKeys.USER_PREFERENCES));
            return {
                theme: prefs?.theme || 'light',
                expertMode: prefs?.expertMode || false,
                lastCurrency: prefs?.lastCurrency || 'USD'
            };
        } catch (e) {
            console.error('Error loading preferences:', e);
            return { theme: 'light', expertMode: false, lastCurrency: 'USD' };
        }
    }

    savePreferences() {
        try {
            localStorage.setItem(APP_CONFIG.storageKeys.USER_PREFERENCES, JSON.stringify(this.userPrefs));
        } catch (e) {
            console.error('Error saving preferences:', e);
        }
    }

    initThemeToggle() {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            // Set initial theme
            if (this.userPrefs.theme === 'dark') {
                document.body.classList.add('dark-mode');
                toggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
            } else {
                document.body.classList.remove('dark-mode');
                toggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
            }
            
            // Toggle theme
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

    initGoogleTranslate() {
        const widget = document.getElementById('google_translate_element');
        if (widget) {
            widget.style.display = 'inline-block';
        }
    }

    initAffiliateLinks() {
        const affiliateLinks = document.querySelectorAll('.affiliate-link, .affiliate-button');
        affiliateLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                console.log('Affiliate link clicked:', link.href);
            });
        });
    }

    initBuyMeCoffee() {
        const coffeeLinks = document.querySelectorAll('.coffee-button');
        coffeeLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showNotification('Thank you for your support!', 'success');
                setTimeout(() => {
                    window.open(link.href, '_blank', 'noopener,noreferrer');
                }, 1000);
            });
        });
    }
}

// ============================================================================
// APPLICATION INITIALIZATION
// ============================================================================

// Add CSS for notifications
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
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
        background: #3d3d3d !important;
        color: #ffffff !important;
        border-color: #555 !important;
    }
`;
document.head.appendChild(notificationStyle);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('FM-200 Calculator v4.0 - Initializing...');
    
    try {
        window.fm200Calculator = new FM200Calculator();
        console.log('FM-200 Calculator v4.0 - Ready!');
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
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 10000;
        `;
        errorDiv.innerHTML = `
            <h3>Application Error</h3>
            <p>${error.message}</p>
            <button onclick="location.reload()" style="margin-top: 10px; padding: 10px 20px; background: white; color: #ff4444; border: none; border-radius: 5px; cursor: pointer;">
                Reload Application
            </button>
        `;
        document.body.appendChild(errorDiv);
    }
});

// Handle unhandled errors
window.addEventListener('error', function(e) {
    console.error('Unhandled error:', e.message, 'at', e.filename, ':', e.lineno);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled Promise Rejection:', event.reason);
});
