'use client';

// ...existing imports...

export function UserMenu({ user }: { user: any }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
       



<div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 hover:opacity-80"
                aria-controls="drawer-user-menu"
                aria-expanded={isOpen}
            >
                <Avatar
                    size="sm"
                    src={user.image || '/avatar.jpg'}
                    alt={user.name || 'User avatar'}
                />
            </button>

            {/* Drawer component */}
            <div
                id="drawer-user-menu"
                className={`fixed top-0 right-0 z-40 h-screen p-4 overflow-y-auto bg-white w-80 dark:bg-gray-800 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
                tabIndex={-1}
                aria-labelledby="drawer-user-menu-label"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div className="flex items-center gap-3">
                        <Avatar
                            size="md"
                            src={user.image || '/avatar.jpg'}
                            alt={user.name || 'User avatar'}
                        />
                        <div className="flex-1 min-w-0">
                            <h5
                                id="drawer-user-menu-label"
                                className="text-base font-semibold text-gray-500 truncate dark:text-gray-400"
                            >
                                {user.name}
                            </h5>
                            <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                                {user.email}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span className="sr-only">Close menu</span>
                    </button>
                </div>

                {/* Menu Items */}
                <div className="py-4 overflow-y-auto">
                    <ul className="space-y-2 font-medium">
                        <li>
                            <Link
                                href={`/${user.username}`}
                                className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
                                onClick={() => setIsOpen(false)}
                            >
                                <span className="material-symbols-outlined w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">
                                    person
                                </span>
                                <span className="ms-3">Profile</span>
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/settings/profile"
                                className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
                                onClick={() => setIsOpen(false)}
                            >
                                <span className="material-symbols-outlined w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">
                                    settings
                                </span>
                                <span className="ms-3">Settings</span>
                            </Link>
                        </li>
                        <li className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    signOut();
                                }}
                                className="flex items-center w-full p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
                            >
                                <span className="material-symbols-outlined w-5 h-5 text-red-500 transition duration-75 group-hover:text-red-700">
                                    logout
                                </span>
                                <span className="ms-3 text-red-500 group-hover:text-red-700">Sign Out</span>
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-gray-900 bg-opacity-50 dark:bg-opacity-80 transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}