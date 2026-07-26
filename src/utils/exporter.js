// Utility to convert JSON objects array to downloadable CSV file
export function exportToCSV(filename, headers, rows) {
  if (!rows || !rows.length) return false;

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerRow = headers.map(h => escapeCSV(h.label)).join(',');
  const dataRows = rows.map(row => {
    return headers.map(h => escapeCSV(h.accessor(row))).join(',');
  });

  const csvContent = [headerRow, ...dataRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}

export function exportInventoryCSV(products) {
  const headers = [
    { label: 'Barcode', accessor: p => p.barcode || '' },
    { label: 'Product Name', accessor: p => p.productName || '' },
    { label: 'Brand', accessor: p => p.brand || '' },
    { label: 'Category', accessor: p => p.category || '' },
    { label: 'Selling Price (₹)', accessor: p => (p.basePrice / 100).toFixed(2) },
    { label: 'Stock Qty', accessor: p => p.currentStock || 0 },
    { label: 'Min Alert Qty', accessor: p => p.minStockAlert || 10 },
    { label: 'GST %', accessor: p => p.taxPercent || 18 }
  ];
  return exportToCSV('inventory_catalog', headers, products);
}

export function exportSalesCSV(purchases) {
  const headers = [
    { label: 'Invoice No', accessor: s => s.billNumber || s.id },
    { label: 'Date', accessor: s => s.timestamp ? new Date(s.timestamp).toLocaleString('en-IN') : '' },
    { label: 'Customer Name', accessor: s => s.customer?.name || s.customerName || '' },
    { label: 'Customer Phone', accessor: s => s.customer?.phone || s.customerPhone || '' },
    { label: 'Payment Method', accessor: s => s.paymentMethod || 'CASH' },
    { label: 'Items Count', accessor: s => s.items?.length || 0 },
    { label: 'Total Amount (₹)', accessor: s => (s.totalAmount / 100).toFixed(2) },
    { label: 'Paid Amount (₹)', accessor: s => (s.paidAmount / 100).toFixed(2) },
    { label: 'Due Amount (₹)', accessor: s => (s.dueAmount / 100).toFixed(2) }
  ];
  return exportToCSV('sales_report', headers, purchases);
}

export function exportCustomerLedgerCSV(customers) {
  const headers = [
    { label: 'Mobile Number', accessor: c => c.phone || '' },
    { label: 'Customer Name', accessor: c => c.name || '' },
    { label: 'Site / Address', accessor: c => c.address || '' },
    { label: 'Total Purchased (₹)', accessor: c => (c.totalPurchases / 100).toFixed(2) },
    { label: 'Pending Due Balance (₹)', accessor: c => (c.totalDue / 100).toFixed(2) },
    { label: 'Last Purchase Date', accessor: c => c.lastPurchaseAt ? new Date(c.lastPurchaseAt).toLocaleDateString('en-IN') : 'N/A' }
  ];
  return exportToCSV('customer_ledger_statement', headers, customers);
}
