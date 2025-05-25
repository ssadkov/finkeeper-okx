import InvestmentIdeas from './components/InvestmentIdeas';

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-grow flex flex-col items-center p-4">
                <div className="w-full max-w-6xl">
                    <InvestmentIdeas />
                </div>
            </main>
        </div>
    );
}
