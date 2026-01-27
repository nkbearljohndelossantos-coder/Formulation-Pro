/**
 * QR Code Generator Utility
 * Formulation Pro - Generate QR codes for formulations
 * Uses qrcode.js library
 */

(function () {
    /**
     * Generate QR code for a formulation
     * @param {string} lotNumber - Lot number to encode
     * @param {HTMLElement} container - Container element to render QR code
     * @param {number} size - Size of QR code (default: 200)
     */
    function generateQRCode(lotNumber, container, size = 200) {
        if (!container) {
            console.error('QR Code container not found');
            return;
        }

        // Clear existing content
        container.innerHTML = '';

        // Create QR code using QRCode.js
        new QRCode(container, {
            text: lotNumber,
            width: size,
            height: size,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    /**
     * Generate downloadable QR code
     * @param {string} lotNumber - Lot number to encode
     * @param {string} filename - Filename for download
     */
    function downloadQRCode(lotNumber, filename = 'qrcode.png') {
        const tempContainer = document.createElement('div');
        tempContainer.style.display = 'none';
        document.body.appendChild(tempContainer);

        new QRCode(tempContainer, {
            text: lotNumber,
            width: 300,
            height: 300,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        setTimeout(() => {
            const canvas = tempContainer.querySelector('canvas');
            if (canvas) {
                const link = document.createElement('a');
                link.download = filename;
                link.href = canvas.toDataURL();
                link.click();
            }
            document.body.removeChild(tempContainer);
        }, 100);
    }

    /**
     * Print QR code
     * @param {string} lotNumber - Lot number to encode
     * @param {string} productName - Product name for label
     */
    function printQRCode(lotNumber, productName = '') {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR Code - ${lotNumber}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        flex-direction: column;
                    }
                    .qr-label {
                        text-align: center;
                        padding: 20px;
                        border: 2px solid #000;
                        border-radius: 10px;
                    }
                    .qr-label h2 {
                        margin: 0 0 10px 0;
                        font-size: 18px;
                    }
                    .qr-label p {
                        margin: 10px 0 0 0;
                        font-size: 14px;
                        font-weight: bold;
                    }
                    #qr-print-container {
                        margin: 15px 0;
                    }
                </style>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
            </head>
            <body>
                <div class="qr-label">
                    <h2>${productName}</h2>
                    <div id="qr-print-container"></div>
                    <p>Lot: ${lotNumber}</p>
                </div>
                <script>
                    new QRCode(document.getElementById('qr-print-container'), {
                        text: '${lotNumber}',
                        width: 200,
                        height: 200,
                        colorDark: "#000000",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.H
                    });
                    setTimeout(() => window.print(), 500);
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    // Export functions
    window.qrCodeGenerator = {
        generate: generateQRCode,
        download: downloadQRCode,
        print: printQRCode
    };
})();
