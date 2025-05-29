import UserList from "../components/UserList";

const HomePage = () => {
    return (
        <div className="relative min-h-screen bg-blue-500 overflow-hidden">
            {/* Wave element */}
            <div className="svg-wave-container">
                <svg className="waves" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 24 150 28" preserveAspectRatio="none" shapeRendering="auto">
                    <defs>
                        <path id="gentle-wave" d="M-160 44c30 0 58-4 88-4s 58 4 88 4 58-4 88-4 58 4 88 4 v44h-352z" />
                    </defs>
                    <g className="parallax">
                        <use xlinkHref="#gentle-wave" x="48" y="-15" fill="rgba(255,255,255,0.7)" />
                        <use xlinkHref="#gentle-wave" x="48" y="-14" fill="rgba(255,255,255,0.5)" />
                        <use xlinkHref="#gentle-wave" x="48" y="-13" fill="rgba(255,255,255,0.3)" />
                    </g>
                </svg>
            </div>
        
            {/* Boat element */}
            <img src="final-logo.svg" alt="HAGA Boat Logo" className="absolute left-1/2 top-[11%] transform -translate-x-1/2 z-20 boat-animation width-375" />
            
            {/* Main home page content*/}
            <div className="absolute w-full top-[65%] left-1/2 transform -translate-x-1/2 flex flex-col items-center justify-center p-6 text-center z-10">
                <h1 className="text-4xl font-extrabold text-gray-800 mb-1 tracking-tight">
                    HAGA: 1 v 1 CTF
                </h1>
                <p className="text-lg text-gray-600 mb-4 max-w-md mx-auto">
                    Sudah merasa jago?
                </p>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-md shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1">
                    Start Matching
                </button>
            </div>
            <UserList />
        </div>
    );
};

export default HomePage;