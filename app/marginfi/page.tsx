import MarginfiBanks from '../components/MarginfiBanks';
import { MarginfiAccounts } from "@/app/components/MarginfiAccounts";

export default function MarginfiPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">MarginFi</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">My Accounts</h2>
          <MarginfiAccounts />
        </section>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Available Banks</h2>
        <MarginfiBanks />
      </div>
    </div>
  );
} 