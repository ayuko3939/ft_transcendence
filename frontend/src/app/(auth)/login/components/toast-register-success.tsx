import { useEffect, useState } from "react";

export default function ToastRegisterSuccess(props: { isRegistered: boolean }) {
  const [isVisible, setIsVisible] = useState(props.isRegistered);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (props.isRegistered) {
      const timer = setTimeout(() => startFadeOut(), 3000);
      return () => clearTimeout(timer);
    }
  }, [props.isRegistered]);

  const startFadeOut = () => {
    setIsFading(true);
    setTimeout(() => setIsVisible(false), 500);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      id="toast-register-success"
      className={`fixed top-4 right-4 z-50 flex w-full max-w-xs items-center rounded-lg bg-white p-4 text-gray-500 shadow-lg transition-opacity duration-500 ease-in-out dark:bg-gray-800 dark:text-gray-400 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
      role="alert"
    >
      <div className="text-sm font-normal">ユーザー登録が完了しました。</div>
      <div className="ms-auto flex items-center space-x-2 rtl:space-x-reverse">
        <button
          type="button"
          className="-mx-1.5 -my-1.5 ms-auto inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-gray-300 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-white"
          onClick={startFadeOut}
          aria-label="Close"
        >
          <span className="sr-only">Close</span>
          <svg
            className="h-3 w-3"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 14 14"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
