import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, X } from 'lucide-react';
import type { CryptoPrice } from '../types';

interface ExchangeModalProps {
    prices: CryptoPrice[];
    onClose: () => void;
}

type CurrencyKind = 'fiat' | 'crypto';

interface CurrencyOption {
    code: string;
    label: string;
    kind: CurrencyKind;
}

const DEFAULT_FIAT_USD_RATE: Record<string, number> = {
    USD: 1,
    INR: 0.012,
    EUR: 1.09,
    GBP: 1.28,
    AED: 0.27,
    JPY: 0.0067,
};

const CURRENCIES: CurrencyOption[] = [
    { code: 'USD', label: 'US Dollar', kind: 'fiat' },
    { code: 'INR', label: 'Indian Rupee', kind: 'fiat' },
    { code: 'EUR', label: 'Euro', kind: 'fiat' },
    { code: 'GBP', label: 'British Pound', kind: 'fiat' },
    { code: 'AED', label: 'UAE Dirham', kind: 'fiat' },
    { code: 'JPY', label: 'Japanese Yen', kind: 'fiat' },
    { code: 'USDT', label: 'Tether', kind: 'crypto' },
    { code: 'BTC', label: 'Bitcoin', kind: 'crypto' },
    { code: 'ETH', label: 'Ethereum', kind: 'crypto' },
    { code: 'BNB', label: 'BNB', kind: 'crypto' },
    { code: 'SOL', label: 'Solana', kind: 'crypto' },
    { code: 'ADA', label: 'Cardano', kind: 'crypto' },
];

const ExchangeModal: React.FC<ExchangeModalProps> = ({ prices, onClose }) => {
    const [amount, setAmount] = useState('1000');
    const [fromCurrency, setFromCurrency] = useState('INR');
    const [toCurrency, setToCurrency] = useState('USDT');
    const [fiatUsdRate, setFiatUsdRate] = useState<Record<string, number>>(DEFAULT_FIAT_USD_RATE);

    const priceBySymbol = useMemo(() => {
        const map: Record<string, number> = { USDT: 1 };
        prices.forEach((price) => {
            map[price.symbol.toUpperCase()] = price.price;
        });
        return map;
    }, [prices]);

    useEffect(() => {
        const controller = new AbortController();

        const fetchLiveFiatRates = async () => {
            try {
                const response = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=INR,EUR,GBP,AED,JPY', {
                    signal: controller.signal,
                });
                if (!response.ok) return;
                const data = await response.json();
                const rates = data?.rates as Record<string, number> | undefined;
                if (!rates) return;

                setFiatUsdRate({
                    USD: 1,
                    INR: rates.INR ? 1 / rates.INR : DEFAULT_FIAT_USD_RATE.INR,
                    EUR: rates.EUR ? 1 / rates.EUR : DEFAULT_FIAT_USD_RATE.EUR,
                    GBP: rates.GBP ? 1 / rates.GBP : DEFAULT_FIAT_USD_RATE.GBP,
                    AED: rates.AED ? 1 / rates.AED : DEFAULT_FIAT_USD_RATE.AED,
                    JPY: rates.JPY ? 1 / rates.JPY : DEFAULT_FIAT_USD_RATE.JPY,
                });
            } catch {
                // Fall back to defaults silently when API fails.
            }
        };

        fetchLiveFiatRates();
        const interval = window.setInterval(fetchLiveFiatRates, 60000);

        return () => {
            controller.abort();
            window.clearInterval(interval);
        };
    }, []);

    const getUsdPerUnit = (currencyCode: string): number => {
        const option = CURRENCIES.find((c) => c.code === currencyCode);
        if (!option) return 0;
        if (option.kind === 'fiat') return fiatUsdRate[currencyCode] ?? 0;
        return priceBySymbol[currencyCode] ?? 0;
    };

    const parsedAmount = parseFloat(amount || '0');
    const fromUsd = getUsdPerUnit(fromCurrency);
    const toUsd = getUsdPerUnit(toCurrency);
    const result = fromUsd > 0 && toUsd > 0 ? (parsedAmount * fromUsd) / toUsd : 0;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(5, 10, 20, 0.62)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 80,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="glass-card"
                style={{
                    width: 'min(460px, 92vw)',
                    padding: '18px',
                    borderRadius: '14px',
                    border: '1px solid rgba(0, 212, 255, 0.25)',
                    background: 'linear-gradient(135deg, rgba(10,20,40,0.95), rgba(12,24,52,0.96))',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                        <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '16px', fontWeight: 700 }}>
                            Currency Exchange
                        </h3>
                        <div style={{ marginTop: '2px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            Convert fiat and crypto pairs like INR to USDT
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                    <input
                        type="number"
                        min="0"
                        step="any"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount"
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid var(--border-subtle)',
                            background: 'rgba(0,0,0,0.35)',
                            color: '#e2e8f0',
                            fontSize: '14px',
                        }}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 1fr', gap: '8px', alignItems: 'center' }}>
                        <select
                            value={fromCurrency}
                            onChange={(e) => setFromCurrency(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border-subtle)',
                                background: '#0b2a5a',
                                color: '#ffffff',
                                fontSize: '13px',
                            }}
                        >
                            {CURRENCIES.map((currency) => (
                                <option
                                    key={currency.code}
                                    value={currency.code}
                                    style={{ background: '#0b2a5a', color: '#ffffff' }}
                                >
                                    {currency.code} - {currency.label}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={() => {
                                setFromCurrency(toCurrency);
                                setToCurrency(fromCurrency);
                            }}
                            style={{
                                width: '44px',
                                height: '40px',
                                borderRadius: '10px',
                                border: '1px solid rgba(0, 212, 255, 0.25)',
                                background: 'rgba(0, 212, 255, 0.1)',
                                color: '#00d4ff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            title="Swap currencies"
                        >
                            <ArrowRightLeft size={14} />
                        </button>

                        <select
                            value={toCurrency}
                            onChange={(e) => setToCurrency(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border-subtle)',
                                background: '#0b2a5a',
                                color: '#ffffff',
                                fontSize: '13px',
                            }}
                        >
                            {CURRENCIES.map((currency) => (
                                <option
                                    key={currency.code}
                                    value={currency.code}
                                    style={{ background: '#0b2a5a', color: '#ffffff' }}
                                >
                                    {currency.code} - {currency.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div
                        style={{
                            marginTop: '4px',
                            padding: '12px',
                            borderRadius: '10px',
                            border: '1px solid rgba(0, 212, 255, 0.2)',
                            background: 'rgba(0, 212, 255, 0.06)',
                        }}
                    >
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            Estimated conversion
                        </div>
                        <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: '16px' }}>
                            {Number.isFinite(result) ? result.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '0'} {toCurrency}
                        </div>
                    </div>

                    <button
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid rgba(0, 212, 255, 0.35)',
                            background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(59,130,246,0.22))',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer',
                            fontFamily: 'Inter, sans-serif',
                        }}
                        onClick={onClose}
                    >
                        Exchange
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExchangeModal;
