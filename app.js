// Konfiguracja Firebase (opcjonalnie dla Firestore)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}
const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;

// Słownik ikonek dla zdarzeń
const EVENT_ICONS = {
    bike: '🚴',
    walk: '🚶',
    run: '🏃',
    swim: '🏊',
    workout: '🏋️',
    icecream: '🍦',
    donut: '🍩',
    alcohol: '🍺',
    snacks: '🍿',
    restaurant: '🍽️',
    fastfood: '🍔',
    nightfood: '🌙'
};

const EVENT_LABELS = {
    bike: '🚴 Rower',
    walk: '🚶 Spacer',
    run: '🏃 Bieganie',
    swim: '🏊 Pływanie',
    workout: '🏋️ Ćwiczenia',
    icecream: '🍦 Lody',
    donut: '🍩 Słodycze',
    alcohol: '🍺 Alkohol',
    snacks: '🍿 Przekąski',
    restaurant: '🍽️ Restauracja',
    fastfood: '🍔 Fastfood',
    nightfood: '🌙 Jedzenie w nocy'
};

// Stan aplikacji
let currentDate = new Date();
let entriesData = JSON.parse(localStorage.getItem('zetpepe_entries')) || {};
let resolutionsData = JSON.parse(localStorage.getItem('zetpepe_resolutions')) || [];
let weightChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderCalendar();
    setupEventListeners();
});

// Motyw
function initTheme() {
    const savedTheme = localStorage.getItem('zetpepe_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('zetpepe_theme', next);
    document.getElementById('theme-toggle-btn').textContent = next === 'dark' ? '☀️' : '🌙';
}

// Renderowanie kalendarza
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
        "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
    ];

    document.getElementById('current-month-label').textContent = `${monthNames[month]} ${year}`;

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay();
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < adjustedFirstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-card empty';
        grid.appendChild(emptyCell);
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dateStr = getFormattedDate(dateObj);
        const isFuture = dateObj > today;

        const card = document.createElement('div');
        card.className = 'day-card';
        if (isFuture) card.classList.add('disabled');

        const entry = entriesData[dateStr];
        if (entry && entry.color) {
            card.classList.add(`status-${entry.color}`);
        }

        let iconsHtml = '';
        if (entry && entry.events && entry.events.length > 0) {
            iconsHtml = entry.events.map(ev => EVENT_ICONS[ev] || '').join('');
        }

        card.innerHTML = `
            <div class="day-number">${day}</div>
            <div class="day-weight">${entry && entry.weight ? `${entry.weight} kg` : ''}</div>
            <div class="day-icons">${iconsHtml}</div>
        `;

        if (!isFuture) {
            card.addEventListener('click', () => openDayModal(dateStr));
        }

        grid.appendChild(card);
    }
}

function getFormattedDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Modal Dnia
function openDayModal(dateStr) {
    document.getElementById('entry-date').value = dateStr;
    document.getElementById('modal-date-title').textContent = `Dzień: ${dateStr}`;

    const entry = entriesData[dateStr] || {};

    document.getElementById('entry-weight').value = entry.weight || '';
    document.getElementById('entry-notes').value = entry.notes || '';

    const checkboxes = document.querySelectorAll('#events-dropdown input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = entry.events ? entry.events.includes(cb.value) : false;
    });

    const radios = document.querySelectorAll('input[name="day-color"]');
    radios.forEach(radio => {
        radio.checked = entry.color ? radio.value === entry.color : false;
    });

    const deleteBtn = document.getElementById('delete-entry-btn');
    if (entry.weight || entry.color || (entry.events && entry.events.length > 0)) {
        deleteBtn.classList.remove('hidden');
    } else {
        deleteBtn.classList.add('hidden');
    }

    showModal('day-modal');
}

function saveDayEntry(e) {
    e.preventDefault();
    const dateStr = document.getElementById('entry-date').value;
    const weightVal = parseFloat(document.getElementById('entry-weight').value);
    const notesVal = document.getElementById('entry-notes').value;

    if (weightVal && (weightVal < 30 || weightVal > 150)) {
        alert('Proszę podać wagę w przedziale od 30 do 150 kg.');
        return;
    }

    const selectedEvents = Array.from(document.querySelectorAll('#events-dropdown input[type="checkbox"]:checked'))
        .map(cb => cb.value);

    const selectedColorRadio = document.querySelector('input[name="day-color"]:checked');
    const selectedColor = selectedColorRadio ? selectedColorRadio.value : null;

    entriesData[dateStr] = {
        weight: weightVal || null,
        events: selectedEvents,
        color: selectedColor,
        notes: notesVal
    };

    saveEntriesLocalAndCloud(dateStr, entriesData[dateStr]);
    closeModal('day-modal');
    renderCalendar();
}

function deleteDayEntry() {
    const dateStr = document.getElementById('entry-date').value;
    if (confirm(`Czy na pewno chcesz usunąć wpis z dnia ${dateStr}?`)) {
        delete entriesData[dateStr];
        saveEntriesLocalAndCloud(dateStr, null);
        closeModal('day-modal');
        renderCalendar();
    }
}

function saveEntriesLocalAndCloud(dateStr, data) {
    localStorage.setItem('zetpepe_entries', JSON.stringify(entriesData));
    if (db) {
        if (data) {
            db.collection('entries').doc(dateStr).set(data);
        } else {
            db.collection('entries').doc(dateStr).delete();
        }
    }
}

// Modal Statystyk
function openStatsModal() {
    calculateStats();
    renderWeightChart();
    showModal('stats-modal');
}

function calculateStats() {
    const sortedDates = Object.keys(entriesData)
        .filter(d => entriesData[d].weight !== null && entriesData[d].weight !== undefined)
        .sort();

    if (sortedDates.length === 0) {
        document.getElementById('stat-start-weight').textContent = '-- kg';
        document.getElementById('stat-current-weight').textContent = '-- kg';
        document.getElementById('stat-diff-total').textContent = '-- kg';
        document.getElementById('stat-diff-month').textContent = '-- kg';
        return;
    }

    const firstWeight = entriesData[sortedDates[0]].weight;
    const latestWeight = entriesData[sortedDates[sortedDates.length - 1]].weight;
    const diffTotal = (latestWeight - firstWeight).toFixed(1);

    document.getElementById('stat-start-weight').textContent = `${firstWeight} kg`;
    document.getElementById('stat-current-weight').textContent = `${latestWeight} kg`;
    document.getElementById('stat-diff-total').textContent = `${diffTotal > 0 ? '+' : ''}${diffTotal} kg`;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = getFormattedDate(thirtyDaysAgo);

    const monthDates = sortedDates.filter(d => d >= thirtyDaysAgoStr);
    if (monthDates.length > 0) {
        const monthStartWeight = entriesData[monthDates[0]].weight;
        const diffMonth = (latestWeight - monthStartWeight).toFixed(1);
        document.getElementById('stat-diff-month').textContent = `${diffMonth > 0 ? '+' : ''}${diffMonth} kg`;
    } else {
        document.getElementById('stat-diff-month').textContent = '-- kg';
    }
}

function renderWeightChart() {
    const ctx = document.getElementById('weight-chart').getContext('2d');
    const sortedDates = Object.keys(entriesData)
        .filter(d => entriesData[d].weight !== null && entriesData[d].weight !== undefined)
        .sort();

    const labels = sortedDates;
    const dataPoints = sortedDates.map(d => entriesData[d].weight);

    if (weightChart) {
        weightChart.destroy();
    }

    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Waga (kg)',
                data: dataPoints,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// Modal Postanowień
function openResolutionsModal() {
    renderResolutions();
    showModal('resolutions-modal');
}

function renderResolutions() {
    const list = document.getElementById('resolutions-list');
    list.innerHTML = '';

    resolutionsData.forEach((res, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${res.text}</span>
            <button class="btn btn-secondary btn-sm" onclick="deleteResolution(${index})">✕</button>
        `;
        list.appendChild(li);
    });
}

function addResolution(e) {
    e.preventDefault();
    const input = document.getElementById('resolution-input');
    const text = input.value.trim();
    if (text) {
        resolutionsData.push({ text, createdAt: new Date().toISOString() });
        localStorage.setItem('zetpepe_resolutions', JSON.stringify(resolutionsData));
        input.value = '';
        renderResolutions();
    }
}

window.deleteResolution = function(index) {
    resolutionsData.splice(index, 1);
    localStorage.setItem('zetpepe_resolutions', JSON.stringify(resolutionsData));
    renderResolutions();
};

function showModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function setupEventListeners() {
    document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);

    document.getElementById('prev-month-btn').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('next-month-btn').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    document.getElementById('day-form').addEventListener('submit', saveDayEntry);
    document.getElementById('delete-entry-btn').addEventListener('click', deleteDayEntry);

    document.getElementById('stats-btn').addEventListener('click', openStatsModal);
    document.getElementById('resolutions-btn').addEventListener('click', openResolutionsModal);
    document.getElementById('add-resolution-form').addEventListener('submit', addResolution);

    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-close');
            closeModal(modalId);
        });
    });
}