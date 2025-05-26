'use client';

import { useState } from 'react';
import { useOkx } from '../context/OkxContext';

interface OkxConnectModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function OkxConnectModal({ isOpen, onClose }: OkxConnectModalProps) {
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [passphrase, setPassphrase] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { connect } = useOkx();

    const handleConnect = async () => {
        setIsLoading(true);
        try {
            // Создаем временную метку в UTC
            const time = new Date().toISOString();
            
            // Создаем подпись для FUND баланса
            const fundUrl = '/api/v5/asset/balances';
            const fundMessage = time + 'GET' + fundUrl;
            const fundEncoder = new TextEncoder();
            const fundKey = await crypto.subtle.importKey(
                'raw',
                fundEncoder.encode(apiSecret),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );
            const fundSignature = await crypto.subtle.sign(
                'HMAC',
                fundKey,
                fundEncoder.encode(fundMessage)
            );
            const fundSign = btoa(String.fromCharCode(...new Uint8Array(fundSignature)));

            // Создаем подпись для UNIFIED баланса
            const unifiedUrl = '/api/v5/account/balance';
            const unifiedMessage = time + 'GET' + unifiedUrl;
            const unifiedEncoder = new TextEncoder();
            const unifiedKey = await crypto.subtle.importKey(
                'raw',
                unifiedEncoder.encode(apiSecret),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );
            const unifiedSignature = await crypto.subtle.sign(
                'HMAC',
                unifiedKey,
                unifiedEncoder.encode(unifiedMessage)
            );
            const unifiedSign = btoa(String.fromCharCode(...new Uint8Array(unifiedSignature)));

            // Заголовки для запросов
            const headers = {
                'OK-ACCESS-KEY': apiKey,
                'OK-ACCESS-TIMESTAMP': time,
                'OK-ACCESS-PASSPHRASE': passphrase,
                'Content-Type': 'application/json',
            };

            // Запрос FUND баланса
            const fundResponse = await fetch('https://www.okx.com' + fundUrl, {
                method: 'GET',
                headers: {
                    ...headers,
                    'OK-ACCESS-SIGN': fundSign,
                },
            });
            const fundData = await fundResponse.json();
            console.log('FUND Balance Response:', fundData);

            // Запрос UNIFIED баланса
            const unifiedResponse = await fetch('https://www.okx.com' + unifiedUrl, {
                method: 'GET',
                headers: {
                    ...headers,
                    'OK-ACCESS-SIGN': unifiedSign,
                },
            });
            const unifiedData = await unifiedResponse.json();
            console.log('UNIFIED Balance Response:', unifiedData);

            if (fundData.code === '0' && unifiedData.code === '0') {
                // Сохраняем API ключи в localStorage
                localStorage.setItem('okx_api_key', apiKey);
                localStorage.setItem('okx_api_secret', apiSecret);
                localStorage.setItem('okx_passphrase', passphrase);
                
                // Вызываем функцию connect из контекста OKX
                await connect();
                
                onClose();
            } else {
                throw new Error(fundData.msg || unifiedData.msg || 'Failed to connect to OKX');
            }
        } catch (error) {
            console.error('Error connecting to OKX:', error);
            alert(error instanceof Error ? error.message : 'Failed to connect to OKX');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Connect OKX Exchange</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ✕
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            API Key
                        </label>
                        <input
                            type="text"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your OKX API Key"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            API Secret
                        </label>
                        <input
                            type="password"
                            value={apiSecret}
                            onChange={(e) => setApiSecret(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your OKX API Secret"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Passphrase
                        </label>
                        <input
                            type="password"
                            value={passphrase}
                            onChange={(e) => setPassphrase(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your OKX Passphrase"
                        />
                    </div>

                    <button
                        onClick={handleConnect}
                        disabled={isLoading || !apiKey || !apiSecret || !passphrase}
                        className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Connecting...' : 'Connect'}
                    </button>
                </div>
            </div>
        </div>
    );
} 