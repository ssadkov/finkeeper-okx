import InvestmentIdeasApi from '../components/InvestmentIdeasApi';

export default function IdeasPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-grow flex flex-col items-center p-4">
                <div className="w-full">
                    <InvestmentIdeasApi apiKey={process.env.FINKEEPER_API_KEY || ''} />
                </div>
            </main>
        </div>
    );
} 