// Transactions Page Initialization
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!token || !currentUser) {
        window.location.href = '/';
        return;
    }

    initializeTransactionsPage();
});

async function initializeTransactionsPage() {
    await loadTransactions();
    setupEventListeners();
    
    // Set default date to today
    document.getElementById('transactionDate').valueAsDate = new Date();
}

// Setup Event Listeners
function setupEventListeners() {
    // Transaction Form Submission
    document.getElementById('transactionForm').addEventListener('submit', handleTransactionSubmit);
    
    // Filter Changes
    document.getElementById('transactionFilterType').addEventListener('change', updateTransactionsList);
    document.getElementById('transactionSearch').addEventListener('input', updateTransactionsList);
}

// Handle Transaction Form Submission
async function handleTransactionSubmit(e) {
    e.preventDefault();
    
    const formData = {
        type: document.getElementById('transactionType').value,
        amount: parseFloat(document.getElementById('transactionAmount').value),
        category: document.getElementById('transactionCategory').value,
        date: document.getElementById('transactionDate').value,
        description: document.getElementById('transactionDescription').value
    };

    try {
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Failed to add transaction');

        await loadTransactions();
        document.getElementById('transactionForm').reset();
        showNotification('Transaction added successfully', 'success');
    } catch (error) {
        console.error('Error adding transaction:', error);
        showNotification('Error adding transaction', 'error');
    }
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

        await loadTransactions();
        showNotification('Transaction deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting transaction:', error);
        showNotification('Error deleting transaction', 'error');
    }
} 