/**
 * Print Manager Module
 * Formulation Pro - Custom Print Preview for Production and QC Lot Traveler
 */

(function () {
    const QRCODE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';

    /**
     * Load QRCode library if not already present
     */
    function loadQRCode() {
        return new Promise((resolve, reject) => {
            if (window.QRCode) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = QRCODE_CDN;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Show the custom print preview modal
     * @param {Object} data - Formulation data
     */
    async function showPrintPreview(data) {
        await loadQRCode();
        const userWithProfile = await window.auth.getCurrentUserWithProfile();
        const isAdminOrChemist = userWithProfile && ['admin', 'chemist', 'formulator'].includes(userWithProfile.profile.role);

        // Create modal container
        const modal = document.createElement('div');
        modal.id = 'print-preview-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #f0f2f5;
            z-index: 10000;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 40px 20px;
            font-family: 'Poppins', sans-serif;
            color: #1a1c26;
        `;

        const lotNumber = data.lot_number || 'UNKNOWN';
        const currentDate = new Date().toISOString().split('T')[0];

        modal.innerHTML = `
            <style>
                #print-preview-content {
                    width: 794px; /* A4 width in px at 96dpi */
                    min-height: 1123px; /* A4 height */
                    background: #fff;
                    padding: 40px 60px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    position: relative;
                    box-sizing: border-box;
                }
                .print-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 30px;
                }
                .print-logo img {
                    height: 80px;
                }
                .serial-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                }
                .serial-label {
                    font-size: 0.8rem;
                    font-weight: 800;
                    margin-bottom: 5px;
                    color: #444;
                }
                #barcode-container {
                    width: 150px;
                    height: 150px;
                    margin: 0 auto;
                }
                #barcode-container img {
                    width: 100%;
                    height: 100%;
                }
                .serial-text {
                    font-weight: 700;
                    font-size: 0.9rem;
                    margin-top: 5px;
                    width: 100%;
                    text-align: center;
                }
                .doc-title {
                    text-align: center;
                    font-size: 1.6rem;
                    font-weight: 900;
                    margin: 40px 0;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .info-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-bottom: 40px;
                }
                .info-row {
                    display: flex;
                    align-items: flex-end;
                }
                .info-label {
                    width: 250px;
                    font-weight: 800;
                    font-size: 0.95rem;
                    text-transform: uppercase;
                }
                .info-dots {
                    width: 20px;
                    font-weight: 800;
                }
                .info-value {
                    flex: 1;
                    border-bottom: 1px solid #333;
                    padding-left: 10px;
                    font-size: 1.05rem;
                    min-height: 24px;
                }
                .section-header {
                    font-size: 1.3rem;
                    font-weight: 900;
                    margin-top: 40px;
                    margin-bottom: 20px;
                    text-transform: uppercase;
                }
                .formula-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 30px;
                }
                .formula-table th {
                    text-align: left;
                    padding: 10px;
                    border-bottom: 2px solid #000;
                    font-weight: 800;
                    text-transform: uppercase;
                    font-size: 0.85rem;
                }
                .formula-table td {
                    padding: 8px 10px;
                    border-bottom: 1px solid #ddd;
                }
                .batching-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                .footer-controls {
                    position: fixed;
                    bottom: 30px;
                    display: flex;
                    gap: 15px;
                    z-index: 10001;
                }
                .print-btn {
                    padding: 12px 30px;
                    background: #5e63ff;
                    color: #fff;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(94, 99, 255, 0.4);
                }
                .cancel-btn {
                    padding: 12px 30px;
                    background: #fff;
                    color: #333;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                }
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #print-preview-content, #print-preview-content * {
                        visibility: visible;
                    }
                    #print-preview-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        box-shadow: none;
                        padding: 0;
                    }
                    .footer-controls {
                        display: none !important;
                    }
                    #print-preview-modal {
                        background: #fff;
                        padding: 0;
                        overflow: visible;
                    }
                }
            </style>
            
            <div id="print-preview-content">
                <div class="print-header">
                    <div class="print-logo">
                        <img src="logo.png" alt="NKB Logo">
                    </div>
                    <div class="serial-container">
                        <div class="serial-label">DOCUMENT SERIAL NO.</div>
                        <div id="barcode-container"></div>
                        <div class="serial-text">${lotNumber}</div>
                    </div>
                </div>

                <h1 class="doc-title">Production and QC Lot Traveler</h1>

                <div class="info-grid">
                    <div class="info-row"><span class="info-label">Customer</span><span class="info-dots">:</span><span class="info-value">${data.customer || ''}</span></div>
                    <div class="info-row"><span class="info-label">Date</span><span class="info-dots">:</span><span class="info-value">${currentDate}</span></div>
                    <div class="info-row"><span class="info-label">Product Name</span><span class="info-dots">:</span><span class="info-value">${data.product_name || ''}</span></div>
                    <div class="info-row"><span class="info-label">Batch No.</span><span class="info-dots">:</span><span class="info-value"></span></div>
                    <div class="info-row"><span class="info-label">Packaging</span><span class="info-dots">:</span><span class="info-value">${data.bottle_type || ''}</span></div>
                    <div class="info-row"><span class="info-label">Weight Received</span><span class="info-dots">:</span><span class="info-value"></span></div>
                    <div class="info-row"><span class="info-label">Refill Date</span><span class="info-dots">:</span><span class="info-value"></span></div>
                    <div class="info-row"><span class="info-label">Time Start</span><span class="info-dots">:</span><span class="info-value"></span></div>
                    <div class="info-row"><span class="info-label">Time End</span><span class="info-dots">:</span><span class="info-value"></span></div>
                    <div class="info-row"><span class="info-label">Target No. of Bottle Qty</span><span class="info-dots">:</span><span class="info-value">${data.bottle_qty || '0'}</span></div>
                    <div class="info-row"><span class="info-label">Actual No. of Bottle Produced</span><span class="info-dots">:</span><span class="info-value"></span></div>
                    <div class="info-row"><span class="info-label">Weight Left</span><span class="info-dots">:</span><span class="info-value"></span></div>
                    <div class="info-row"><span class="info-label">Total Weight</span><span class="info-dots">:</span><span class="info-value">${data.total_weight || '0.00'}g</span></div>
                </div>


                <div class="section-header">Batching Requirement</div>
                <div class="batching-grid">
                    <div class="info-row"><span class="info-label">Compounded Date</span><span class="info-dots">:</span><span class="info-value"></span></div>
                    <div class="info-row"><span class="info-label">Compounded by</span><span class="info-dots">:</span><span class="info-value"></span></div>
                    <div class="info-row"><span class="info-label">QA checked and approved by</span><span class="info-dots">:</span><span class="info-value"></span></div>
                    <div class="info-row"><span class="info-label">Accepted by Production Supervisor</span><span class="info-dots">:</span><span class="info-value"></span></div>
                    <div class="info-row"><span class="info-label">Operators</span><span class="info-dots">:</span><span class="info-value"></span></div>
                    <div class="info-row"><span class="info-label"></span><span class="info-dots">:</span><span class="info-value"></span></div>
                    <div class="info-row"><span class="info-label"></span><span class="info-dots">:</span><span class="info-value"></span></div>
                    <div class="info-row"><span class="info-label"></span><span class="info-dots">:</span><span class="info-value"></span></div>
                </div>
            </div>

            <div class="footer-controls">
                <button class="cancel-btn" onclick="document.getElementById('print-preview-modal').remove()">Close Preview</button>
                <button class="print-btn" onclick="window.print()">Print to PDF</button>
            </div>
        `;

        document.body.appendChild(modal);

        // Generate QR Code using FPRO- prefix for internal recognition
        new QRCode(document.getElementById("barcode-container"), {
            text: `FPRO-${lotNumber}`,
            width: 150,
            height: 150,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    // Export to window
    window.printManager = {
        showPreview: showPrintPreview
    };

})();
