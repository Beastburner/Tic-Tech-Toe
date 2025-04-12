// Authentication state
let currentUser = null;
let authToken = null;

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
    document.getElementById('registerModal').style.display = 'none';
}

function showRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
    document.getElementById('loginModal').style.display = 'none';
}

// Budget App State
const state = {
    currentBudget: null,
    budgets: [],
    transactions: [],
    categories: {
        income: ['Salary', 'Business', 'Investments', 'Rental', 'Freelance'],
        expense: ['Rent', 'Groceries', 'Transport', 'Bills', 'EMIs', 'Education', 'Medical']
    }
};

// DOM Elements
const elements = {
    incomeTotal: document.getElementById('incomeTotal'),
    expenseTotal: document.getElementById('expenseTotal'),
    remainingTotal: document.getElementById('remainingTotal'),
    incomeCategories: document.getElementById('incomeCategories'),
    expenseCategories: document.getElementById('expenseCategories'),
    transactionList: document.getElementById('transactionList'),
    transactionModal: document.getElementById('transactionModal'),
    transactionForm: document.getElementById('transactionForm'),
    transactionType: document.getElementById('transactionType'),
    transactionCategory: document.getElementById('transactionCategory'),
    transactionAmount: document.getElementById('transactionAmount'),
    transactionDate: document.getElementById('transactionDate'),
    transactionDescription: document.getElementById('transactionDescription'),
    addTransactionBtn: document.getElementById('addTransactionBtn'),
    reportChart: document.getElementById('reportChart')
};

// Initialize budget page
function initBudgetPage() {
    if (!state.currentBudget) return;
    
    const incomeTotal = calculateTotal(state.currentBudget.income);
    const expenseTotal = calculateTotal(state.currentBudget.expenses);
    const remainingTotal = incomeTotal - expenseTotal;

    document.getElementById('budgetIncomeTotal').textContent = formatCurrency(incomeTotal);
    document.getElementById('budgetExpenseTotal').textContent = formatCurrency(expenseTotal);
    document.getElementById('budgetRemainingTotal').textContent = formatCurrency(remainingTotal);

    // Render income categories
    renderBudgetCategories('income', state.currentBudget.income);
    
    // Render expense categories
    renderBudgetCategories('expense', state.currentBudget.expenses);
}

function renderBudgetCategories(type, categories) {
    const container = document.getElementById('budgetDetailsList');
    const section = document.createElement('div');
    section.className = 'budget-section';
    section.innerHTML = `<h3>${type.charAt(0).toUpperCase() + type.slice(1)} Categories</h3>`;
    
    Object.entries(categories).forEach(([name, amount]) => {
        const categoryElement = document.createElement('div');
        categoryElement.className = 'category-item';
        categoryElement.innerHTML = `
            <div class="category-name">${name}</div>
            <div class="category-amount">${formatCurrency(amount)}</div>
        `;
        section.appendChild(categoryElement);
    });
    
    container.appendChild(section);
}

// Initialize the app
function init() {
    // Load any saved data from localStorage
    loadData();
    
    // Set up event listeners
    setupEventListeners();
    
    // Create a new budget if none exists
    if (!state.currentBudget) {
        createNewBudget();
    } else {
        renderBudget();
    }
    
    // Set default date to today
    elements.transactionDate.valueAsDate = new Date();
}

// Load data from localStorage
function loadData() {
    const savedData = localStorage.getItem('everydollarData');
    if (savedData) {
        const data = JSON.parse(savedData);
        state.budgets = data.budgets || [];
        state.transactions = data.transactions || [];
        state.categories = data.categories || {
            income: ['Salary', 'Business', 'Investments', 'Rental', 'Freelance'],
            expense: ['Rent', 'Groceries', 'Transport', 'Bills', 'EMIs', 'Education', 'Medical']
        };
        
        // Set current budget to the first one or create new
        state.currentBudget = state.budgets.length > 0 ? state.budgets[0] : null;
    }
}

// Save data to localStorage
function saveData() {
    const data = {
        budgets: state.budgets,
        transactions: state.transactions,
        categories: state.categories
    };
    localStorage.setItem('everydollarData', JSON.stringify(data));
}

// Set up event listeners
function setupEventListeners() {
    // Add transaction button
    elements.addTransactionBtn.addEventListener('click', () => {
        openTransactionModal();
    });

    // Get savings suggestions button
    document.getElementById('getSuggestionsBtn').addEventListener('click', () => {
        fetchSavingsSuggestions();
    });
    
    // Transaction form submission
    elements.transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addTransaction();
    });
    
    // Transaction type change
    elements.transactionType.addEventListener('change', () => {
        updateCategoryOptions();
    });
    
    // Close modal when clicking X
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            closeTransactionModal();
        });
    });
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    }
}

// Create a new budget
function createNewBudget() {
    const newBudget = {
        id: Date.now(),
        name: 'Monthly Budget',
        income: {},
        expenses: {},
        createdAt: new Date().toISOString()
    };
    
    // Initialize with default categories
    state.categories.income.forEach(category => {
        newBudget.income[category] = 0;
    });
    
    state.categories.expense.forEach(category => {
        newBudget.expenses[category] = 0;
    });
    
    state.currentBudget = newBudget;
    state.budgets.push(newBudget);
    saveData();
    renderBudget();
}

// Render the budget
function renderBudget() {
    if (!state.currentBudget) return;
    
    // Calculate totals
    const incomeTotal = calculateTotal(state.currentBudget.income);
    const expenseTotal = calculateTotal(state.currentBudget.expenses);
    const remainingTotal = incomeTotal - expenseTotal;
    
    // Update totals display
    elements.incomeTotal.textContent = formatCurrency(incomeTotal);
    elements.expenseTotal.textContent = formatCurrency(expenseTotal);
    elements.remainingTotal.textContent = formatCurrency(remainingTotal);
    
    // Render income categories
    renderCategories('income', state.currentBudget.income);
    
    // Render expense categories
    renderCategories('expense', state.currentBudget.expenses);
    
    // Render transactions
    renderTransactions();
    
    // Render reports
    renderReports();
    
    // Update pie charts
    if (document.getElementById('incomeChart')) {
        updateCharts();
    }
}

// Render categories
function renderCategories(type, categories) {
    const container = type === 'income' ? elements.incomeCategories : elements.expenseCategories;
    container.innerHTML = '';
    
    Object.entries(categories).forEach(([name, amount]) => {
        const categoryElement = document.createElement('div');
        categoryElement.className = 'category-item';
        categoryElement.innerHTML = `
            <div class="category-name">${name}</div>
            <div class="category-amount">
                <input type="number" value="${amount}" data-category="${name}" data-type="${type}" step="0.01">
            </div>
        `;
        container.appendChild(categoryElement);
    });
    
    // Add event listeners to category inputs
    container.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', (e) => {
            updateCategoryAmount(
                e.target.dataset.type,
                e.target.dataset.category,
                parseFloat(e.target.value) || 0
            );
        });
    });
}

// Update category amount
function updateCategoryAmount(type, category, amount) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
        console.error('Invalid amount:', amount);
        return;
    }

    if (type === 'income') {
        state.currentBudget.income[category] = numAmount;
    } else {
        state.currentBudget.expenses[category] = numAmount;
    }
    saveData();
    renderBudget();
    updateCharts();
}

// Calculate total for a category group with validation
function calculateTotal(categories) {
    if (!categories || typeof categories !== 'object') {
        console.error('Invalid categories data');
        return 0;
    }
    return Object.values(categories).reduce((sum, amount) => {
        const num = parseFloat(amount) || 0;
        return sum + num;
    }, 0);
}

// Format currency (Indian Rupees)
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Transaction functions
function openTransactionModal() {
    updateCategoryOptions();
    elements.transactionModal.style.display = 'flex';
}

function closeTransactionModal() {
    elements.transactionModal.style.display = 'none';
    elements.transactionForm.reset();
    elements.transactionDate.valueAsDate = new Date();
}

function updateCategoryOptions() {
    const type = elements.transactionType.value;
    elements.transactionCategory.innerHTML = '';
    
    const categories = type === 'income' ? state.categories.income : state.categories.expense;
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        elements.transactionCategory.appendChild(option);
    });
}

function addTransaction() {
    const transaction = {
        id: Date.now(),
        type: elements.transactionType.value,
        category: elements.transactionCategory.value,
        amount: parseFloat(elements.transactionAmount.value),
        date: elements.transactionDate.value,
        description: elements.transactionDescription.value,
        createdAt: new Date().toISOString()
    };
    
    state.transactions.push(transaction);
    saveData();
    closeTransactionModal();
    renderBudget();
}

function renderTransactions() {
    elements.transactionList.innerHTML = '';
    
    // Sort transactions by date (newest first)
    const sortedTransactions = [...state.transactions].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    sortedTransactions.forEach(transaction => {
        const transactionElement = document.createElement('div');
        transactionElement.className = 'transaction-item';
        transactionElement.innerHTML = `
            <div class="transaction-date">${formatDate(transaction.date)}</div>
            <div class="transaction-description">${transaction.description || 'No description'}</div>
            <div class="transaction-category">${transaction.category}</div>
            <div class="transaction-amount ${transaction.type}">
                ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
            </div>
            <div class="transaction-actions">
                <button data-id="${transaction.id}">✕</button>
            </div>
        `;
        elements.transactionList.appendChild(transactionElement);
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.transaction-actions button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            deleteTransaction(parseInt(e.target.dataset.id));
        });
    });
}

function deleteTransaction(id) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveData();
    renderBudget();
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Report functions
let chartInstance = null;

function renderReports() {
    // Group transactions by category
    const incomeData = groupTransactionsByCategory('income');
    const expenseData = groupTransactionsByCategory('expense');
    
    // Prepare data for chart
    const labels = [...new Set([...Object.keys(incomeData), ...Object.keys(expenseData)])];
    const incomeValues = labels.map(label => incomeData[label] || 0);
    const expenseValues = labels.map(label => expenseData[label] || 0);
    
    // Create or update chart
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    const ctx = elements.reportChart.getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeValues,
                    backgroundColor: '#2ecc71',
                    borderColor: '#27ae60',
                    borderWidth: 1
                },
                {
                    label: 'Expenses',
                    data: expenseValues,
                    backgroundColor: '#e74c3c',
                    borderColor: '#c0392b',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function groupTransactionsByCategory(type) {
    const filtered = state.transactions.filter(t => t.type === type);
    return filtered.reduce((groups, transaction) => {
        if (!groups[transaction.category]) {
            groups[transaction.category] = 0;
        }
        groups[transaction.category] += transaction.amount;
        return groups;
    }, {});
}

// Get auth token from localStorage
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Add auth token to fetch headers
function getAuthHeaders() {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Add auth token to all fetch requests
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
    const token = localStorage.getItem('authToken');
    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    }
    return originalFetch(url, options);
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            const errorElement = document.getElementById('loginError');

            try {
                const response = await fetch('http://127.0.0.1:5000/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Login failed');
                }

                // Store auth token and set current user
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('currentUser', username);
                currentUser = username;
                authToken = data.token;
                
                // Update UI to show logout button
                updateAuthUI();
                
                // Redirect to dashboard
                window.location.href = '/dashboard';
            } catch (error) {
                console.error('Login error:', error);
                errorElement.textContent = error.message || 'An error occurred during login';
                errorElement.style.display = 'block';
            }
        });
    }

    // Register form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('registerUsername').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const errorElement = document.getElementById('registerError');

            // Clear any previous error messages
            errorElement.textContent = '';
            errorElement.style.display = 'none';

            // Validate form fields
            if (!username || !password || !confirmPassword) {
                errorElement.textContent = 'All fields are required';
                errorElement.style.display = 'block';
                return;
            }

            if (password !== confirmPassword) {
                errorElement.textContent = 'Passwords do not match';
                errorElement.style.display = 'block';
                return;
            }

            try {
                const response = await fetch('http://127.0.0.1:5000/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ 
                        username: username,
                        password: password,
                        confirmPassword: confirmPassword
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Registration failed');
                }

                // Store auth token and user info
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('currentUser', username);
                currentUser = username;
                authToken = data.token;
                
                // Update UI
                updateAuthUI();
                
                // Close modal and redirect to dashboard
                closeModal('registerModal');
                window.location.href = '/dashboard';
            } catch (error) {
                console.error('Registration error:', error);
                errorElement.textContent = error.message || 'An error occurred during registration';
                errorElement.style.display = 'block';
            }
        });
    }

    // Check if user is already logged in
    const storedUser = localStorage.getItem('currentUser');
    const storedToken = localStorage.getItem('authToken');
    
    if (storedUser && storedToken) {
        currentUser = JSON.parse(storedUser);
        authToken = storedToken;
    }
    
    updateAuthUI();

    // Setup sidebar functionality
    const sidebarTrigger = document.querySelector('.sidebar-trigger');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('main');

    if (sidebarTrigger && sidebar) {
        sidebarTrigger.addEventListener('click', () => {
            toggleSidebar();
        });
    }
});

// Setup income and expense pie charts
let incomeChart, expenseChart;

function setupCharts() {
    if (!document.getElementById('incomeChart')) return;
    
    const incomeCtx = document.getElementById('incomeChart').getContext('2d');
    const expenseCtx = document.getElementById('expenseChart').getContext('2d');
    
    // Initialize charts with current budget data
    updateCharts();
}

function updateCharts() {
    if (!state.currentBudget) return;
    
    // Income chart data
    const incomeLabels = Object.keys(state.currentBudget.income);
    const incomeData = Object.values(state.currentBudget.income);
    const incomeColors = generateColors(incomeLabels.length, '#2ecc71', 0.7);
    
    // Expense chart data
    const expenseLabels = Object.keys(state.currentBudget.expenses);
    const expenseData = Object.values(state.currentBudget.expenses);
    const expenseColors = generateColors(expenseLabels.length, '#e74c3c', 0.7);
    
    // Create or update income chart
    const incomeCtx = document.getElementById('incomeChart').getContext('2d');
    if (incomeChart) {
        incomeChart.destroy();
    }
    incomeChart = new Chart(incomeCtx, {
        type: 'pie',
        data: {
            labels: incomeLabels,
            datasets: [{
                data: incomeData,
                backgroundColor: incomeColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            }
        }
    });
    
    // Create or update expense chart
    const expenseCtx = document.getElementById('expenseChart').getContext('2d');
    if (expenseChart) {
        expenseChart.destroy();
    }
    expenseChart = new Chart(expenseCtx, {
        type: 'pie',
        data: {
            labels: expenseLabels,
            datasets: [{
                data: expenseData,
                backgroundColor: expenseColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            }
        }
    });
    
    // Fetch savings suggestions
    fetchSavingsSuggestions();
}

function generateColors(count, baseColor, opacity) {
    const colors = [];
    const base = hexToRgb(baseColor);
    for (let i = 0; i < count; i++) {
        const factor = 0.8 + (Math.random() * 0.4);
        colors.push(
            `rgba(${Math.floor(base.r * factor)}, ${Math.floor(base.g * factor)}, ${Math.floor(base.b * factor)}, ${opacity})`
        );
    }
    return colors;
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : {r: 0, g: 0, b: 0};
}

async function fetchSavingsSuggestions() {
    const suggestionsDiv = document.getElementById('savingsSuggestions');
    suggestionsDiv.innerHTML = '<div class="suggestion-card loading"><p>Loading suggestions...</p></div>';
    
    try {
        const incomeTotal = calculateTotal(state.currentBudget.income);
        const expenseTotal = calculateTotal(state.currentBudget.expenses);
        
        if (incomeTotal === 0) {
            throw new Error('No income data available');
        }
        
        const response = await fetch('/suggestions', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                income: incomeTotal,
                expenses: expenseTotal
            })
        });
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        suggestionsDiv.innerHTML = `
            <div class="suggestion-card">
                <h3>Savings Advice</h3>
                <p>${data.suggestion}</p>
                <p>Current Savings Rate: ${((incomeTotal - expenseTotal) / incomeTotal * 100).toFixed(1)}%</p>
            </div>
        `;
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        suggestionsDiv.innerHTML = `
            <div class="suggestion-card error">
                <p>${error.message || 'Could not load savings suggestions'}</p>
            </div>
        `;
    }
}

// Add blinking cursor animation
const cursor = document.querySelector('.blinking-cursor');
if (cursor) {
    setInterval(() => {
        cursor.style.opacity = cursor.style.opacity === '0' ? '1' : '0';
    }, 500);
}

// Add scroll animation for feature cards
const featureCards = document.querySelectorAll('.feature-card');
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
        }
    });
}, observerOptions);

featureCards.forEach(card => {
    observer.observe(card);
});

// Sidebar functionality
const sidebar = document.querySelector('.sidebar');
const sidebarTrigger = document.querySelector('.sidebar-trigger');
const main = document.querySelector('main');

function toggleSidebar() {
    sidebar.classList.toggle('visible');
    main.classList.toggle('sidebar-visible');
}

function updateSidebarUI(isLoggedIn) {
    if (isLoggedIn) {
        sidebar.style.display = 'flex';
        sidebarTrigger.style.display = 'flex';
        
        // Update user info in sidebar
        const user = JSON.parse(localStorage.getItem('currentUser'));
        if (user) {
            const userNameElement = document.querySelector('.sidebar-user-name');
            const userEmailElement = document.querySelector('.sidebar-user-email');
            const userAvatarElement = document.querySelector('.sidebar-user-avatar');
            
            if (userNameElement) userNameElement.textContent = user.name || 'User';
            if (userEmailElement) userEmailElement.textContent = user.email;
            if (userAvatarElement) userAvatarElement.textContent = (user.name || 'U')[0].toUpperCase();
        }
    } else {
        sidebar.style.display = 'none';
        sidebarTrigger.style.display = 'none';
        sidebar.classList.remove('visible');
        main.classList.remove('sidebar-visible');
    }
}

// Update the existing updateAuthUI function
function updateAuthUI() {
    const isLoggedIn = localStorage.getItem('token') !== null;
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (isLoggedIn) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (registerBtn) registerBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }

    updateSidebarUI(isLoggedIn);
}

// Event listeners
if (sidebarTrigger) {
    sidebarTrigger.addEventListener('click', toggleSidebar);
}

// Close sidebar when clicking outside
document.addEventListener('click', (e) => {
    if (sidebar && sidebar.classList.contains('visible')) {
        const isClickInside = sidebar.contains(e.target) || sidebarTrigger.contains(e.target);
        if (!isClickInside) {
            toggleSidebar();
        }
    }
});

// Update sidebar state on page load
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
});

// Function to handle logout
function logout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    updateAuthUI();
    // Clear any user-specific data
    clearUserData();
    // Redirect to home page
    window.location.href = '/';
}

// Function to clear user-specific data
function clearUserData() {
    // Clear any user-specific data from the UI
    const expenseList = document.getElementById('expenseList');
    if (expenseList) {
        expenseList.innerHTML = '';
    }
    // Reset any other user-specific UI elements
    resetDashboard();
}

// Function to reset dashboard data
function resetDashboard() {
    // Reset dashboard charts and data
    if (window.incomeChart) {
        window.incomeChart.destroy();
    }
    if (window.expenseChart) {
        window.expenseChart.destroy();
    }
    if (window.analyticsChart) {
        window.analyticsChart.destroy();
    }
    // Clear transaction list
    const transactionList = document.getElementById('transactionList');
    if (transactionList) {
        transactionList.innerHTML = '';
    }
    // Reset suggestions
    const suggestionsDiv = document.getElementById('savingsSuggestions');
    if (suggestionsDiv) {
        suggestionsDiv.innerHTML = '';
    }
}

// Function to fetch and display user dashboard data
async function fetchDashboardData() {
    try {
        const response = await fetch('/api/dashboard', {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
        }

        const data = await response.json();
        updateDashboardUI(data);
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    }
}

// Function to update dashboard UI with fetched data
function updateDashboardUI(data) {
    // Update transaction list
    updateTransactionList(data.transactions);
    
    // Update charts
    updateCharts(data.analytics);
    
    // Update suggestions
    updateSuggestions(data.suggestions);
}

// Function to update transaction list
function updateTransactionList(transactions) {
    const transactionList = document.getElementById('transactionList');
    if (!transactionList) return;

    transactionList.innerHTML = transactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-date">${formatDate(transaction.date)}</div>
            <div class="transaction-description">${transaction.description}</div>
            <div class="transaction-category">${transaction.category}</div>
            <div class="transaction-amount ${transaction.type}">
                ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
            </div>
        </div>
    `).join('');
}

// Function to update charts
function updateCharts(analytics) {
    // Update income chart
    if (document.getElementById('incomeChart')) {
        updateIncomeChart(analytics.income);
    }
    
    // Update expense chart
    if (document.getElementById('expenseChart')) {
        updateExpenseChart(analytics.expenses);
    }
    
    // Update analytics chart
    if (document.getElementById('analyticsChart')) {
        updateAnalyticsChart(analytics.trends);
    }
}

// Function to update suggestions
function updateSuggestions(suggestions) {
    const suggestionsDiv = document.getElementById('savingsSuggestions');
    if (!suggestionsDiv) return;

    suggestionsDiv.innerHTML = suggestions.map(suggestion => `
        <div class="suggestion-card">
            <h3>${suggestion.title}</h3>
            <p>${suggestion.description}</p>
            <div class="suggestion-progress">
                <div class="progress-bar" style="width: ${suggestion.progress}%"></div>
            </div>
        </div>
    `).join('');
}

// Helper function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Helper function to format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
