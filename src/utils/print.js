/**
 * Clean iframe thermal receipt printer utility.
 * Renders receipt HTML in a hidden iframe for print preview without black screen or layout distortion.
 */
export function printReceiptHtml(htmlContent) {
  // Clean up any old print iframe
  const oldIframe = document.getElementById('volt-print-iframe');
  if (oldIframe) {
    oldIframe.remove();
  }

  // Create an isolated hidden iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'volt-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice Receipt</title>
        <style>
          @page {
            margin: 0;
            size: auto;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'JetBrains Mono', 'Courier New', monospace, sans-serif;
            font-size: 11px;
            line-height: 1.35;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          * {
            box-sizing: border-box;
            color: #000000 !important;
            background: transparent !important;
            border-color: #000000 !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          svg {
            stroke: #000000 !important;
            fill: none !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            color: #000000 !important;
            border-color: #333333 !important;
            padding: 4px 2px;
          }
          .border-dashed {
            border-style: dashed !important;
            border-color: #000000 !important;
          }
          .no-print, .print\\:hidden {
            display: none !important;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .justify-center { justify-content: center; }
          .items-center { align-items: center; }
          .font-bold { font-weight: bold; }
          .font-extrabold { font-weight: 800; }
          .font-mono { font-family: monospace; }
          .text-xs { font-size: 11px; }
          .text-sm { font-size: 12px; }
          .text-base { font-size: 13px; }
          .text-xl { font-size: 18px; }
          .text-\\[11px\\] { font-size: 11px; }
          .text-\\[10px\\] { font-size: 10px; }
          .text-\\[9px\\] { font-size: 9px; }
          .w-full { width: 100%; }
          .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .border-b { border-bottom: 1px solid #000; }
          .border-t { border-top: 1px solid #000; }
          .border { border: 1px solid #000; }
          .rounded-xl, .rounded-lg, .rounded { border-radius: 4px; }
          .p-6 { padding: 4mm !important; }
          .p-2.5, .p-2 { padding: 6px; }
          .py-3 { padding-top: 8px; padding-bottom: 8px; }
          .py-2 { padding-top: 6px; padding-bottom: 6px; }
          .py-1\\.5 { padding-top: 4px; padding-bottom: 4px; }
          .pb-4 { padding-bottom: 10px; }
          .pt-4 { padding-top: 10px; }
          .space-y-1 > * + * { margin-top: 4px; }
          .space-y-1\\.5 > * + * { margin-top: 6px; }
          .space-y-2 > * + * { margin-top: 8px; }
          .gap-1 { gap: 4px; }
          .gap-2 { gap: 8px; }
          .shrink-0 { flex-shrink: 0; }
        </style>
      </head>
      <body>
        <div style="width: 80mm; max-width: 100%; margin: 0 auto; background: #ffffff; color: #000000; padding: 4mm;">
          ${htmlContent}
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.error("Iframe print error fallback to window.print:", err);
      window.print();
    }
  }, 250);
}
