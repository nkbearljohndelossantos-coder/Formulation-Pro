/**
 * Barcode Scanner Module
 * Formulation Pro - QR Code and Barcode Scanner for Formulations
 * Uses html5-qrcode library for camera-based scanning
 */

(function () {
    let html5QrCode = null;
    let scannerModal = null;
    let isScannerProcessing = false;

    // Supported formats for better detection
    const formatsToSupport = [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF
    ];

    /**
     * Initialize the barcode scanner
     */
    function initBarcodeScanner() {
        // Create scanner modal
        createScannerModal();

        // Create floating scan button
        createScanButton();
    }

    /**
     * Create the scanner modal UI
     */
    function createScannerModal() {
        const modal = document.createElement('div');
        modal.id = 'barcode-scanner-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10000;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(10px);
        `;

        modal.innerHTML = `
            <div style="width: 90%; max-width: 600px; background: rgba(17, 18, 26, 0.98); border-radius: 24px; padding: 30px; border: 1px solid rgba(94, 99, 255, 0.3); box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h2 style="color: #fff; font-size: 1.5rem; margin: 0; font-weight: 700;">Scan Formulation</h2>
                    <button id="close-scanner" style="background: transparent; border: none; color: #fff; font-size: 2rem; cursor: pointer; padding: 0; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.3s ease;">
                        ×
                    </button>
                </div>
                
                <div id="qr-reader" style="width: 100%; border-radius: 16px; overflow: hidden; margin-bottom: 20px;"></div>
                
                <div style="text-align: center; color: rgba(255, 255, 255, 0.6); font-size: 0.9rem;">
                    <p style="margin: 10px 0;">Position the QR code or barcode within the frame</p>
                    
                    <div style="margin: 20px 0; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 20px;">
                        <p style="margin-bottom: 10px;">Or upload an image of the barcode</p>
                        <input type="file" id="barcode-file-input" accept="image/*" style="display: none;">
                        <button id="upload-barcode-btn" style="padding: 10px 20px; background: rgba(255, 255, 255, 0.05); color: #fff; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; margin: 0 auto; transition: all 0.3s ease;">
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                <path d="M440-320v-326L336-542l-56-58 200-200 200 200-56 58-104-104v326h-80ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
                            </svg>
                            <span>Upload Barcode Image</span>
                        </button>
                        <p style="font-size: 0.75rem; margin-top: 8px; color: rgba(255, 255, 255, 0.4);">Tip: High-resolution, well-lit images work best.</p>
                    </div>

                    <p style="margin: 10px 0; color: var(--accent-clr);">Scanning for Lot Number...</p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        scannerModal = modal;

        // Close button handler
        document.getElementById('close-scanner').addEventListener('click', closeScannerModal);

        // Upload button handler
        document.getElementById('upload-barcode-btn').addEventListener('click', () => {
            document.getElementById('barcode-file-input').click();
        });

        // File input change handler
        document.getElementById('barcode-file-input').addEventListener('change', handleFileSelected);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeScannerModal();
            }
        });
    }

    /**
     * Handle file selection for barcode decoding
     */
    /**
     * Handle file selection for barcode decoding
     */
    async function handleFileSelected(e) {
        if (e.target.files.length === 0) return;

        const file = e.target.files[0];

        // IMPORTANT: Await stopping the camera before starting file scan
        try {
            await stopScanner();
        } catch (err) {
            console.warn('Scanner stop warning in file selection:', err);
        }

        // Ensure instance exists
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("qr-reader", {
                formatsToSupport: formatsToSupport,
                verbose: false
            });
        }

        window.supabaseClient.showNotification('Decoding image...', 'info');

        try {
            // Using true for showImageHelpfulMessages and 
            // experimenting with more robust scan session
            const decodedText = await html5QrCode.scanFile(file, true);
            onScanSuccess(decodedText);
        } catch (err) {
            // Handle specific "no code found" error from the library
            const errorMsg = err.toString();
            console.warn('File scan failed:', errorMsg);

            if (errorMsg.includes("No MultiFormat Readers")) {
                window.supabaseClient.showNotification('Could not detect barcode. Please ensure it is centered and not blurry.', 'warning');
            } else {
                console.error('File scan error:', err);
                window.supabaseClient.showNotification('Error reading file. Please try a different image.', 'error');
            }

            // Restart camera if file scan fails and modal is still visible
            // But wait a bit so user can read the error
            setTimeout(() => {
                if (scannerModal.style.display === 'flex' && (html5QrCode.getState() === 1)) {
                    startScanner();
                }
            }, 2000);
        }

        // Reset input
        e.target.value = '';
    }

    /**
     * Create floating scan button
     */
    function createScanButton() {
        const button = document.createElement('button');
        button.id = 'floating-scan-btn';
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="currentColor">
                <path d="M40-120v-200h80v120h120v80H40Zm680 0v-80h120v-120h80v200H720ZM160-240v-480h80v480h-80Zm120 0v-480h40v480h-40Zm120 0v-480h80v480h-80Zm120 0v-480h120v480H520Zm160 0v-480h40v480h-40Zm80 0v-480h40v480h-40ZM40-640v-200h200v80H120v120H40Zm800 0v-120H720v-80h200v200h-80Z"/>
            </svg>
        `;
        button.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 30px;
            width: 65px;
            height: 65px;
            border-radius: 50%;
            background: linear-gradient(135deg, #5e63ff 0%, #7c81ff 100%);
            border: none;
            box-shadow: 0 10px 30px rgba(94, 99, 255, 0.4);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            transition: all 0.3s ease;
            color: #fff;
        `;

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 15px 40px rgba(94, 99, 255, 0.6)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 10px 30px rgba(94, 99, 255, 0.4)';
        });

        button.addEventListener('click', openScannerModal);

        document.body.appendChild(button);
    }

    /**
     * Open scanner modal and start camera
     */
    function openScannerModal() {
        scannerModal.style.display = 'flex';
        startScanner();
    }

    /**
     * Close scanner modal and stop camera
     */
    async function closeScannerModal() {
        scannerModal.style.display = 'none';
        await stopScanner();
    }

    /**
     * Start the QR code scanner
     */
    async function startScanner() {
        if (isScannerProcessing) return;

        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("qr-reader", {
                formatsToSupport: formatsToSupport,
                verbose: false
            });
        }

        // Only start if not already scanning
        if (html5QrCode.getState() === 2) return;

        // Small safety delay to allow hardware to reset if it was just stopped
        await new Promise(r => setTimeout(r, 300));

        isScannerProcessing = true;

        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };

        try {
            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                onScanSuccess,
                onScanFailure
            );
        } catch (err) {
            console.error('Scanner start error:', err);

            let message = 'Unable to access camera. Please check permissions.';
            if (err.toString().includes('NotReadableError') || err.toString().includes('Device in use')) {
                message = 'Camera is already in use by another app or tab. Please close other camera apps and refresh.';
            }

            window.supabaseClient.showNotification(message, 'error');
            closeScannerModal();
        } finally {
            isScannerProcessing = false;
        }
    }

    /**
     * Stop the QR code scanner
     */
    async function stopScanner() {
        if (!html5QrCode) return;

        // If it's already processing (starting or stopping), wait a bit
        if (isScannerProcessing) {
            await new Promise(r => setTimeout(r, 500));
        }

        const state = html5QrCode.getState();
        if (state > 1) { // 2 = SCANNING, 3 = PAIUSED
            isScannerProcessing = true;
            try {
                await html5QrCode.stop();
                await html5QrCode.clear();
                console.log('Scanner stopped and cleared.');
            } catch (err) {
                console.warn('Scanner stop error (might already be stopped):', err);
            } finally {
                isScannerProcessing = false;
            }
        }
    }

    /**
     * Handle successful scan
     */
    function onScanSuccess(decodedText, decodedResult) {
        console.log('Scanned:', decodedText);

        // Stop scanner
        stopScanner();
        closeScannerModal();

        // Check for specific prefix, but allow clean lot numbers too
        let lotNumber = decodedText;
        if (decodedText.startsWith('FPRO-')) {
            lotNumber = decodedText.replace('FPRO-', '');
        }

        // Show success notification
        window.supabaseClient.showNotification(`Code detected: ${lotNumber}`, 'success');

        // Search for formulation by Lot Number
        searchFormulationByLotNumber(lotNumber);
    }

    /**
     * Handle scan failure (silent)
     */
    function onScanFailure(error) {
        // Silent - scanning continuously
    }

    /**
     * Search for formulation by Lot Number
     */
    async function searchFormulationByLotNumber(lotNumber) {
        try {
            // Optimization: Search specifically for this lot number instead of listing all
            const formulations = await window.dbOperations.listFormulations({ search: lotNumber });

            // Find exact match (since search might be a partial match)
            const found = formulations.find(f => f.lot_number === lotNumber);

            if (found) {
                // Navigate to formulation execution page (shows ingredients)
                window.location.href = `compounding-execution.html?id=${found.id}`;
            } else {
                window.supabaseClient.showNotification(`No formulation found with Lot Number: ${lotNumber}`, 'error');
            }
        } catch (error) {
            console.error('Search error:', error);
            window.supabaseClient.showNotification('Error searching for formulation', 'error');
        }
    }

    // Export functions
    window.barcodeScanner = {
        init: initBarcodeScanner,
        open: openScannerModal,
        close: closeScannerModal
    };

    // Auto-initialize on DOM load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBarcodeScanner);
    } else {
        initBarcodeScanner();
    }
})();
