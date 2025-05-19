import Link from 'next/link';
import Chat from './components/Chat';

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-grow flex flex-col items-center p-4">
                <div className="w-full max-w-4xl">
                    <Chat />
                </div>
            </main>
        </div>
    );
}
