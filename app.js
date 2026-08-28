import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// === 1. KONFIGURACJA FIREBASE ===
const firebaseConfig = {
  apiKey: "AIzaSyCo5J4vEogXYl2--H0NRekdN6RZhV4PtmY",
  authDomain: "zetpepe-de902.firebaseapp.com",
  projectId: "zetpepe-de902",
  storageBucket: "zetpepe-de902.firebasestorage.app",
  messagingSenderId: "120694271859",
  appId: "1:120694271859:web:308ccadf1bac8b4c871f06",
  measurementId: "G-ERVV29MDFY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Słownik ikonek dla zdarzeń
const EVENT_ICONS = {
    bike: '🚴',
    walk: '🚶',
    run: '🏃',
    swim: '🏊',
    workout: '🏋️',
    donut: '🍩',
    icecream: '🍦',
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
    donut: '🍩 Słodycze',
    icecream: '🍦 Lody',
    alcohol: '🍺 Alkohol',
    snacks: '🍿 Przekąski',
    restaurant: '🍽️ Restauracja',
    fastfood: '🍔 Fastfood',
    nightfood: '🌙 Jedzenie w nocy'
};

// === 2. ELEMENTY INTERFEJSU (DOM) ===
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const newPinInput = document.getElementById('new-pin');
const loginBtn = document.getElementById('login-btn');
const savePinBtn = document.getElementById('save-pin-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');
const pinError = document.getElementById('pin-error');
const welcomeUsername = document.getElementById('welcome-username');
const themeToggleBtn = document.getElementById('theme-toggle');

const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const currentMonthDisplay = document.getElementById('current-month-display');
const daysGrid = document.getElementById('days-grid');

// Modal Edycji Dnia & Multi-Select
const editModal = document.getElementById('edit-modal');
const modalDateDisplay = document.getElementById('modal-date-display');
const weightInput = document.getElementById('weight-input');
const eventsTrigger = document.getElementById('events-trigger');
const eventsTriggerText = document.getElementById('events-trigger-text');
const eventsDropdown = document.getElementById('events-dropdown');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');
const saveDayBtn = document.getElementById('save-day-btn');

// Modal Postanowienia
const resolutionsToggleBtn = document.getElementById('resolutions-toggle');
const resolutionsModal = document.getElementById('resolutions-modal');
const closeResolutionsBtn = document.getElementById('close-resolutions-btn');
const newResolutionInput = document.getElementById('new-resolution-input');
const addResolutionBtn = document.getElementById('add-resolution-btn');
const resolutionsListEl = document.getElementById('resolutions-list');
const saveResolutionsBtn = document.getElementById('save-resolutions-btn');

// Modal Statystyki
const statsToggleBtn = document.getElementById('stats-toggle');
const statsModal = document.getElementById('stats-modal');
const closeStatsBtn = document.getElementById('close-stats-btn');
const startWeightInput = document.getElementById('start-weight-input');
const targetWeightSlider = document.getElementById('target-weight-slider');
const targetWeightVal = document.getElementById('target-weight-val');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressPercentText = document.getElementById('progress-percent-text');
const statMonthDiff = document.getElementById('stat-month-diff');
const statTotalDiff = document.getElementById('stat-total-diff');
const saveStatsBtn = document.getElementById('save-stats-btn');

// === 3. STAN APLIKACJI ===
let currentUser = null;
let currentDate = new Date();
let selectedDateStr = null; 
let monthDaysData = {}; 
let allDaysData = {};
let currentResolutions = [];

function showScreen(screenName) {
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('screen-pin').classList.add('hidden');
    document.getElementById('screen-dashboard').classList.add('hidden');

    if (screenName === 'login') {
        document.getElementById('screen-login').classList.remove('hidden');
    } else if (screenName === 'pin') {
        document.getElementById('screen-pin').classList.remove('hidden');
    } else if (screenName === 'dashboard') {
        document.getElementById('screen-dashboard').classList.remove('hidden');
    }
}

// === 4. INICJALIZACJA I MOTYW ===
window.onload = async () => {
    const savedTheme = localStorage.getItem('zetpepeTheme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    setupDeselectableRadioButtons();
    setupMultiSelectDropdown();

    const savedUser = localStorage.getItem('zetpepeUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        await showDashboard();
    } else {
        showScreen('login');
    }
};

themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('zetpepeTheme', newTheme);
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    themeToggleBtn.innerHTML = theme === 'light' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
}

// === 5. MULTI-SELECT & ODKLIKOWANIE OCEN DNIA ===
function setupDeselectableRadioButtons() {
    const radios = document.querySelectorAll('input[name="day-color"]');
    radios.forEach(radio => {
        radio.addEventListener('click', function() {
            if (this.dataset.waschecked === "true") {
                this.checked = false;
                this.dataset.waschecked = "false";
            } else {
                radios.forEach(r => r.dataset.waschecked = "false");
                this.dataset.waschecked = "true";
            }
        });
    });
}

function setupMultiSelectDropdown() {
    eventsTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        eventsDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!document.getElementById('events-multiselect').contains(e.target)) {
            eventsDropdown.classList.add('hidden');
        }
    });

    const checkboxes = eventsDropdown.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateMultiSelectTriggerText);
    });
}

function updateMultiSelectTriggerText() {
    const checked = Array.from(eventsDropdown.querySelectorAll('input[type="checkbox"]:checked'));
    if (checked.length === 0) {
        eventsTriggerText.innerText = "-- Wybierz zdarzenia --";
    } else {
        const labels = checked.map(cb => EVENT_ICONS[cb.value] || cb.value);
        eventsTriggerText.innerText = labels.join(" ");
    }
}

// === 6. OBSŁUGA LOGOWANIA I PINU ===
loginBtn.addEventListener('click', async () => {
    const user = usernameInput.value.trim().toLowerCase();
    const pass = passwordInput.value.trim().toLowerCase();
    if (!user || !pass) return;

    try {
        const userRef = doc(db, "users", user);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            let isPasswordCorrect = !userData.isSecured ? (userData.password === pass) : (CryptoJS.SHA256(pass).toString() === userData.password);

            if (isPasswordCorrect) {
                currentUser = { id: user, ...userData };
                loginError.classList.add('hidden');

                if (!userData.isSecured) {
                    showScreen('pin');
                } else {
                    localStorage.setItem('zetpepeUser', JSON.stringify(currentUser));
                    await showDashboard();
                }
            } else {
                loginError.innerText = "Błędny login lub PIN!";
                loginError.classList.remove('hidden');
            }
        } else {
            loginError.innerText = "Brak profilu! Utwórz go przez admin.html";
            loginError.classList.remove('hidden');
        }
    } catch (e) {
        console.error(e);
        loginError.innerText = "Błąd połączenia z bazą!";
        loginError.classList.remove('hidden');
    }
});

savePinBtn.addEventListener('click', async () => {
    const pin = newPinInput.value.trim();
    if (pin.length !== 4) { pinError.classList.remove('hidden'); return; }

    try {
        const hashedPin = CryptoJS.SHA256(pin).toString();
        const userRef = doc(db, "users", currentUser.id);
        await updateDoc(userRef, { password: hashedPin, isSecured: true });

        currentUser.password = hashedPin;
        currentUser.isSecured = true;
        localStorage.setItem('zetpepeUser', JSON.stringify(currentUser));

        await showDashboard();
    } catch (e) { console.error(e); }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('zetpepeUser');
    currentUser = null;
    showScreen('login');
});

// === 7. OBSŁUGA PULPITU I KALENDARZA ===
async function showDashboard() {
    showScreen('dashboard');
    welcomeUsername.innerText = currentUser.name || currentUser.id;
    await renderCalendar();
}

prevMonthBtn.addEventListener('click', async () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    await renderCalendar();
});

nextMonthBtn.addEventListener('click', async () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    await renderCalendar();
});

async function renderCalendar() {
    daysGrid.innerHTML = "<div style='grid-column: 1/-1; text-align: center; padding: 20px;'>Ładowanie danych...</div>";

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
    currentMonthDisplay.innerText = `${monthNames[month]} ${year}`;

    monthDaysData = {};
    allDaysData = {};
    try {
        const daysRef = collection(db, "users", currentUser.id, "days");
        const querySnapshot = await getDocs(daysRef);
        querySnapshot.forEach(docSnap => {
            const dateId = docSnap.id;
            const data = docSnap.data();
            allDaysData[dateId] = data;
            if (dateId.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) {
                monthDaysData[dateId] = data;
            }
        });
    } catch (e) { console.error("Błąd pobierania kalendarza:", e); }

    daysGrid.innerHTML = "";

    const firstDayIndex = new Date(year, month, 1).getDay();
    const paddingDays = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < paddingDays; i++) {
        const emptyCard = document.createElement('div');
        emptyCard.classList.add('day-card', 'outside-month');
        daysGrid.appendChild(emptyCard);
    }

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    for (let day = 1; day <= totalDaysInMonth; day++) {
        const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = monthDaysData[dayString] || {};
        const thisDayDate = new Date(year, month, day);

        const card = document.createElement('div');
        card.classList.add('day-card');

        if (dayData.color) card.classList.add(`status-${dayData.color}`);

        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        const isFuture = thisDayDate > todayMidnight;

        let eventsList = [];
        if (Array.isArray(dayData.events)) {
            eventsList = dayData.events;
        } else if (dayData.event) {
            eventsList = [dayData.event];
        } else if (dayData.habits) {
            if (dayData.habits.bike) eventsList.push('bike');
            if (dayData.habits.donut) eventsList.push('donut');
            if (dayData.habits.alcohol) eventsList.push('alcohol');
        }

        let iconsDesktopHtml = "";
        eventsList.forEach(ev => {
            if (EVENT_ICONS[ev]) iconsDesktopHtml += `<span>${EVENT_ICONS[ev]}</span>`;
        });

        const hasAnyEvents = eventsList.length > 0;
        const iconsMobileHtml = hasAnyEvents ? `<span class="mobile-alert-icon">❗</span>` : ``;

        card.innerHTML = `
            <div class="card-header">
                <span class="day-number">${day}</span>
                ${isToday ? '<span class="today-badge">Dziś</span>' : ''}
            </div>
            <div class="weight-display">
                ${dayData.weight ? `${dayData.weight}` : '<span style="opacity:0.3;">--.-</span>'}
            </div>
            <div class="icons-container">
                <div class="icons-desktop">${iconsDesktopHtml}</div>
                <div class="icons-mobile">${iconsMobileHtml}</div>
            </div>
        `;

        if (isFuture) {
            card.classList.add('future-day');
        } else {
            card.addEventListener('click', () => openModal(dayString, dayData));
        }

        daysGrid.appendChild(card);
    }
}

// === 8. OBSŁUGA MODALA EDYCJI DNIA ===
function openModal(dateStr, data) {
    selectedDateStr = dateStr;
    modalDateDisplay.innerText = dateStr;

    weightInput.value = data.weight || '';

    let activeEvents = [];
    if (Array.isArray(data.events)) {
        activeEvents = data.events;
    } else if (data.event) {
        activeEvents = [data.event];
    } else if (data.habits) {
        if (data.habits.bike) activeEvents.push('bike');
        if (data.habits.donut) activeEvents.push('donut');
        if (data.habits.alcohol) activeEvents.push('alcohol');
    }

    const checkboxes = eventsDropdown.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = activeEvents.includes(cb.value);
    });
    updateMultiSelectTriggerText();
    eventsDropdown.classList.add('hidden');

    const colorRadios = document.getElementsByName('day-color');
    colorRadios.forEach(r => {
        const isChecked = (r.value === data.color);
        r.checked = isChecked;
        r.dataset.waschecked = isChecked ? "true" : "false";
    });

    editModal.classList.remove('hidden');
}

closeModalBtn.onclick = () => editModal.classList.add('hidden');
cancelModalBtn.onclick = () => editModal.classList.add('hidden');

saveDayBtn.addEventListener('click', async () => {
    if (!selectedDateStr) return;

    let weightVal = parseFloat(weightInput.value);

    if (!isNaN(weightVal)) {
        if (weightVal > 150) {
            alert("Maksymalna dozwolona waga to 150 kg!");
            return;
        }
        if (weightVal < 0) weightVal = 0;
        weightVal = Math.round(weightVal * 10) / 10;
    } else {
        weightVal = null;
    }

    const selectedEvents = Array.from(eventsDropdown.querySelectorAll('input[type="checkbox"]:checked'))
        .map(cb => cb.value);

    let selectedColor = "";
    const colorRadios = document.getElementsByName('day-color');
    colorRadios.forEach(r => { if (r.checked) selectedColor = r.value; });

    const payload = {
        weight: weightVal,
        color: selectedColor,
        events: selectedEvents,
        event: selectedEvents[0] || "",
        habits: {
            bike: selectedEvents.includes('bike'),
            donut: selectedEvents.includes('donut'),
            alcohol: selectedEvents.includes('alcohol')
        },
        updatedAt: new Date().toISOString()
    };

    try {
        const dayRef = doc(db, "users", currentUser.id, "days", selectedDateStr);
        await setDoc(dayRef, payload, { merge: true });

        editModal.classList.add('hidden');
        await renderCalendar();
    } catch (e) {
        console.error("Błąd zapisu dnia:", e);
        alert("Błąd zapisu danych!");
    }
});

// === 9. OBSŁUGA MODALA POSTANOWIENIA ===
resolutionsToggleBtn.addEventListener('click', async () => {
    await fetchResolutions();
    renderResolutionsList();
    resolutionsModal.classList.remove('hidden');
});

closeResolutionsBtn.onclick = () => resolutionsModal.classList.add('hidden');

async function fetchResolutions() {
    try {
        const userRef = doc(db, "users", currentUser.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().resolutions) {
            currentResolutions = userSnap.data().resolutions;
        } else {
            currentResolutions = ["Zero słodyczy", "Zero alkoholu", "Codzienne pomiary wagi"];
        }
    } catch (e) {
        console.error("Błąd pobierania postanowień:", e);
    }
}

function renderResolutionsList() {
    resolutionsListEl.innerHTML = "";
    currentResolutions.forEach((resText, index) => {
        const li = document.createElement('li');
        li.className = 'resolution-item';
        li.innerHTML = `
            <input type="text" value="${resText}" data-index="${index}" class="res-text-input">
            <button class="delete-res-btn" data-index="${index}"><i class="fa-solid fa-trash"></i></button>
        `;
        resolutionsListEl.appendChild(li);
    });

    document.querySelectorAll('.res-text-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = e.target.getAttribute('data-index');
            currentResolutions[idx] = e.target.value;
        });
    });

    document.querySelectorAll('.delete-res-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.currentTarget.getAttribute('data-index');
            currentResolutions.splice(idx, 1);
            renderResolutionsList();
        });
    });
}

addResolutionBtn.addEventListener('click', () => {
    const val = newResolutionInput.value.trim();
    if (val) {
        currentResolutions.push(val);
        newResolutionInput.value = "";
        renderResolutionsList();
    }
});

saveResolutionsBtn.addEventListener('click', async () => {
    try {
        const cleanResolutions = currentResolutions.map(r => r.trim()).filter(r => r.length > 0);
        const userRef = doc(db, "users", currentUser.id);
        await updateDoc(userRef, { resolutions: cleanResolutions });
        currentUser.resolutions = cleanResolutions;
        localStorage.setItem('zetpepeUser', JSON.stringify(currentUser));
        resolutionsModal.classList.add('hidden');
    } catch (e) {
        console.error("Błąd zapisu postanowień:", e);
        alert("Wystąpił błąd podczas zapisu postanowień!");
    }
});

// === 10. OBSŁUGA MODALA STATYSTYKI ===
statsToggleBtn.addEventListener('click', async () => {
    await loadStatsData();
    statsModal.classList.remove('hidden');
});

closeStatsBtn.onclick = () => statsModal.classList.add('hidden');

async function loadStatsData() {
    let startWeight = currentUser.startWeight || 90;
    let targetWeight = currentUser.targetWeight || 80;

    startWeightInput.value = startWeight;
    targetWeightSlider.value = targetWeight;
    targetWeightVal.innerText = targetWeight;

    updateStatsCalculations();
}

targetWeightSlider.addEventListener('input', (e) => {
    targetWeightVal.innerText = e.target.value;
    updateStatsCalculations();
});

startWeightInput.addEventListener('input', () => {
    updateStatsCalculations();
});

function updateStatsCalculations() {
    const startW = parseFloat(startWeightInput.value) || 0;
    const targetW = parseFloat(targetWeightSlider.value) || 0;

    const sortedDates = Object.keys(allDaysData)
        .filter(d => allDaysData[d].weight !== null && allDaysData[d].weight !== undefined)
        .sort();

    let latestWeight = startW;
    if (sortedDates.length > 0) {
        latestWeight = allDaysData[sortedDates[sortedDates.length - 1]].weight;
    }

    let progressPercent = 0;
    const totalToLose = startW - targetW;
    const lostSoFar = startW - latestWeight;

    if (totalToLose > 0) {
        progressPercent = Math.min(100, Math.max(0, (lostSoFar / totalToLose) * 100));
    }
    progressBarFill.style.width = `${progressPercent.toFixed(1)}%`;
    progressPercentText.innerText = `${progressPercent.toFixed(1)}%`;

    const totalDiff = latestWeight - startW;
    const totalDiffStr = (totalDiff > 0 ? `+${totalDiff.toFixed(1)}` : `${totalDiff.toFixed(1)}`) + " kg";
    statTotalDiff.innerText = totalDiffStr;
    statTotalDiff.style.color = totalDiff <= 0 ? "#10b981" : "#ef4444";

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const monthDates = sortedDates.filter(d => d.startsWith(`${year}-${month}`));

    if (monthDates.length >= 2) {
        const firstMonthW = allDaysData[monthDates[0]].weight;
        const lastMonthW = allDaysData[monthDates[monthDates.length - 1]].weight;
        const monthDiff = lastMonthW - firstMonthW;
        const monthDiffStr = (monthDiff > 0 ? `+${monthDiff.toFixed(1)}` : `${monthDiff.toFixed(1)}`) + " kg";
        statMonthDiff.innerText = monthDiffStr;
        statMonthDiff.style.color = monthDiff <= 0 ? "#10b981" : "#ef4444";
    } else if (monthDates.length === 1) {
        statMonthDiff.innerText = "0.0 kg";
        statMonthDiff.style.color = "var(--text-primary)";
    } else {
        statMonthDiff.innerText = "-- kg";
        statMonthDiff.style.color = "var(--text-secondary)";
    }
}

saveStatsBtn.addEventListener('click', async () => {
    const startW = parseFloat(startWeightInput.value);
    const targetW = parseFloat(targetWeightSlider.value);

    try {
        const userRef = doc(db, "users", currentUser.id);
        await updateDoc(userRef, {
            startWeight: startW,
            targetWeight: targetW
        });
        currentUser.startWeight = startW;
        currentUser.targetWeight = targetW;
        localStorage.setItem('zetpepeUser', JSON.stringify(currentUser));
        statsModal.classList.add('hidden');
    } catch (e) {
        console.error("Błąd zapisu statystyk:", e);
        alert("Nie udało się zapisać ustawień statystyk!");
    }
});