let investments = [];
let currentRates = {};
let currentPortfolioId = localStorage.getItem('currentPortfolioId');

async function fetchInvestments() {
    try {
        if (!currentPortfolioId) {
            console.warn("No portfolio selected");
            investments = [];
            renderInvestments();
            updateDashboard();
            return;
        }
        const response = await fetch(`/api/investments?portfolio_id=${currentPortfolioId}`);
        if (response.ok) {
            investments = await response.json();
            renderInvestments();
            updateDashboard();
        }
    } catch (e) {
        console.error("Error fetching investments:", e);
    }
}

async function fetchRates() {
    try {
        const response = await fetch('/api/rates');
        const data = await response.json();

        if (data.error) {
            console.error("Error fetching rates:", data.error);
        }

        currentRates = data || {};
        renderRates();

        // Fetch users data
        await fetchInvestments();

        document.getElementById('last-updated').innerText = `Son Güncelleme: ${new Date().toLocaleTimeString()}`;
    } catch (e) {
        console.error("Fetch error:", e);
        renderRates();
        renderInvestments();
        updateDashboard();
    }
}

async function refreshData() {
    const icon = document.getElementById('refresh-icon');
    if (icon) icon.classList.add('spin-anim');

    await fetchRates();

    if (icon) {
        // Ensure animation runs for at least a short moment so it doesn't look like a glitch
        setTimeout(() => {
            icon.classList.remove('spin-anim');
        }, 500);
    }
}


// Portfolios
async function fetchPortfolios() {
    try {
        const response = await fetch('/api/portfolios');
        const portfolios = await response.json();

        const select = document.getElementById('portfolio-select');
        select.innerHTML = '';

        if (portfolios.length > 0) {
            portfolios.forEach(p => {
                const option = document.createElement('option');
                option.value = p.id;
                option.innerText = p.name;
                select.appendChild(option);
            });

            // Set current or default
            if (!currentPortfolioId || !portfolios.find(p => p.id == currentPortfolioId)) {
                currentPortfolioId = portfolios[0].id;
                localStorage.setItem('currentPortfolioId', currentPortfolioId);
            }
            select.value = currentPortfolioId;
        } else {
            // Should not happen as migration creates default, but handle anyway
            currentPortfolioId = null;
        }

    } catch (e) {
        console.error("Error fetching portfolios:", e);
    }
}

function changePortfolio(id) {
    currentPortfolioId = id;
    localStorage.setItem('currentPortfolioId', id);
    fetchInvestments();
}

function openAddPortfolioModal() {
    document.getElementById('add-portfolio-modal').classList.add('active');
    document.getElementById('portfolio-name').value = '';
}

function closeAddPortfolioModal() {
    document.getElementById('add-portfolio-modal').classList.remove('active');
}

async function handlePortfolioSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('portfolio-name').value;

    try {
        const response = await fetch('/api/portfolios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });

        if (response.ok) {
            const newPortfolio = await response.json();
            closeAddPortfolioModal();
            await fetchPortfolios();
            changePortfolio(newPortfolio.id); // Switch to new portfolio
        } else {
            alert('Portföy eklenirken hata oluştu.');
        }
    } catch (e) {
        console.error(e);
        alert('Bağlantı hatası.');
    }
}

function parseLocaleNumber(stringNumber) {
    if (!stringNumber) return 0;
    let clean = stringNumber.replace(/[^0-9.,]/g, '');

    if (clean.indexOf('.') !== -1 && clean.indexOf(',') !== -1) {
        if (clean.indexOf('.') < clean.indexOf(',')) {
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
            clean = clean.replace(/,/g, '');
        }
    } else if (clean.indexOf(',') !== -1) {
        clean = clean.replace(',', '.');
    }
    return parseFloat(clean);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
}

function getCurrencyIcon(currency) {
    if (currency === 'GOLD' || currency === 'Altın') {
        return `<svg class="svg-icon" style="color:var(--accent-gold);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5H5L3 19h18l-2-14z"></path><path d="M7 5l2 14"></path><path d="M17 5l-2 14"></path></svg>`;
    } else if (currency === 'USD' || currency === 'Dolar') {
        return `<svg class="svg-icon" style="color:var(--accent-green);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
    } else if (currency === 'EUR' || currency === 'Euro') {
        return `<svg class="svg-icon" style="color:#3b82f6;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h12"></path><path d="M4 14h9"></path><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"></path></svg>`;
    } else if (currency === 'BTC' || currency === 'Bitcoin') {
        return `<svg class="svg-icon" style="color:#f7931a;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6h8a3 3 0 0 1 0 6a3 3 0 0 1 0 6h-8"></path><line x1="8" y1="6" x2="8" y2="18"></line><line x1="8" y1="12" x2="14" y2="12"></line><line x1="9" y1="3" x2="9" y2="6"></line><line x1="9" y1="18" x2="9" y2="21"></line></svg>`;
    } else if (currency === 'ETH' || currency === 'Ethereum') {
        return `<svg class="svg-icon" style="color:#627eea;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"></path></svg>`;
    } else {
        return `<svg class="svg-icon" style="color:var(--accent-silver);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`;
    }
}

function renderRates() {
    const container = document.getElementById('live-rates');
    container.innerHTML = '';

    const currencies = [
        { key: 'USD', label: 'Dolar', icon: 'icon-usd', symbol: '$' },
        { key: 'EUR', label: 'Euro', icon: 'icon-eur', symbol: '€' },
        { key: 'GOLD', label: 'Altın', icon: 'icon-gold', symbol: 'Au' },
        { key: 'SILVER', label: 'Gümüş', icon: 'icon-silver', symbol: 'Ag' }
    ];

    currencies.forEach(c => {
        const rateObj = currentRates[c.key];
        const buyStr = rateObj ? rateObj.buy : null;
        const sellStr = rateObj ? rateObj.sell : null;
        const changeStr = rateObj ? rateObj.change : null;

        const buyVal = parseLocaleNumber(buyStr);
        const sellVal = parseLocaleNumber(sellStr);

        let changeClass = '';
        let changeIcon = '';
        let glowClass = '';

        if (changeStr) {
            if (changeStr.includes('-')) {
                changeClass = 'negative';
                changeIcon = '<span class="arrow-anim arrow-down">▼</span>';
                glowClass = 'glow-negative';
            } else if (changeStr !== '0' && changeStr !== '%0,00' && changeStr !== '%0.00') {
                changeClass = 'positive';
                changeIcon = '<span class="arrow-anim arrow-up">▲</span>';
                glowClass = 'glow-positive';
            }
        }

        const div = document.createElement('div');
        div.className = `rate-item ${glowClass}`;

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <!-- LEFT COLUMN -->
                <div style="flex: 1; padding-right: 1rem; border-right: 1px solid rgba(255,255,255,0.1);">
                    <div style="display:flex;align-items:center;gap:0.5rem; margin-bottom: 0.75rem;">
                        ${getCurrencyIcon(c.key)}
                        <span style="font-weight:600; font-size: 1.1rem;">${c.label}</span>
                    </div>

                    <div class="rate-details">
                        <div class="rate-row" style="margin-bottom:0.25rem;">
                            <span class="rate-label">Alış</span>
                            <span class="rate-value" style="color:var(--success)">${buyStr ? formatCurrency(buyVal) : '-'}</span>
                        </div>
                        <div class="rate-row" style="margin-bottom:0.25rem;">
                            <span class="rate-label">Satış</span>
                            <span class="rate-value">${sellStr ? formatCurrency(sellVal) : '-'}</span>
                        </div>
                        <div class="rate-row">
                            <span class="rate-label">Makas</span>
                            <span class="rate-value" style="color:var(--text-secondary)">${(buyVal && sellVal) ? formatCurrency(sellVal - buyVal) : '-'}</span>
                        </div>
                    </div>
                </div>

                <!-- RIGHT COLUMN -->
                <div style="flex: 0 0 auto; padding-left: 1rem; text-align: center; min-width: 100px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <div style="font-size: 1.25rem; margin-bottom: 0.25rem; line-height: 1;">${changeIcon}</div>
                    <div class="${changeClass}" style="font-size:1.5rem; font-weight:700; white-space: nowrap; line-height: 1;">
                        ${changeStr || '-'}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    // Render Ticker
    const tickerContainer = document.getElementById('rates-ticker');
    if (tickerContainer) {
        let tickerHtml = '';

        const createTickerItems = () => {
            return currencies.map(c => {
                const rateObj = currentRates[c.key];
                const buyStr = rateObj ? rateObj.buy : '-';
                const sellStr = rateObj ? rateObj.sell : '-';
                const changeStr = rateObj ? rateObj.change : '-';

                let changeClass = '';
                let changeIcon = '';
                if (changeStr && changeStr.includes('-')) {
                    changeClass = 'negative';
                    changeIcon = '<span class="arrow-anim arrow-down">▼</span>';
                } else if (changeStr && changeStr !== '0' && changeStr !== '%0,00') {
                    changeClass = 'positive';
                    changeIcon = '<span class="arrow-anim arrow-up">▲</span>';
                }

                return `
                    <div class="ticker-item">
                        <div style="display:flex;align-items:center;gap:0.25rem;">
                            ${getCurrencyIcon(c.key)}
                            <span style="font-weight:600;">${c.label}</span>
                        </div>
                        <div style="display:flex;gap:1rem;align-items:center;">
                            <span>Alış: <span style="color:var(--success)">${buyStr}</span></span>
                            <span>Satış: <span>${sellStr}</span></span>
                            <span class="${changeClass}">${changeIcon} ${changeStr}</span>
                        </div>
                    </div>
                `;
            }).join('');
        };

        const items = createTickerItems();
        tickerContainer.innerHTML = items + items + items + items;
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const id = document.getElementById('investment-id').value;
    const currency = document.getElementById('currency').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const buyPrice = parseFloat(document.getElementById('buy-price').value);
    const fee = parseFloat(document.getElementById('fee').value) || 0;
    const dateInput = document.getElementById('date').value;
    const date = dateInput ? new Date(dateInput) : new Date();

    const investment = {
        currency,
        amount,
        buyPrice,
        fee,
        fee,
        date: date.toISOString(),
        portfolio_id: currentPortfolioId
    };

    if (id) {
        await updateInvestment(id, investment);
    } else {
        await addInvestment(investment);
    }
}

async function addInvestment(investment) {
    try {
        const response = await fetch('/api/investments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(investment)
        });

        if (response.ok) {
            closeModal();
            await fetchInvestments();
        } else {
            alert('Yatırım eklenirken bir hata oluştu.');
        }
    } catch (e) {
        console.error("Error adding investment:", e);
        alert('Bağlantı hatası.');
    }
}

async function updateInvestment(id, investment) {
    try {
        const response = await fetch(`/api/investments/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(investment)
        });

        if (response.ok) {
            closeModal();
            await fetchInvestments();
        } else {
            alert('Güncelleme sırasında bir hata oluştu.');
        }
    } catch (e) {
        console.error("Error updating investment:", e);
        alert('Bağlantı hatası.');
    }
}

let itemToDelete = null;

function deleteInvestment(id) {
    itemToDelete = id;
    document.getElementById('delete-modal').classList.add('active');
}

function closeDeleteModal() {
    itemToDelete = null;
    document.getElementById('delete-modal').classList.remove('active');
}

async function confirmDelete() {
    if (itemToDelete) {
        try {
            const response = await fetch(`/api/investments/${itemToDelete}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await fetchInvestments();
                closeDeleteModal();
            } else {
                alert('Silme işlemi başarısız oldu.');
            }
        } catch (e) {
            console.error("Error deleting investment:", e);
            alert('Bağlantı hatası.');
        }
    }
}

function exportCSV() {
    let url = '/api/export_csv';
    if (currentPortfolioId) {
        url += `?portfolio_id=${currentPortfolioId}`;
    }
    window.location.href = url;
}

function renderInvestments() {
    const tbody = document.getElementById('investment-tbody');
    tbody.innerHTML = '';

    investments.forEach(inv => {
        const rateObj = currentRates[inv.currency];
        // We use Bank Buy price for current value calculation as requested "banka alış fiyatına göre gösterecek"
        const currentRateStr = rateObj ? rateObj.buy : null;
        const currentRate = parseLocaleNumber(currentRateStr) || 0;

        const totalCost = (inv.amount * inv.buyPrice) + inv.fee;
        const currentValue = inv.amount * currentRate;
        const profitLoss = currentValue - totalCost;
        const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;
        const profitLossClass = profitLoss >= 0 ? 'positive' : 'negative';

        let currencyName = '';
        if (inv.currency === 'GOLD') currencyName = 'Altın';
        else if (inv.currency === 'USD') currencyName = 'Dolar';
        else if (inv.currency === 'EUR') currencyName = 'Euro';
        else currencyName = 'Gümüş';

        const dateObj = new Date(inv.date);
        const dateStr = dateObj.toLocaleDateString('tr-TR');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="currency-cell">
                    ${getCurrencyIcon(inv.currency)}
                    <span>${currencyName}</span>
                </div>
            </td>
            <td>${inv.amount}</td>
            <td>${formatCurrency(inv.buyPrice)}</td>
            <td>${formatCurrency(inv.fee)}</td>
            <td style="color:var(--text-secondary);font-size:0.9rem;">${dateStr}</td>
            <td>${formatCurrency(totalCost)}</td>
            <td>${currentRate ? formatCurrency(currentValue) : '-'}</td>
            <td class="${profitLossClass}">
                ${currentRate ? `
                    ${formatCurrency(profitLoss)}
                    <span style="font-size: 0.85rem; margin-left: 4px; opacity: 0.8;">(%${profitLossPercent.toFixed(2)})</span>
                ` : '-'}
            </td>
            <td>
                <div style="display:flex; gap: 0.5rem;">
                    <button type="button" onclick="openEditModal(${inv.id})" class="btn-icon" title="Düzenle">
                        <svg class="svg-icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button type="button" onclick="deleteInvestment(${inv.id})" class="btn-icon btn-delete" title="Sil">
                        <svg class="svg-icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openModal() {
    document.getElementById('add-modal').classList.add('active');
    document.getElementById('modal-title').innerText = 'Yeni Yatırım Ekle';
    document.getElementById('investment-id').value = '';

    // Reset form
    document.getElementById('currency').value = 'USD';
    document.getElementById('amount').value = '';
    document.getElementById('buy-price').value = '';
    document.getElementById('fee').value = '';

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

function openEditModal(id) {
    const inv = investments.find(i => i.id === id);
    if (!inv) return;

    document.getElementById('add-modal').classList.add('active');
    document.getElementById('modal-title').innerText = 'Yatırımı Düzenle';
    document.getElementById('investment-id').value = inv.id;

    document.getElementById('currency').value = inv.currency;
    document.getElementById('amount').value = inv.amount;
    document.getElementById('buy-price').value = inv.buyPrice;
    document.getElementById('fee').value = inv.fee;

    // Format date for input type="date"
    const d = new Date(inv.date);
    const dateStr = d.toISOString().split('T')[0];
    document.getElementById('date').value = dateStr;
}

function updateDashboard() {
    let totalVal = 0;
    let totalCost = 0;

    investments.forEach(inv => {
        const rateObj = currentRates[inv.currency];
        const currentRateStr = rateObj ? rateObj.buy : null;
        const currentRate = parseLocaleNumber(currentRateStr) || 0;

        totalCost += (inv.amount * inv.buyPrice) + inv.fee;
        if (currentRate) {
            totalVal += inv.amount * currentRate;
        }
    });

    const profitLoss = totalVal - totalCost;
    const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

    document.getElementById('total-value').innerText = formatCurrency(totalVal);
    document.getElementById('total-cost').innerText = formatCurrency(totalCost);

    const plEl = document.getElementById('profit-loss-amount');
    const plPerEl = document.getElementById('profit-loss-percent');

    plEl.innerText = formatCurrency(profitLoss);
    plPerEl.innerText = `(%${profitLossPercent.toFixed(2)})`;

    const plContainer = document.getElementById('total-profit-loss');
    const summaryCard = document.getElementById('financial-summary-card');

    if (profitLoss >= 0) {
        plContainer.classList.remove('negative');
        plContainer.classList.add('positive');
        if (summaryCard) {
            summaryCard.classList.remove('glow-negative');
            summaryCard.classList.add('glow-positive');
        }
    } else {
        plContainer.classList.remove('positive');
        plContainer.classList.add('negative');
        if (summaryCard) {
            summaryCard.classList.remove('glow-positive');
            summaryCard.classList.add('glow-negative');
        }
    }

    // Update Portfolio Summary
    const summaryContainer = document.getElementById('portfolio-summary');
    summaryContainer.innerHTML = '';

    const summary = {
        USD: { amount: 0, value: 0, cost: 0, label: 'Dolar', unit: '$' },
        EUR: { amount: 0, value: 0, cost: 0, label: 'Euro', unit: '€' },
        GOLD: { amount: 0, value: 0, cost: 0, label: 'Altın', unit: 'gr' },
        SILVER: { amount: 0, value: 0, cost: 0, label: 'Gümüş', unit: 'gr' }
    };

    investments.forEach(inv => {
        const rateObj = currentRates[inv.currency];
        const currentRateStr = rateObj ? rateObj.buy : null;
        const currentRate = parseLocaleNumber(currentRateStr) || 0;

        if (summary[inv.currency]) {
            summary[inv.currency].amount += inv.amount;
            // Calculate total cost for this investment
            const invCost = (inv.amount * inv.buyPrice) + inv.fee;
            summary[inv.currency].cost += invCost;

            if (currentRate) {
                summary[inv.currency].value += inv.amount * currentRate;
            }
        }
    });

    Object.keys(summary).forEach(key => {
        const item = summary[key];
        const avgCost = item.amount > 0 ? (item.cost / item.amount) : 0;

        const div = document.createElement('div');
        div.style.display = 'grid';
        // 3 Columns: Icon+Name | Amount | Value+Cost
        div.style.gridTemplateColumns = '1.5fr 1fr 1.2fr';
        div.style.alignItems = 'center';
        div.style.gap = '0.5rem';
        div.style.padding = '0.5rem 0.25rem'; // Reduced padding
        div.style.borderBottom = '1px solid var(--card-border)';
        div.style.cursor = 'pointer';
        div.style.transition = 'background 0.2s';

        div.onmouseover = function () { this.style.backgroundColor = 'rgba(255,255,255,0.05)'; };
        div.onmouseout = function () { this.style.backgroundColor = 'transparent'; };

        div.onclick = function () { showAssetDetails(key); };

        div.innerHTML = `
            <div style="display:flex;align-items:center;gap:0.5rem;overflow:hidden;">
                ${getCurrencyIcon(key)}
                <span style="font-weight:600;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.label}</span>
            </div>
            
            <div style="text-align:right;font-size:0.9rem;font-weight:500;white-space:nowrap;">
                ${item.amount.toLocaleString('tr-TR')} <span style="font-size:0.75rem;color:var(--text-secondary);">${item.unit}</span>
            </div>

            <div style="text-align:right;display:flex;flex-direction:column;justify-content:center;">
                <div style="font-weight:600;font-size:0.9rem;white-space:nowrap;">${formatCurrency(item.value)}</div>
                <div style="font-size:0.75rem;color:var(--text-secondary);white-space:nowrap;">${formatCurrency(avgCost)}</div>
            </div>
        `;
        summaryContainer.appendChild(div);
    });


    calculateAlternativeScenario();
}

async function calculateAlternativeScenario() {
    const container = document.getElementById('alternative-scenario');
    if (!container) return; // Safety check if element is hidden/removed

    if (!investments.length) {
        container.innerHTML = '<div style="color:var(--text-secondary);font-size:0.9rem;">Henüz yatırımınız bulunmuyor.</div>';
        return;
    }

    container.innerHTML = '<div class="loading-spinner"></div><div style="font-size:0.8rem;color:var(--text-secondary);margin-top:0.5rem;">Alternatif senaryolar hesaplanıyor... (Bu işlem biraz sürebilir)</div>';

    // Assets definition
    const assets = [
        { id: 'tether', name: 'Dolar', symbol: 'USD', type: 'fiat', multiplier: 1 },
        { id: 'euro-tether', name: 'Euro', symbol: 'EUR', type: 'fiat', multiplier: 1 },
        { id: 'pax-gold', name: 'Altın', symbol: 'GOLD', type: 'commodity', multiplier: 31.1035 },
        { id: 'kinesis-silver', name: 'Gümüş', symbol: 'SILVER', type: 'commodity', multiplier: 31.1035 },
        { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', type: 'crypto', multiplier: 1 },
        { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', type: 'crypto', multiplier: 1 }
    ];

    let totalInvestedTRY = 0;
    let assetAmounts = {};
    assets.forEach(a => assetAmounts[a.id] = 0);

    try {
        const currentPrices = {};

        if (currentRates['USD']) currentPrices['tether'] = parseLocaleNumber(currentRates['USD'].sell);
        if (currentRates['EUR']) currentPrices['euro-tether'] = parseLocaleNumber(currentRates['EUR'].sell);
        if (currentRates['GOLD']) currentPrices['pax-gold'] = parseLocaleNumber(currentRates['GOLD'].sell);
        if (currentRates['SILVER']) currentPrices['kinesis-silver'] = parseLocaleNumber(currentRates['SILVER'].sell);

        try {
            const btcRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCTRY');
            const btcData = await btcRes.json();
            currentPrices['bitcoin'] = parseFloat(btcData.price);

            const ethRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHTRY');
            const ethData = await ethRes.json();
            currentPrices['ethereum'] = parseFloat(ethData.price);
        } catch (e) {
            console.error("Binance API error, falling back to CoinGecko", e);
            try {
                const cgRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=try');
                const cgData = await cgRes.json();
                if (cgData.bitcoin) currentPrices['bitcoin'] = cgData.bitcoin.try;
                if (cgData.ethereum) currentPrices['ethereum'] = cgData.ethereum.try;
            } catch (e2) {
                console.error("CoinGecko current price fetch failed", e2);
            }
        }

        const investmentsByDate = {};
        investments.forEach(inv => {
            const date = new Date(inv.date);
            const dateStr = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
            if (!investmentsByDate[dateStr]) investmentsByDate[dateStr] = [];
            investmentsByDate[dateStr].push(inv);
        });

        const dates = Object.keys(investmentsByDate);
        let processedCount = 0;

        for (const dateStr of dates) {
            const invs = investmentsByDate[dateStr];
            const dayTotal = invs.reduce((sum, inv) => sum + (inv.amount * inv.buyPrice) + inv.fee, 0);
            totalInvestedTRY += dayTotal;

            for (const asset of assets) {
                try {
                    if (processedCount > 0) await new Promise(r => setTimeout(r, 1500));

                    const historyRes = await fetch(`https://api.coingecko.com/api/v3/coins/${asset.id}/history?date=${dateStr}`);
                    const historyData = await historyRes.json();

                    if (historyData.market_data && historyData.market_data.current_price) {
                        const price = historyData.market_data.current_price.try;
                        if (price) {
                            assetAmounts[asset.id] += dayTotal / price;
                        }
                    }
                    processedCount++;
                } catch (e) {
                    console.error(`Error fetching history for ${asset.id} on ${dateStr}:`, e);
                }
            }
        }

        let html = `
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                Yatırım yaptığınız tarihlerde aynı tutarla aşağıdaki varlıkları alsaydınız:
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
        `;

        assets.forEach(asset => {
            const currentPrice = currentPrices[asset.id] || 0;
            const finalValue = (assetAmounts[asset.id] * asset.multiplier) * currentPrice;

            const profit = finalValue - totalInvestedTRY;
            const profitClass = profit >= 0 ? 'positive' : 'negative';

            let sourceLabel = '';
            if (asset.type === 'crypto') sourceLabel = '<span style="font-size:0.6rem;color:var(--text-secondary);margin-left:0.3rem;">(Binance TR)</span>';

            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 0.5rem; border: 1px solid rgba(255,255,255,0.05); border-radius: 0.5rem; background: rgba(255,255,255,0.02);">
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        ${getCurrencyIcon(asset.symbol)}
                        <div style="display:flex;flex-direction:column;">
                            <span style="font-weight:600; font-size: 0.9rem;">${asset.name}</span>
                            ${sourceLabel}
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-weight:600; font-size: 0.9rem;">${formatCurrency(finalValue)}</div>
                        <div class="${profitClass}" style="font-size:0.75rem;">${formatCurrency(profit)}</div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = '<div style="color:var(--danger);font-size:0.9rem;">Veri çekilemedi. Lütfen daha sonra tekrar deneyin.</div>';
        console.error(e);
    }
}



function closeModal() {
    document.getElementById('add-modal').classList.remove('active');
}

function showAssetDetails(currency) {
    const modal = document.getElementById('detail-modal');
    modal.classList.add('active');

    // Set Title and Icon
    let label = '';
    const summary = { USD: 'Dolar', EUR: 'Euro', GOLD: 'Altın', SILVER: 'Gümüş' };
    label = summary[currency] || currency;

    document.getElementById('detail-title').innerText = label + ' Detayları';
    document.getElementById('detail-icon').innerHTML = getCurrencyIcon(currency);

    // Filter Investments
    const invs = investments.filter(i => i.currency === currency);

    // Calculate Stats
    let totalAmount = 0;
    let totalCost = 0;

    invs.forEach(i => {
        totalAmount += i.amount;
        totalCost += (i.amount * i.buyPrice) + i.fee;
    });

    const rateObj = currentRates[currency];
    const currentRate = parseLocaleNumber(rateObj?.buy) || 0;
    const currentValue = totalAmount * currentRate;
    const profit = currentValue - totalCost;
    const avgCost = totalAmount > 0 ? totalCost / totalAmount : 0;
    const unit = (currency === 'USD' || currency === 'EUR') ? (currency === 'USD' ? '$' : '€') : 'gr';

    // Populate Stats
    document.getElementById('detail-amount').innerText = `${totalAmount.toLocaleString('tr-TR')} ${unit}`;
    document.getElementById('detail-avg-cost').innerText = formatCurrency(avgCost);
    document.getElementById('detail-value').innerText = formatCurrency(currentValue);

    const plEl = document.getElementById('detail-pl');
    plEl.innerText = formatCurrency(profit);
    plEl.className = profit >= 0 ? 'positive' : 'negative';

    // Populate Table
    const tbody = document.getElementById('detail-tbody');
    tbody.innerHTML = '';

    invs.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(inv => {
        const tr = document.createElement('tr');
        const cost = (inv.amount * inv.buyPrice);
        tr.innerHTML = `
            <td>${new Date(inv.date).toLocaleDateString('tr-TR')}</td>
            <td>${inv.amount}</td>
            <td>${formatCurrency(inv.buyPrice)}</td>
            <td>${formatCurrency(cost)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('active');
}

// Privacy Mode
function togglePrivacy() {
    document.body.classList.toggle('privacy-active');
    const isActive = document.body.classList.contains('privacy-active');
    localStorage.setItem('privacyMode', isActive);

    // Update Icon
    const icon = document.getElementById('privacy-icon');
    if (isActive) {
        // Closed Eye (Off)
        icon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
    } else {
        // Open Eye
        icon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
    }
}

// Restore Privacy State
const savedPrivacy = localStorage.getItem('privacyMode') === 'true';
if (savedPrivacy) {
    togglePrivacy();
}


// File Import
async function handleFileImport(input) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/import_csv', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            alert(`Başarılı! ${result.count} yatırım içeri aktarıldı.`);
            await fetchInvestments();
        } else {
            alert('Hata: ' + result.error);
        }
    } catch (e) {
        console.error("Import error:", e);
        alert('Yükleme sırasında bir hata oluştu.');
    } finally {
        input.value = ''; // Reset input
    }
}

// Theme Handling
function toggleTheme() {
    const html = document.documentElement;
    const isLight = html.getAttribute('data-theme') === 'light';
    const newTheme = isLight ? 'dark' : 'light';

    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (!icon) return;

    if (theme === 'light') {
        // Moon icon for switching to dark
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    } else {
        // Sun icon for switching to light
        icon.innerHTML = `<circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
    }
}

// Init Theme
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
// We need to wait for DOM to update icon, so we do it in init() or after DOMLoad.
// Let's add it to init

async function init() {
    updateThemeIcon(savedTheme);
    await fetchPortfolios();
    await fetchRates();
}

init();
setInterval(fetchRates, 60000);
