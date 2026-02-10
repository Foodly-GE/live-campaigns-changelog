/**
 * Common JavaScript utilities for Campaign Changelog
 * Dark Command Center Theme
 */

// --- Chart.js v4 Dark Theme Defaults ---
if (typeof Chart !== 'undefined') {
    Chart.defaults.color = '#8b92a8';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.06)';
    Chart.defaults.font.family = "'DM Sans', sans-serif";
    Chart.defaults.font.size = 11;

    // Plugin defaults
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.pointStyleWidth = 8;
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.plugins.title.color = '#e8eaf0';
    Chart.defaults.plugins.title.font = { size: 12, weight: '600', family: "'DM Sans', sans-serif" };
}

// --- Utility Functions ---
window.formatDate = function (dateStr) {
    if (!dateStr || dateStr === 'NaT' || dateStr === 'None') return '-';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return dateStr;
    }
};

window.debounce = function (func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

window.toggleGroup = function (header) {
    const content = header.nextElementSibling;
    if (content) {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';
        header.classList.toggle('collapsed', !isHidden);
    }
};

// Chart color palette (theme-matched)
window.chartColors = {
    green: {
        border: '#34d399',
        background: 'rgba(52, 211, 153, 0.08)'
    },
    pink: {
        border: '#fb7185',
        background: 'rgba(251, 113, 133, 0.08)'
    },
    cyan: {
        border: '#22d3ee',
        background: 'rgba(34, 211, 238, 0.08)'
    }
};

// Common dark chart options
window.darkChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'top',
            labels: {
                color: '#8b92a8',
                font: { family: "'DM Sans', sans-serif", size: 11 },
                usePointStyle: true,
                padding: 16
            }
        }
    },
    scales: {
        x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#555d75', font: { size: 10, family: "'JetBrains Mono', monospace" } },
            border: { color: 'rgba(255, 255, 255, 0.06)' }
        },
        y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#555d75', font: { size: 10, family: "'JetBrains Mono', monospace" } },
            border: { color: 'rgba(255, 255, 255, 0.06)' }
        }
    }
};

// --- Multi-Select Dropdown ---
window.initMultiSelect = function (wrapperId, onChange) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    const toggle = wrapper.querySelector('.multiselect-toggle');
    const dropdown = wrapper.querySelector('.multiselect-dropdown');

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });

    dropdown.addEventListener('change', () => {
        const checked = dropdown.querySelectorAll('input[type="checkbox"]:checked');
        const values = Array.from(checked).map(cb => cb.value);
        if (values.length === 0) {
            toggle.textContent = 'All providers';
        } else if (values.length === 1) {
            toggle.textContent = values[0];
        } else {
            toggle.textContent = `${values.length} selected`;
        }
        if (onChange) onChange(values);
    });
};

window.populateMultiSelect = function (wrapperId, items) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    const dropdown = wrapper.querySelector('.multiselect-dropdown');
    const toggle = wrapper.querySelector('.multiselect-toggle');

    // Preserve currently checked values
    const currentChecked = new Set(
        Array.from(dropdown.querySelectorAll('input:checked')).map(cb => cb.value)
    );

    dropdown.innerHTML = items.map(item => `
        <label>
            <input type="checkbox" value="${item}" ${currentChecked.has(item) ? 'checked' : ''}>
            ${item}
        </label>
    `).join('');

    // Update toggle text
    const checked = dropdown.querySelectorAll('input:checked');
    if (checked.length === 0) {
        toggle.textContent = 'All providers';
    } else if (checked.length === 1) {
        toggle.textContent = checked[0].value;
    } else {
        toggle.textContent = `${checked.length} selected`;
    }
};

window.getMultiSelectValues = function (wrapperId) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return [];
    const checked = wrapper.querySelectorAll('.multiselect-dropdown input:checked');
    return Array.from(checked).map(cb => cb.value);
};

// --- Cell Expand on Double Click ---
window.initCellExpand = function () {
    document.addEventListener('dblclick', (e) => {
        const td = e.target.closest('td');
        if (td && td.closest('.data-table')) {
            td.classList.toggle('cell-expanded');
        }
    });
};
