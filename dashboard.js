// Dashboard State Management
let transactions = [];
let currentUser = null;

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Check for authentication
    const token = localStorage.getItem('token');
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!token || !currentUser) {
        window.location.href = '/';
        return;
    }

    // Initialize components
    initializeDashboard();
    loadTransactions();
    setupEventListeners();
});

// Dashboard Initialization
async function initializeDashboard() {
    updateUserInfo();
    await loadTransactions();
    await loadAnalytics();
    setupEventListeners();
}

// Update User Information
function updateUserInfo() {
    const userNameElements = document.querySelectorAll('.sidebar-user-name');
    const userEmailElements = document.querySelectorAll('.sidebar-user-email');
    const userAvatarElements = document.querySelectorAll('.sidebar-user-avatar');

    userNameElements.forEach(el => el.textContent = currentUser.username || 'User');
    userEmailElements.forEach(el => el.textContent = currentUser.email || `${currentUser.username}@example.com`);
    userAvatarElements.forEach(el => el.textContent = (currentUser.username[0] || 'U').toUpperCase());
}

// Transaction Management
async function loadTransactions() {
    try {
        const response = await fetch('/api/transactions', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load transactions');
        
        transactions = await response.json();
        updateDashboardSummary();
        updateTransactionsList();
        updateCharts();
    } catch (error) {
        console.error('Error loading transactions:', error);
        showNotification('Error loading transactions', 'error');
    }
}

async function addTransaction(transactionData) {
    try {
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(transactionData)
        });

        if (!response.ok) throw new Error('Failed to add transaction');

        const newTransaction = await response.json();
        transactions.push(newTransaction);
        
        updateDashboardSummary();
        updateTransactionsList();
        updateCharts();
        showNotification('Transaction added successfully', 'success');
    } catch (error) {
        console.error('Error adding transaction:', error);
        showNotification('Error adding transaction', 'error');
    }
}

// Load Analytics Data
async function loadAnalytics() {
    try {
        const response = await fetch('/api/analytics', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load analytics');
        
        const data = await response.json();
        updateDashboardSummary(data.summary);
        updateCharts(data);
    } catch (error) {
        console.error('Error loading analytics:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

// Update Dashboard Summary
function updateDashboardSummary(summary) {
    document.getElementById('totalIncome').textContent = formatCurrency(summary.income);
    document.getElementById('totalExpenses').textContent = formatCurrency(summary.expenses);
    document.getElementById('netBalance').textContent = formatCurrency(summary.balance);
    
    // Also update the budget page if it exists
    if (document.getElementById('budgetIncomeTotal')) {
        document.getElementById('budgetIncomeTotal').textContent = formatCurrency(summary.income);
        document.getElementById('budgetExpenseTotal').textContent = formatCurrency(summary.expenses);
        document.getElementById('budgetRemainingTotal').textContent = formatCurrency(summary.balance);
    }
}

// Update Charts
function updateCharts(data) {
    // Income vs Expenses Chart
    const incomeExpenseCtx = document.getElementById('incomeExpenseChart').getContext('2d');
    if (window.incomeExpenseChart) {
        window.incomeExpenseChart.destroy();
    }
    window.incomeExpenseChart = new Chart(incomeExpenseCtx, {
        type: 'bar',
        data: {
            labels: ['Income', 'Expenses'],
            datasets: [{
                label: 'Amount',
                data: [data.summary.income, data.summary.expenses],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 99, 132, 0.6)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
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

    // Spending by Category Chart
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    if (window.categoryChart) {
        window.categoryChart.destroy();
    }
    window.categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data.expense_categories),
            datasets: [{
                data: Object.values(data.expense_categories),
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                    '#9966FF', '#FF9F40', '#8AC249', '#EA5545'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Dashboard Updates
function updateTransactionsList() {
    const transactionsList = document.getElementById('transactionsList');
    const filterType = document.getElementById('transactionFilterType').value;
    const searchQuery = document.getElementById('transactionSearch').value.toLowerCase();

    let filteredTransactions = transactions;

    // Apply filters
    if (filterType !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.type === filterType);
    }

    if (searchQuery) {
        filteredTransactions = filteredTransactions.filter(t => 
            t.description.toLowerCase().includes(searchQuery) ||
            t.category.toLowerCase().includes(searchQuery)
        );
    }

    // Sort by date (most recent first)
    filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Generate HTML
    transactionsList.innerHTML = filteredTransactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-date">${formatDate(transaction.date)}</div>
            <div class="transaction-description">
                ${transaction.description}
                <div class="transaction-category">${transaction.category}</div>
            </div>
            <div class="transaction-amount ${transaction.type}">
                ${formatCurrency(transaction.amount)}
            </div>
            <button class="btn-icon" onclick="deleteTransaction('${transaction.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Event Listeners
function setupEventListeners() {
    // Transaction Form
    const transactionForm = document.getElementById('transactionForm');
    transactionForm.addEventListener('submit', handleTransactionSubmit);

    // Filters
    document.getElementById('transactionFilterType').addEventListener('change', updateTransactionsList);
    document.getElementById('transactionSearch').addEventListener('input', updateTransactionsList);

    // Sidebar Toggle
    const sidebarTrigger = document.querySelector('.sidebar-trigger');
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('main');

    sidebarTrigger.addEventListener('click', () => {
        sidebar.classList.toggle('visible');
        main.classList.toggle('sidebar-visible');
    });
}

// Form Handlers
function handleTransactionSubmit(e) {
    e.preventDefault();

    const formData = {
        type: document.getElementById('transactionType').value,
        amount: document.getElementById('transactionAmount').value,
        category: document.getElementById('transactionCategory').value,
        date: document.getElementById('transactionDate').value,
        description: document.getElementById('transactionDescription').value
    };

    addTransaction(formData);
    e.target.reset();
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showNotification(message, type = 'info') {
    // You can implement a notification system here
    console.log(`${type.toUpperCase()}: ${message}`);
}

// Delete Transaction
async function deleteTransaction(transactionId) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
        const response = await fetch(`/api/transactions/${transactionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to delete transaction');

        transactions = transactions.filter(t => t.id !== transactionId);
        updateDashboardSummary();
        updateTransactionsList();
        updateCharts();
        showNotification('Transaction deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting transaction:', error);
        showNotification('Error deleting transaction', 'error');
    }
} 