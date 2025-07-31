const convertToCsv = (data: any[], headers: {key: string, label: string}[]): string => {
    const headerRow = headers.map(h => `"${h.label}"`).join(',');
    const rows = data.map(row => {
        return headers.map(header => {
            const value = row[header.key as keyof typeof row] ?? '';
            const stringValue = String(value).replace(/"/g, '""');
            return `"${stringValue}"`;
        }).join(',');
    });
    return [headerRow, ...rows].join('\n');
};

export const exportToCsv = (filename: string, data: any[], headers: {key: string, label: string}[]) => {
    if (!data || data.length === 0) {
        alert("No data to export.");
        return;
    }
    const csvString = convertToCsv(data, headers);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
