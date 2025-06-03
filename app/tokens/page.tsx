import TokensApi from '../components/TokensApi';

export default function TokensPage() {
    const apiKey = process.env.FINKEEPER_API_KEY;
    
    if (!apiKey) {
        return (
            <div className="p-4 text-red-500">
                Error: FINKEEPER_API_KEY is not configured
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4">
            <TokensApi apiKey={apiKey} />
        </div>
    );
} 