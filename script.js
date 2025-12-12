document.addEventListener('DOMContentLoaded', () => {
    // --- START: Firebase Configuration ---
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    // --- END: Firebase Configuration ---

    // --- START: DOM Element References ---
    const addCustomerBtn = document.getElementById('add-customer-btn');
    const modal = document.getElementById('add-customer-modal');
    const closeBtn = document.querySelector('.close-btn');
    const addCustomerForm = document.getElementById('add-customer-form');
    const customerGridBody = document.querySelector('#customer-grid tbody');
    const dayFilters = document.querySelector('.day-filters');
    const searchInput = document.getElementById('search-input');
    const prevWeekBtn = document.getElementById('prev-week-btn');
    const nextWeekBtn = document.getElementById('next-week-btn');
    const weekRangeEl = document.getElementById('week-range');
    const selectedDateDisplay = document.getElementById('selected-date-display');
    const deleteCustomerBtn = document.getElementById('delete-customer-btn');

    // Transaction History Modal Elements
    const transactionHistoryModal = document.getElementById('transaction-history-modal');
    const transactionHistoryCloseBtn = document.querySelector('.transaction-history-close-btn');
    const historyCustomerName = document.getElementById('history-customer-name');
    const historyTotalPayable = document.getElementById('history-total-payable');
    const historyBalanceAmount = document.getElementById('history-balance-amount');
    const historyGridBody = transactionHistoryModal.querySelector('#transaction-history-table-body');
    const whatsappShareBtn = document.getElementById('whatsapp-share-btn');

    // Daily Report Modal Elements
    const dailyReportModal = document.getElementById('daily-report-modal');
    const dailyReportCloseBtn = document.querySelector('.daily-report-close-btn');
    const generateReportBtn = document.getElementById('generate-report-btn');
    const totalCollectionDisplay = document.getElementById('total-collection-display');
    const totalLoanAmountDisplay = document.getElementById('total-loan-amount-display');
    const totalOnlineCollectionDisplay = document.getElementById('total-online-collection-display');
    const openingBalanceDisplay = document.getElementById('opening-balance-display');
    const openingDepositDisplay = document.getElementById('opening-deposit-display');
    const expenseDisplay = document.getElementById('expense-display');
    const closingBalanceDisplay = document.getElementById('closing-balance-display');
    const saveSummaryBtn = document.getElementById('save-summary-btn');

    // Excel/Book Download Buttons
    const downloadExcelBtn = document.getElementById('download-excel-btn');
    const downloadBookBtn = document.getElementById('download-book-btn');

    // Custom Address Dropdown Elements
    const addressDropdownList = document.querySelector('.custom-dropdown-list');
    const newAddressInput = document.getElementById('new-address');
    const addressInput = document.getElementById('address');
    const addressSelectedValue = document.querySelector('.custom-dropdown-selected-value');
    const addressDropdownContainer = document.getElementById('address-dropdown');
    // --- END: DOM Element References ---

    // --- START: Global State ---
    let currentDate = new Date();
    let customers = [];
    let editingCustomerIndex = null;
    // --- END: Global State ---

    // --- START: Core Functions ---
    const filterAndRender = (day) => {
        const dayFilter = day || (document.querySelector('.day-filter.active') ? document.querySelector('.day-filter.active').dataset.day : 'All');
        const searchTerm = searchInput.value.toLowerCase();

        let filteredCustomers = customers;

        if (dayFilter !== 'All') {
            filteredCustomers = filteredCustomers.filter(c => c.day === dayFilter);
        }

        if (searchTerm) {
            filteredCustomers = filteredCustomers.filter(c =>
                c.name.toLowerCase().includes(searchTerm) ||
                c.phone.toLowerCase().includes(searchTerm) ||
                (c.address && c.address.toLowerCase().includes(searchTerm))
            );
        }

        filteredCustomers = filteredCustomers.filter(c => {
            if (!c.accountOpeningDate) {
                return true;
            }
            const parts = c.accountOpeningDate.split('-').map(Number);
            const accountOpeningDateObj = new Date(parts[0], parts[1] - 1, parts[2]);
            const accountOpeningWeekId = getWeekId(accountOpeningDateObj);
            const currentWeekId = getWeekId(new Date(currentDate));
            return currentWeekId > accountOpeningWeekId;
        });

        renderGrid(filteredCustomers);
    };

    const renderGrid = (customerData) => {
        const weekId = getWeekId(new Date(currentDate));
        customerGridBody.innerHTML = '';
        for (const customer of customerData) {
            try {
                const payment = customer.paymentHistory ? customer.paymentHistory[weekId] : null;
                const paymentStatus = payment ? payment.status : 'Pending';
                const lastPaidAmount = payment ? payment.amount : 0;
                const paymentMode = payment ? payment.mode : 'Cash';

                const balanceAmount = customer.balanceAmount ?? 0;
                const totalPayableAmount = customer.totalPayableAmount ?? 0;
                const customerName = customer.name || 'N/A';
                const customerId = customer.id || 'N/A';
                const customerDay = customer.day || 'N/A';
                const customerAddress = customer.address || '';
                const customerPhone = customer.phone || '';

                const row = document.createElement('tr');
                row.dataset.customerId = customerId;

                row.innerHTML = `
                    <td data-label="Name" class="customer-name-cell">
                        <div class="customer-name-container">
                            <div>
                                <div class="customer-name">${customerName}</div>
                                <div class="customer-id">${customerId}</div>
                            </div>
                            <div class="payment-status-dots">
                                ${[...Array(10).keys()].map(i => {
                    const date = new Date(currentDate);
                    date.setDate(date.getDate() - (i * 7));
                    const pastWeekId = getWeekId(date);
                    if (!customer.accountOpeningDate) return '';
                    const parts = customer.accountOpeningDate.split('-').map(Number);
                    const accountOpeningDate = new Date(parts[0], parts[1] - 1, parts[2]);
                    if (date < accountOpeningDate) {
                        return '';
                    }
                    const payment = customer.paymentHistory ? customer.paymentHistory[pastWeekId] : null;
                    return `<span class="status-dot ${payment ? 'paid' : 'not-paid'}"></span>`;
                }).join('')}
                            </div>
                            <a href="tel:${customerPhone}" class="call-btn"><i class="fas fa-phone"></i></a>
                        </div>
                    </td>
                    <td data-label="Day" style="display: none;">
                        <div>${customerDay}</div>
                        <div class="customer-address">${customerAddress}</div>
                    </td>
                    <td data-label="Balance Amount" class="balance-amount-cell">
                        <div class="balance-amount">₹${balanceAmount.toLocaleString('en-IN')}</div>
                        <div class="total-payable">of ₹${totalPayableAmount.toLocaleString('en-IN')}</div>
                    </td>
                    <td data-label="Amount Paid">
                        <div class="amount-paid-container">
                            <input type="number" class="amount-paid-input" value="${paymentStatus === 'Paid' ? lastPaidAmount : ''}" ${paymentStatus === 'Paid' ? 'disabled' : ''} min="1" max="99999">
                            <select class="payment-mode-select" ${paymentStatus === 'Paid' ? 'disabled' : ''}>
                                <option value="Cash" ${paymentMode === 'Cash' ? 'selected' : ''}>Cash</option>
                                <option value="UPI" ${paymentMode === 'UPI' ? 'selected' : ''}>UPI</option>
                            </select>
                        </div>
                    </td>
                    <td data-label="Actions">
                        ${paymentStatus === 'Paid' ? '<button class="edit-pay-btn"><i class="fas fa-edit"></i> Edit</button>' : '<button class="pay-btn pay-btn-large"><i class="fas fa-money-bill-wave"></i> Pay</button>'}
                    </td>
                    <td data-label="Payment Status">
                        ${paymentStatus === 'Paid' ? `<span class="paid-status">Paid</span><div class="paid-date">${formatDate(payment.paymentDate)}</div>` : '<span class="not-paid-status">Not Paid</span>'}
                    </td>
                `;
                customerGridBody.appendChild(row);
            } catch (error) {
                console.error("Could not render customer row. Data might be corrupt:", customer, error);
            }
        }
    };

    const loadCustomers = () => {
        console.log("Setting up Firestore listener...");
        db.collection("customers").onSnapshot((snapshot) => {
            console.log("Received snapshot from Firestore. Number of documents:", snapshot.size);
            customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            customers.sort((a, b) => a.id.localeCompare(b.id));
            filterAndRender();
        }, (error) => {
            console.error("Firestore snapshot error: ", error);
            alert("Error connecting to the database. Please check the console for details.");
        });
    };

    const updateWeekRange = () => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        weekRangeEl.textContent = `${startOfWeek.toLocaleDateString('en-US', options)} - ${endOfWeek.toLocaleDateString('en-US', options)}`;
    };

    const updateSelectedDate = (dayName) => {
        const today = new Date(currentDate);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDayIndex = today.getDay();
        const targetDayIndex = days.indexOf(dayName);

        if (targetDayIndex !== -1) {
            const diff = targetDayIndex - currentDayIndex;
            today.setDate(today.getDate() + diff);
        }
        currentDate = today;
        selectedDateDisplay.textContent = `Selected Day: ${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    };

    const preselectCurrentDayFilter = () => {
        const today = new Date();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDayName = days[today.getDay()];

        const initiallyActiveButton = document.querySelector('.day-filter.active');
        if (initiallyActiveButton) {
            initiallyActiveButton.classList.remove('active');
        }

        const currentDayButton = document.querySelector(`.day-filter[data-day="${currentDayName}"]`);
        if (currentDayButton) {
            currentDayButton.classList.add('active');
        } else {
            document.querySelector('.day-filter[data-day="Sunday"]').classList.add('active');
        }
        updateSelectedDate(currentDayName);
    };
    // --- END: Core Functions ---

    // --- START: Modal Functions ---
    const showCustomerDetailsModal = (customer) => {
        const existingDropdownContainer = document.getElementById('existing-customer-dropdown-container');
        if (existingDropdownContainer) {
            existingDropdownContainer.remove();
        }
        document.querySelector('#add-customer-modal h2').textContent = 'Edit Customer';
        document.querySelector('#add-customer-form button[type="submit"]').textContent = 'Update Customer';

        document.getElementById('customer-id').value = customer.id;
        document.getElementById('account-id-optional').value = customer.accountIdOptional || '';
        document.getElementById('account-id-optional').readOnly = true;
        document.getElementById('name').value = customer.name;
        document.getElementById('phone').value = customer.phone;
        document.getElementById('alternate-phone-number').value = customer.alternatePhoneNumber || '';

        const selectedDay = document.querySelector('.day-filter.active')?.dataset.day || 'Sunday';
        let customersForDay = customers.filter(c => c.day === selectedDay);
        const existingAddresses = [...new Set(customersForDay.map(c => c.address).filter(Boolean))];

        while (addressDropdownList.children.length > 2) {
            addressDropdownList.removeChild(addressDropdownList.lastChild);
        }

        existingAddresses.forEach(address => {
            const li = document.createElement('li');
            li.dataset.value = address;
            li.textContent = address;
            addressDropdownList.appendChild(li);
        });

        if (customer.address) {
            addressSelectedValue.textContent = customer.address;
            addressInput.value = customer.address;
        } else {
            addressSelectedValue.textContent = 'Select or Add Address';
            addressInput.value = '';
        }
        newAddressInput.style.display = 'none';
        newAddressInput.required = false;

        document.getElementById('day').value = customer.day;
        document.getElementById('loan-amount').value = customer.loanAmount || '';
        document.getElementById('total-payable-amount').value = customer.totalPayableAmount;
        document.getElementById('number-of-installments').value = customer.numberOfInstallments || 12;
        document.getElementById('account-opening-date').value = customer.accountOpeningDate;

        editingCustomerIndex = customers.findIndex(c => c.id === customer.id);
        deleteCustomerBtn.style.display = 'block';
        modal.style.display = 'block';
    };

    const showTransactionHistoryModal = (customer) => {
        historyCustomerName.textContent = customer.name;
        historyTotalPayable.textContent = `₹${customer.totalPayableAmount.toLocaleString('en-IN')}`;
        historyBalanceAmount.textContent = `₹${customer.balanceAmount.toLocaleString('en-IN')}`;
        historyGridBody.innerHTML = '';

        let totalPaidAmount = 0;

        if (customer.paymentHistory && Object.keys(customer.paymentHistory).length > 0) {
            const sortedWeeks = Object.keys(customer.paymentHistory).sort((a, b) => new Date(a) - new Date(b));
            let weekNumber = 1;

            sortedWeeks.forEach(weekId => {
                const payment = customer.paymentHistory[weekId];
                const row = document.createElement('tr');
                const weekDate = new Date(weekId).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

                row.innerHTML = `
                    <td>${weekNumber++}</td>
                    <td>${weekDate}</td>
                    <td>₹${payment.amount.toLocaleString('en-IN')} (${payment.mode})</td>
                `;
                historyGridBody.appendChild(row);
                totalPaidAmount += payment.amount;
            });
        } else {
            historyGridBody.innerHTML = `<tr><td colspan="3" style="text-align: center;">No transaction history available.</td></tr>`;
        }

        document.getElementById('total-paid-amount').textContent = `₹${totalPaidAmount.toLocaleString('en-IN')}`;
        transactionHistoryModal.style.display = 'block';
    };

    const showDailyReportModal = async () => {
        const selectedDate = new Date(currentDate);
        selectedDate.setHours(0, 0, 0, 0);
        const reportId = selectedDate.toISOString().split('T')[0];

        let totalLoanAmount = 0;
        customers.forEach(customer => {
            if (customer.accountOpeningDate && customer.loanAmount) {
                const [year, month, day] = customer.accountOpeningDate.split('-').map(Number);
                const accountOpeningDate = new Date(year, month - 1, day);
                accountOpeningDate.setHours(0, 0, 0, 0);

                if (accountOpeningDate.getTime() === selectedDate.getTime()) {
                    totalLoanAmount += customer.loanAmount;
                }
            }
        });

        let totalCollection = 0;
        let totalOnlineCollection = 0;
        const weekId = getWeekId(new Date(currentDate));
        const dayFilter = document.querySelector('.day-filter.active')?.dataset.day || 'All';
        let filteredCustomers = customers.filter(c => dayFilter === 'All' || c.day === dayFilter);

        filteredCustomers.forEach(customer => {
            if (customer.paymentHistory && customer.paymentHistory[weekId]) {
                const payment = customer.paymentHistory[weekId];
                if (payment.status === 'Paid' && !isNaN(payment.amount)) {
                    totalCollection += payment.amount;
                    if (payment.mode === 'UPI') {
                        totalOnlineCollection += payment.amount;
                    }
                }
            }
        });

        const prevWeek = new Date(selectedDate);
        prevWeek.setDate(selectedDate.getDate() - 7);
        const prevWeekReportId = prevWeek.toISOString().split('T')[0];

        let openingBalance = 0;
        try {
            const prevDoc = await db.collection("dailyReports").doc(prevWeekReportId).get();
            if (prevDoc.exists) {
                openingBalance = prevDoc.data().closingBalance || 0;
            }
        } catch (error) {
            console.error("Error fetching previous week's report: ", error);
        }
        openingBalanceDisplay.value = openingBalance;

        const reportRef = db.collection("dailyReports").doc(reportId);
        const doc = await reportRef.get();

        if (doc.exists) {
            const data = doc.data();
            openingDepositDisplay.value = data.openingDeposit || 0;
            expenseDisplay.value = data.expense || 0;
        } else {
            openingDepositDisplay.value = '0';
            expenseDisplay.value = '0';
        }

        totalCollectionDisplay.textContent = `₹${totalCollection.toLocaleString('en-IN')}`;
        totalLoanAmountDisplay.textContent = `₹${totalLoanAmount.toLocaleString('en-IN')}`;
        totalOnlineCollectionDisplay.textContent = `₹${totalOnlineCollection.toLocaleString('en-IN')}`;

        updateClosingBalance();
        dailyReportModal.style.display = 'block';
    };

    const saveDailyReport = () => {
        const selectedDate = new Date(currentDate);
        selectedDate.setHours(0, 0, 0, 0);
        const reportId = selectedDate.toISOString().split('T')[0];

        const data = {
            openingBalance: parseCurrency(openingBalanceDisplay.value),
            openingDeposit: parseCurrency(openingDepositDisplay.value),
            totalCollection: parseCurrency(totalCollectionDisplay.textContent),
            totalLoanAmount: parseCurrency(totalLoanAmountDisplay.textContent),
            totalOnlineCollection: parseCurrency(totalOnlineCollectionDisplay.textContent),
            expense: parseCurrency(expenseDisplay.value),
            closingBalance: parseCurrency(closingBalanceDisplay.textContent),
            lastUpdated: new Date()
        };

        db.collection("dailyReports").doc(reportId).set(data, { merge: true })
            .then(() => {
                alert('Report saved successfully!');
            })
            .catch(error => console.error("Error saving daily report: ", error));
    };

    const updateClosingBalance = () => {
        const openingBalance = parseCurrency(openingBalanceDisplay.value);
        const openingDeposit = parseCurrency(openingDepositDisplay.value);
        const totalCollection = parseCurrency(totalCollectionDisplay.textContent);
        const totalLoanAmount = parseCurrency(totalLoanAmountDisplay.textContent);
        const totalOnlineCollection = parseCurrency(totalOnlineCollectionDisplay.textContent);
        const expense = parseCurrency(expenseDisplay.value);
        const closingBalance = (openingBalance + openingDeposit + totalCollection) - (totalLoanAmount + totalOnlineCollection + expense);
        closingBalanceDisplay.textContent = `₹${closingBalance.toLocaleString('en-IN')}`;
    };
    // --- END: Modal Functions ---

    // --- START: Helper Functions ---
    const getNextCustomerId = () => {
        const lastCustomer = customers.length > 0 ? customers[customers.length - 1] : null;
        if (!lastCustomer || !lastCustomer.id) return 'CUST001';
        const lastId = parseInt(lastCustomer.id.replace('CUST', ''));
        return 'CUST' + (lastId + 1).toString().padStart(3, '0');
    };

    const getNextAccountId = () => {
        if (!customers || customers.length === 0) return 1;
        const maxId = customers.reduce((max, customer) => {
            const accountId = parseInt(customer.accountIdOptional, 10);
            return !isNaN(accountId) && accountId > max ? accountId : max;
        }, 0);
        return maxId + 1;
    };

    const getWeekId = (date) => {
        const firstDay = new Date(date);
        firstDay.setDate(date.getDate() - date.getDay());
        return firstDay.toISOString().split('T')[0];
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        const d = date.toDate ? date.toDate() : new Date(date);
        if (isNaN(d)) return 'Invalid Date';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    };

    const parseCurrency = (str) => {
        if (typeof str === 'number') return str;
        if (!str) return 0;
        return parseFloat(str.replace(/₹/g, '').replace(/,/g, ''));
    };
    // --- END: Helper Functions ---

    // --- START: Event Listeners ---
    prevWeekBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 7);
        updateWeekRange();
        filterAndRender();
    });

    nextWeekBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 7);
        updateWeekRange();
        filterAndRender();
    });

    dayFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('day-filter')) {
            document.querySelector('.day-filter.active').classList.remove('active');
            e.target.classList.add('active');
            updateSelectedDate(e.target.dataset.day);
            filterAndRender(e.target.dataset.day);
        }
    });

    searchInput.addEventListener('input', () => filterAndRender());

    addCustomerBtn.addEventListener('click', () => {
        editingCustomerIndex = null;
        document.querySelector('#add-customer-modal h2').textContent = 'Add New Customer';
        document.querySelector('#add-customer-form button[type="submit"]').textContent = 'Add Customer';
        addCustomerForm.reset();

        const selectedDay = document.querySelector('.day-filter.active')?.dataset.day || 'Sunday';
        let customersForDay = customers.filter(c => selectedDay === 'All' || c.day === selectedDay);
        
        const existingAddresses = [...new Set(customersForDay.map(c => c.address).filter(Boolean))];
        while (addressDropdownList.children.length > 2) {
            addressDropdownList.removeChild(addressDropdownList.lastChild);
        }
        existingAddresses.forEach(address => {
            const li = document.createElement('li');
            li.dataset.value = address;
            li.textContent = address;
            addressDropdownList.appendChild(li);
        });
        addressSelectedValue.textContent = 'Select or Add Address';
        newAddressInput.style.display = 'none';
        newAddressInput.required = false;

        const existingDropdownContainer = document.getElementById('existing-customer-dropdown-container');
        if (existingDropdownContainer) {
            existingDropdownContainer.remove();
        }

        const dropdownContainer = document.createElement('div');
        dropdownContainer.id = 'existing-customer-dropdown-container';
        const label = document.createElement('label');
        label.htmlFor = 'existing-customer-select';
        label.textContent = 'Copy from Existing Customer';
        const select = document.createElement('select');
        select.id = 'existing-customer-select';
        select.innerHTML = '<option value="">--Select to Autofill--</option>';

        const existingCustomers = customers.filter(c => c.day === selectedDay);
        existingCustomers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.name} (${customer.id})`;
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
            const customerId = e.target.value;
            if (customerId) {
                const selectedCustomer = customers.find(c => c.id === customerId);
                if (selectedCustomer) {
                    document.getElementById('name').value = selectedCustomer.name;
                    document.getElementById('phone').value = selectedCustomer.phone;
                    document.getElementById('alternate-phone-number').value = selectedCustomer.alternatePhoneNumber || '';
                    addressSelectedValue.textContent = selectedCustomer.address;
                    addressInput.value = selectedCustomer.address;
                    document.getElementById('loan-amount').value = selectedCustomer.loanAmount || '';
                    document.getElementById('total-payable-amount').value = selectedCustomer.totalPayableAmount;
                    document.getElementById('number-of-installments').value = selectedCustomer.numberOfInstallments || 12;
                }
            } else {
                addCustomerForm.reset();
                document.getElementById('customer-id').value = getNextCustomerId();
                document.getElementById('day').value = selectedDay === 'All' ? 'Sunday' : selectedDay;
                const today = new Date();
                const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                document.getElementById('account-opening-date').value = formattedDate;
            }
        });

        dropdownContainer.appendChild(label);
        dropdownContainer.appendChild(select);
        document.getElementById('customer-id').parentElement.insertAdjacentElement('beforebegin', dropdownContainer);

        document.getElementById('customer-id').value = getNextCustomerId();
        document.getElementById('account-id-optional').value = getNextAccountId();
        document.getElementById('account-id-optional').readOnly = false;
        
        const daySelect = document.getElementById('day');
        daySelect.value = selectedDay === 'All' ? 'Sunday' : selectedDay;
        
        const today = new Date();
        const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        document.getElementById('account-opening-date').value = formattedDate;
        
        deleteCustomerBtn.style.display = 'none';
        modal.style.display = 'block';
    });

    document.getElementById('loan-amount').addEventListener('input', (e) => {
        const loanAmount = parseInt(e.target.value, 10);
        if (!isNaN(loanAmount)) {
            document.getElementById('total-payable-amount').value = loanAmount * 1.2;
        }
    });

    closeBtn.addEventListener('click', () => {
        const existingDropdownContainer = document.getElementById('existing-customer-dropdown-container');
        if (existingDropdownContainer) {
            existingDropdownContainer.remove();
        }
        document.getElementById('account-id-optional').readOnly = false;
        modal.style.display = 'none';
    });

    deleteCustomerBtn.addEventListener('click', () => {
        if (editingCustomerIndex !== null) {
            const customerToDelete = customers[editingCustomerIndex];
            if (confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
                db.collection("customers").doc(customerToDelete.id).delete()
                    .then(() => console.log("Customer deleted successfully"))
                    .catch(error => console.error("Error removing document: ", error));
                editingCustomerIndex = null;
                modal.style.display = 'none';
            }
        }
    });

    addCustomerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const accountOpeningDateStr = document.getElementById('account-opening-date').value;
        const selectedDay = document.getElementById('day').value;
        const dateParts = accountOpeningDateStr.split('-').map(part => parseInt(part, 10));
        const accountOpeningDate = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const actualDay = daysOfWeek[accountOpeningDate.getUTCDay()];

        if (actualDay !== selectedDay) {
            alert(`Date and day mismatch. The selected date, ${accountOpeningDateStr}, is a ${actualDay}, but you selected ${selectedDay}. Please correct one of them.`);
            return;
        }

        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;

        if (editingCustomerIndex === null) {
            const isDuplicate = customers.some(customer => customer.name === name && customer.phone === phone);
            if (isDuplicate) {
                alert('A customer with the same name and phone number already exists.');
                return;
            }
        }

        let address = document.getElementById('address').value;
        if (document.querySelector('.custom-dropdown-selected-value').textContent === 'Add New Address') {
            address = document.getElementById('new-address').value;
        }

        const newCustomer = {
            name: name,
            phone: phone,
            alternatePhoneNumber: document.getElementById('alternate-phone-number').value,
            address: address,
            accountIdOptional: document.getElementById('account-id-optional').value,
            day: document.getElementById('day').value,
            loanAmount: parseInt(document.getElementById('loan-amount').value),
            totalPayableAmount: parseInt(document.getElementById('total-payable-amount').value),
            balanceAmount: parseInt(document.getElementById('total-payable-amount').value),
            amountPaid: 0,
            lastPaidAmount: 0,
            accountOpeningDate: accountOpeningDateStr,
            paymentHistory: {}
        };

        if (editingCustomerIndex !== null) {
            const customerToUpdate = customers[editingCustomerIndex];
            db.collection("customers").doc(customerToUpdate.id).set(newCustomer, { merge: true })
                .catch(error => console.error("Error updating document: ", error));
            editingCustomerIndex = null;
        } else {
            const customerId = document.getElementById('customer-id').value;
            db.collection("customers").doc(customerId).set(newCustomer)
                .catch(error => console.error("Error adding document: ", error));
        }

        modal.style.display = 'none';
        addCustomerForm.reset();
    });

    customerGridBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row) return;

        const customerId = row.dataset.customerId;
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return;
        
        const weekId = getWeekId(new Date(currentDate));

        if (e.target.closest('.pay-btn')) {
            const amountPaidInput = row.querySelector('.amount-paid-input');
            const paymentModeSelect = row.querySelector('.payment-mode-select');
            const paidAmount = parseInt(amountPaidInput.value);

            if (isNaN(paidAmount) || paidAmount < 1) {
                alert('Invalid amount. Please enter a number greater than 0.');
                return;
            }

            const newBalance = customer.balanceAmount - paidAmount;
            const newPaymentHistory = customer.paymentHistory || {};
            newPaymentHistory[weekId] = {
                amount: paidAmount,
                mode: paymentModeSelect.value,
                status: 'Paid',
                paymentDate: new Date()
            };

            db.collection("customers").doc(customerId).update({
                balanceAmount: newBalance,
                paymentHistory: newPaymentHistory
            }).catch(error => console.error("Error updating document: ", error));
        } else if (e.target.closest('.edit-pay-btn')) {
            const payment = customer.paymentHistory[weekId];
            if (payment) {
                const newBalance = customer.balanceAmount + payment.amount;
                const newPaymentHistory = customer.paymentHistory;
                delete newPaymentHistory[weekId];

                db.collection("customers").doc(customerId).update({
                    balanceAmount: newBalance,
                    paymentHistory: newPaymentHistory
                }).catch(error => console.error("Error updating document: ", error));
            }
        } else if (e.target.closest('.customer-name-cell') && !e.target.closest('.call-btn')) {
            showCustomerDetailsModal(customer);
        } else if (e.target.closest('.balance-amount-cell')) {
            showTransactionHistoryModal(customer);
        }
    });
    
    addressDropdownContainer.addEventListener('click', (e) => {
        if (e.target.closest('.custom-dropdown-header')) {
            addressDropdownContainer.classList.toggle('open');
        } else if (e.target.tagName === 'LI') {
            const value = e.target.dataset.value;
            if (value === 'add-new') {
                newAddressInput.style.display = 'block';
                newAddressInput.required = true;
                addressSelectedValue.textContent = 'Add New Address';
                addressInput.value = '';
            } else {
                newAddressInput.style.display = 'none';
                newAddressInput.required = false;
                addressSelectedValue.textContent = value;
                addressInput.value = value;
            }
            addressDropdownContainer.classList.remove('open');
        }
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
        if (e.target === transactionHistoryModal) {
            transactionHistoryModal.style.display = 'none';
        }
        if (e.target === dailyReportModal) {
            saveDailyReport();
            dailyReportModal.style.display = 'none';
        }
        if (!addressDropdownContainer.contains(e.target)) {
            addressDropdownContainer.classList.remove('open');
        }
    });

    transactionHistoryCloseBtn.addEventListener('click', () => {
        transactionHistoryModal.style.display = 'none';
    });

    dailyReportCloseBtn.addEventListener('click', () => {
        saveDailyReport();
        dailyReportModal.style.display = 'none';
    });
    
    generateReportBtn.addEventListener('click', showDailyReportModal);
    
    openingBalanceDisplay.addEventListener('input', updateClosingBalance);
    openingDepositDisplay.addEventListener('input', updateClosingBalance);
    expenseDisplay.addEventListener('input', updateClosingBalance);

    downloadExcelBtn.addEventListener('click', () => {
        const dayFilter = document.querySelector('.day-filter.active')?.dataset.day || 'All';
        const weekId = getWeekId(new Date(currentDate));
        let dataToExport = [["ID", "Name", "Balance Amount", "Amount Paid", "Payment Mode", "Payment Status", "Payment Date"]];
        let customersForReport = customers.filter(c => dayFilter === 'All' || c.day === dayFilter);

        customersForReport.forEach(customer => {
            const payment = customer.paymentHistory ? customer.paymentHistory[weekId] : null;
            dataToExport.push([
                customer.id,
                customer.name,
                `₹${customer.balanceAmount.toLocaleString('en-IN')}`,
                `₹${payment ? payment.amount.toLocaleString('en-IN') : 0}`,
                payment ? payment.mode : 'N/A',
                payment ? payment.status : 'Pending',
                payment ? formatDate(payment.paymentDate) : 'N/A'
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Daily Report");
        XLSX.writeFile(wb, `Daily_Report_${dayFilter}_${new Date().toLocaleDateString('en-US').replace(/\//g, '-')}.xlsx`);
    });

    downloadBookBtn.addEventListener('click', () => {
        const dayFilter = document.querySelector('.day-filter.active')?.dataset.day || 'All';
        let customersForBook = customers.filter(c => dayFilter === 'All' || c.day === dayFilter);
        const wb = XLSX.utils.book_new();

        const last15WeekIds = [...Array(15).keys()].map(i => {
            const date = new Date(currentDate);
            date.setDate(date.getDate() - (i * 7));
            return getWeekId(date);
        }).sort((a, b) => new Date(b) - new Date(a));

        const headers = ['ID', 'Name', 'Account Opening Date', 'Loan Amount', 'Total Payable', 'Total Amount Paid', 'Balance Amount', ...last15WeekIds.map(weekId => new Date(weekId).toLocaleDateString('en-GB').split('/').reverse().join('-'))];
        let customersData = [headers];

        customersForBook.forEach(customer => {
            const totalPaid = Object.values(customer.paymentHistory || {}).reduce((sum, payment) => sum + payment.amount, 0);
            const row = [customer.id, customer.name, customer.accountOpeningDate || 'N/A', customer.loanAmount || 0, customer.totalPayableAmount, totalPaid, customer.balanceAmount];
            last15WeekIds.forEach(weekId => {
                const payment = customer.paymentHistory ? customer.paymentHistory[weekId] : null;
                row.push(payment ? payment.amount : 0);
            });
            customersData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(customersData);
        ws['!freeze'] = { xSplit: 7, ySplit: 1, topLeftCell: 'H2' };
        XLSX.utils.book_append_sheet(wb, ws, 'Book');
        XLSX.writeFile(wb, `Book_${dayFilter}_${new Date().toLocaleDateString('en-US').replace(/\//g, '-')}.xlsx`);
    });

    whatsappShareBtn.addEventListener('click', async () => {
        const transactionHistoryModalContent = transactionHistoryModal.querySelector('.modal-content');
        try {
            const canvas = await html2canvas(transactionHistoryModalContent, { scale: 2, useCORS: true });
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const file = new File([blob], 'transaction_history.png', { type: 'image/png' });
            if (navigator.share) {
                await navigator.share({
                    files: [file],
                    title: `Transaction History for ${historyCustomerName.textContent}`,
                    text: `Here's the transaction history for ${historyCustomerName.textContent}.`,
                });
            } else {
                alert('Direct sharing is not supported in your browser. Please download the image and share it manually.');
            }
        } catch (error) {
            console.error('Error sharing transaction history:', error);
        }
    });
    
    saveSummaryBtn.addEventListener('click', () => {
        saveDailyReport();
        dailyReportModal.style.display = 'none';
    });
    // --- END: Event Listeners ---

    // --- START: Initializations ---
    loadCustomers();
    preselectCurrentDayFilter();
    updateWeekRange();
    // --- END: Initializations ---
});