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

// Modal
const editModal = document.getElementById('edit-modal');
const modalDateDisplay = document.getElementById('modal-date-display');
const weightInput = document.getElementById('weight-input');
const btnHabitBike = document.getElementById('btn-habit-bike');
const btnHabitDonut = document.getElementById('btn-habit-donut');
const btnHabitAlcohol = document.getElementById('btn-habit-alcohol');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');
const saveDayBtn = document.getElementById('save-day-btn');

// === 3. STAN APLIKACJI ===
let currentUser = null;
let currentDate = new Date();
let selectedDateStr = null; 
let monthDaysData = {}; 

// Przełączanie pełnych ekranów (Login / PIN / Kalendarz)
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

// === 5. OBSŁUGA LOGOWANIA I PINU ===
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

// === 6. OBSŁUGA PULPITU I KALENDARZA ===
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
    try {
        const daysRef = collection(db, "users", currentUser.id, "days");
        const querySnapshot = await getDocs(daysRef);
        querySnapshot.forEach(docSnap => {
            monthDaysData[docSnap.id] = docSnap.data();
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
    for (let day = 1; day <= totalDaysInMonth; day++) {
        const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = monthDaysData[dayString] || {};

        const card = document.createElement('div');
        card.classList.add('day-card');

        if (dayData.color) card.classList.add(`status-${dayData.color}`);

        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

        let iconsHtml = "";
        if (dayData.habits) {
            if (dayData.habits.bike) iconsHtml += `<span>🚴</span>`;
            if (dayData.habits.donut) iconsHtml += `<span>🍩</span>`;
            if (dayData.habits.alcohol) iconsHtml += `<span>🍺</span>`;
        }

        card.innerHTML = `
            <div class="card-header">
                <span class="day-number">${day}</span>
                ${isToday ? '<span class="today-badge">Dziś</span>' : ''}
            </div>
            <div class="weight-display">
                ${dayData.weight ? `${dayData.weight} <small>kg</small>` : '<span style="opacity:0.3;">--.-</span>'}
            </div>
            <div class="icons-container">
                ${iconsHtml}
            </div>
        `;

        card.addEventListener('click', () => openModal(dayString, dayData));
        daysGrid.appendChild(card);
    }
}

// === 7. OBSŁUGA MODALA EDYCJI DNIA ===
function openModal(dateStr, data) {
    selectedDateStr = dateStr;
    modalDateDisplay.innerText = dateStr;

    weightInput.value = data.weight || '';

    setHabitState(btnHabitBike, data.habits?.bike || false);
    setHabitState(btnHabitDonut, data.habits?.donut || false);
    setHabitState(btnHabitAlcohol, data.habits?.alcohol || false);

    const colorRadios = document.getElementsByName('day-color');
    colorRadios.forEach(r => {
        r.checked = (r.value === data.color);
    });

    editModal.classList.remove('hidden');
}

function setHabitState(btn, state) {
    btn.setAttribute('data-active', state ? "true" : "false");
}

[btnHabitBike, btnHabitDonut, btnHabitAlcohol].forEach(btn => {
    btn.addEventListener('click', () => {
        const curr = btn.getAttribute('data-active') === "true";
        btn.setAttribute('data-active', !curr ? "true" : "false");
    });
});

closeModalBtn.onclick = () => editModal.classList.add('hidden');
cancelModalBtn.onclick = () => editModal.classList.add('hidden');

saveDayBtn.addEventListener('click', async () => {
    if (!selectedDateStr) return;

    const weightVal = parseFloat(weightInput.value);
    const bikeVal = btnHabitBike.getAttribute('data-active') === "true";
    const donutVal = btnHabitDonut.getAttribute('data-active') === "true";
    const alcoholVal = btnHabitAlcohol.getAttribute('data-active') === "true";

    let selectedColor = "";
    const colorRadios = document.getElementsByName('day-color');
    colorRadios.forEach(r => { if (r.checked) selectedColor = r.value; });

    const payload = {
        weight: !isNaN(weightVal) ? weightVal : null,
        color: selectedColor,
        habits: {
            bike: bikeVal,
            donut: donutVal,
            alcohol: alcoholVal
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