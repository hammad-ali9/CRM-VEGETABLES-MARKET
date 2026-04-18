/**
 * Exports data to a CSV file and triggers a browser download.
 * 
 * @param data Array of objects representing the rows.
 * @param headers Array of strings representing the column headers.
 * @param filename Desired filename (e.g., 'customers.csv').
 */
export function downloadCSV(data: any[], headers: string[], filename: string) {
  // 1. Create the CSV content
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map((_header, index) => {
      // We assume data is provided as an array of arrays corresponding to headers
      // OR an array of objects where values are in order.
      // To be safe, we'll expect data to be pre-formatted as arrays of values.
      const val = row[index];
      const escaped = ('' + val).replace(/"/g, '""'); // Escape double quotes
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  const csvString = csvRows.join('\n');
  
  // 2. Create a blob and trigger download
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
