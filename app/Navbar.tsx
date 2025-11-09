import React from "react";

function Navbar() {
    return (
        <header className="bg-gradient-to-r from-green-600 to-purple-600  text-white py-6">
            <div className="flex container mx-auto px-4 justify-between items-center">
                <h1 className="text-3xl font-bold tracking-wide"> NavBar</h1>
                <nav>
                    <ul className="flex space-x-4 ">
                        <li className="hover:text-yellow-300 transition duration-300">
                            <a href="#" className="font-medium">
                                Settings
                            </a>
                        </li>
                        <li className="hover:text-yellow-300 transition duration-300">
                            <a href="#" className="font-medium">
                                About
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
        </header>
    )
}
export default Navbar;
