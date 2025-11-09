import Image from "next/image";
import Navbar from "../Navbar";
export default function HistoryPage() {
  return (
    <div>
    <Navbar />
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className= "text-2xl font-semibold">History</h1>
        <p>History page</p>
      </main>
    </div>
    </div>
  );
}
