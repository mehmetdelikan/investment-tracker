let investments = JSON.parse(localStorage.getItem('investments')) || [];
let currentRates = {};

async function fetchRates() {
    try {
        const response = await fetch('/api/rates');
        const data = await response.json();

        console.log("Fetched rates:", data); // Debug log

        if (data.error) {
            console.error("Error fetching rates:", data.error);
            // Don't return, try to render with what we have (or empty) to show UI
        }

        currentRates = data || {};
        renderRates();
        renderInvestments();
        updateDashboard();

        document.getElementById('last-updated').innerText = `Son Güncelleme: ${new Date().toLocaleTimeString()}`;
    } catch (e) {
        console.error("Fetch error:", e);
        // Even on error, render so UI doesn't look broken (just empty data)
        renderRates();
        renderInvestments();
        updateDashboard();
    }
}

function parseLocaleNumber(stringNumber) {
    if (!stringNumber) return 0;
    // Remove any currency symbols or whitespace
    let clean = stringNumber.replace(/[^0-9.,]/g, '');

    if (clean.indexOf('.') !== -1 && clean.indexOf(',') !== -1) {
        if (clean.indexOf('.') < clean.indexOf(',')) {
            // 1.234,56 (Turkish/European)
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
            // 1,234.56 (US)
            clean = clean.replace(/,/g, '');
        }
    } else if (clean.indexOf(',') !== -1) {
        // 123,45 -> 123.45
        clean = clean.replace(',', '.');
    }
    // If only dots, it's ambiguous. 1.234 could be 1234 or 1.234.
    // But usually for currency, if it's 3 decimal places, it might be thousands?
    // Let's assume if it matches the "Bank Buy" format which usually has decimals, we treat it carefully.
    // However, JS parseFloat handles "123.45" correctly. "1.234" is 1.234.

    return parseFloat(clean);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
}

function getCurrencyIcon(currency) {
    // Simple SVG icons
    if (currency === 'GOLD' || currency === 'Altın') {
        return `<svg class="svg-icon" style="color:var(--accent-gold);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v12M8 10h8M8 14h8"></path></svg>`;
    } else if (currency === 'USD' || currency === 'Dolar') {
        return `<svg class="svg-icon" style="color:var(--accent-green);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
    } else if (currency === 'EUR' || currency === 'Euro') {
        return `<svg class="svg-icon" style="color:#3b82f6;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h12"></path><path d="M4 14h9"></path><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"></path></svg>`;
    } else if (currency === 'BTC' || currency === 'Bitcoin') {
        return `<svg class="svg-icon" style="color:#f7931a;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.767 19.089c4.924.813 7.426-2.033 7.426-2.033s2.25-1.463.813-4.228c0 0 1.707-2.602-.813-4.39 0 0-2.683-2.195-5.935-1.626L13.5 2.5l-2.114.488.732 2.927c-.569.163-1.138.244-1.707.407l-.813-3.09-2.114.488.732 3.008c-.407.081-.813.163-1.22.244H3.5l.488 2.033s1.382-.325 1.301-.244c.976-.244 1.463.407 1.463.407l2.114 8.537c.081.244-.244.569-.244.569s-.894.244-1.301.163c.081.081-1.301-.325-1.301-.325l-.894 2.114 2.683.65c.488.163.976.244 1.463.325l-.813 3.252 2.114.569.813-3.252c.569.163 1.138.244 1.707.407l-.813 3.17 2.114.488.894-3.415z"></path></svg>`;
    } else if (currency === 'ETH' || currency === 'Ethereum') {
        return `<svg class="svg-icon" style="color:#627eea;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"></path></svg>`;
    } else {
        // Silver
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
        if (changeStr) {
            if (changeStr.includes('-')) {
                changeClass = 'negative';
                changeIcon = '<span class="arrow-anim arrow-down">▼</span>';
            } else if (changeStr !== '0' && changeStr !== '%0,00' && changeStr !== '%0.00') {
                changeClass = 'positive';
                changeIcon = '<span class="arrow-anim arrow-up">▲</span>';
            }
        }

        const div = document.createElement('div');
        div.className = 'rate-item';

        div.innerHTML = `
            <div class="rate-header">
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    ${getCurrencyIcon(c.key)}
                    <span>${c.label}</span>
                </div>
                <div class="${changeClass}" style="font-size:0.9rem; font-weight:600;">
                    ${changeIcon} ${changeStr || '-'}
                </div>
            </div>
            <div class="rate-details">
                <div class="rate-row">
                    <span class="rate-label">Alış</span>
                    <span class="rate-value" style="color:var(--success)">${buyStr ? formatCurrency(buyVal) : '-'}</span>
                </div>
                <div class="rate-row">
                    <span class="rate-label">Satış</span>
                    <span class="rate-value">${sellStr ? formatCurrency(sellVal) : '-'}</span>
                </div>
                <div class="rate-row">
                    <span class="rate-label">Makas</span>
                    <span class="rate-value" style="color:var(--text-secondary)">${(buyVal && sellVal) ? formatCurrency(sellVal - buyVal) : '-'}</span>
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    // Render Ticker
    const tickerContainer = document.getElementById('rates-ticker');
    if (tickerContainer) {
        let tickerHtml = '';

        // Create ticker items
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

        // Duplicate content for seamless loop
        const items = createTickerItems();
        tickerContainer.innerHTML = items + items + items + items; // Quadruple to be safe for wide screens
    }
}

function addInvestment(event) {
    event.preventDefault();

    const currency = document.getElementById('currency').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const buyPrice = parseFloat(document.getElementById('buy-price').value);
    const fee = parseFloat(document.getElementById('fee').value) || 0;
    const dateInput = document.getElementById('date').value;

    // Use selected date or current date/time if not selected (though required in HTML)
    const date = dateInput ? new Date(dateInput) : new Date();

    const investment = {
        id: Date.now(),
        currency,
        amount,
        buyPrice,
        fee,
        date: date.toISOString()
    };

    investments.push(investment);
    localStorage.setItem('investments', JSON.stringify(investments));

    closeModal();
    event.target.reset();
    renderInvestments();
    updateDashboard();
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

function confirmDelete() {
    if (itemToDelete) {
        investments = investments.filter(i => i.id !== itemToDelete);
        localStorage.setItem('investments', JSON.stringify(investments));
        renderInvestments();
        updateDashboard();
        closeDeleteModal();
    }
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
            <td class="${profitLossClass}">${currentRate ? formatCurrency(profitLoss) : '-'}</td>
            <td>
                <button type="button" onclick="deleteInvestment(${inv.id})" class="btn-icon btn-delete" title="Sil">
                    <svg class="svg-icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
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
    if (profitLoss >= 0) {
        plContainer.classList.remove('negative');
        plContainer.classList.add('positive');
    } else {
        plContainer.classList.remove('positive');
        plContainer.classList.add('negative');
    }

    // Update Portfolio Summary
    const summaryContainer = document.getElementById('portfolio-summary');
    summaryContainer.innerHTML = '';

    const summary = {
        USD: { amount: 0, value: 0, label: 'Dolar', unit: '$' },
        EUR: { amount: 0, value: 0, label: 'Euro', unit: '€' },
        GOLD: { amount: 0, value: 0, label: 'Altın', unit: 'gr' },
        SILVER: { amount: 0, value: 0, label: 'Gümüş', unit: 'gr' }
    };

    investments.forEach(inv => {
        const rateObj = currentRates[inv.currency];
        const currentRateStr = rateObj ? rateObj.buy : null;
        const currentRate = parseLocaleNumber(currentRateStr) || 0;

        if (summary[inv.currency]) {
            summary[inv.currency].amount += inv.amount;
            if (currentRate) {
                summary[inv.currency].value += inv.amount * currentRate;
            }
        }
    });

    Object.keys(summary).forEach(key => {
        const item = summary[key];
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.paddingBottom = '0.25rem';
        div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

        div.innerHTML = `
            <div style="display:flex;align-items:center;gap:0.25rem;">
                ${getCurrencyIcon(key)}
                <span>${item.label}</span>
            </div>
            <div style="text-align:right;">
                <div style="font-weight:600; font-size: 0.9rem;">${item.amount.toLocaleString('tr-TR')} ${item.unit}</div>
                <div style="font-size:0.75rem;color:var(--text-secondary);">${formatCurrency(item.value)}</div>
            </div>
        `;
        summaryContainer.appendChild(div);
    });

    calculateAlternativeScenario();
}

async function calculateAlternativeScenario() {
    const container = document.getElementById('alternative-scenario');
    if (!investments.length) {
        container.innerHTML = '<div style="color:var(--text-secondary);font-size:0.9rem;">Henüz yatırımınız bulunmuyor.</div>';
        return;
    }

    container.innerHTML = '<div class="loading-spinner"></div><div style="font-size:0.8rem;color:var(--text-secondary);margin-top:0.5rem;">Alternatif senaryolar hesaplanıyor... (Bu işlem biraz sürebilir)</div>';

    // Assets definition
    // For historical data, we use CoinGecko IDs
    const assets = [
        { id: 'tether', name: 'Dolar', symbol: 'USD', type: 'fiat' },
        { id: 'euro-tether', name: 'Euro', symbol: 'EUR', type: 'fiat' },
        { id: 'pax-gold', name: 'Altın', symbol: 'GOLD', type: 'commodity' },
        { id: 'kinesis-silver', name: 'Gümüş', symbol: 'SILVER', type: 'commodity' },
        { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', type: 'crypto' },
        { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', type: 'crypto' }
    ];

    let totalInvestedTRY = 0;
    let assetAmounts = {};
    assets.forEach(a => assetAmounts[a.id] = 0);

    try {
        // 1. Get Current Prices
        // A. For Fiat/Commodities: Use our app's main source (dunyakatilim) via currentRates global
        // B. For Crypto: Use Binance API

        const currentPrices = {};

        // A. Fiat/Commodities from currentRates (already fetched)
        if (currentRates['USD']) currentPrices['tether'] = parseLocaleNumber(currentRates['USD'].sell);
        if (currentRates['EUR']) currentPrices['euro-tether'] = parseLocaleNumber(currentRates['EUR'].sell);
        if (currentRates['GOLD']) currentPrices['pax-gold'] = parseLocaleNumber(currentRates['GOLD'].sell);
        if (currentRates['SILVER']) currentPrices['kinesis-silver'] = parseLocaleNumber(currentRates['SILVER'].sell);

        // B. Crypto from Binance
        try {
            const btcRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCTRY');
            const btcData = await btcRes.json();
            currentPrices['bitcoin'] = parseFloat(btcData.price);

            const ethRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHTRY');
            const ethData = await ethRes.json();
            currentPrices['ethereum'] = parseFloat(ethData.price);
        } catch (e) {
            console.error("Binance API error, falling back to CoinGecko for current crypto prices", e);
        }

        // 2. Process Investments & Fetch Historical Data
        // Group by date
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

            // Fetch history for each asset for this date from CoinGecko
            for (const asset of assets) {
                try {
                    // Rate limiting
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

        // Render results
        let html = `
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                Yatırım yaptığınız tarihlerde aynı tutarla aşağıdaki varlıkları alsaydınız:
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
        `;

        assets.forEach(asset => {
            const currentPrice = currentPrices[asset.id] || 0;
            const finalValue = assetAmounts[asset.id] * currentPrice;
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

function openModal() {
    document.getElementById('add-modal').classList.add('active');
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

function closeModal() {
    document.getElementById('add-modal').classList.remove('active');
}

// Initial fetch
fetchRates();
// Refresh every 60 seconds
setInterval(fetchRates, 60000);
