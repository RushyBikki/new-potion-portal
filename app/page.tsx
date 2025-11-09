import Image from "next/image";
export default function Home() {
  

  async function getData() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/history`);
    const data = await res.json();
    console.log(data + "yo");
    getData();
  } 
  return (
    <div>
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        TEXTY
      </main>
    </div>
    </div>
  );
}