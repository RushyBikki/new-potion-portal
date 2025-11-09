import React from "react";
import Link from 'next/link';
function Navbar() {
    return (
        <header className="bg-gradient-to-r from-green-600 to-purple-600  text-white py-6">
            <div className="flex container mx-auto px-4 justify-between items-center">
                <h1 className="text-3xl font-bold tracking-wide"> Poyo's Potion Portal</h1>
                <nav>
                    <ul className="flex space-x-8 ">
                        <li className="hover:text-yellow-300 transition duration-300">
                            <Link href="/" className="font-medium">
                                Home
                            </Link>
                        </li>
                        <li className="hover:text-yellow-300 transition duration-300">
                            <Link href="/History" className="font-medium">
                                History
                            </Link>
                            
                        </li>
                        <li className="hover:text-yellow-300 transition duration-300">
                            <Link href="/Login" className="font-medium">
                                Login
                            </Link>
                            
                        </li>
                    </ul>
                </nav>
            </div>
        </header>
    )
}
export default Navbar;
