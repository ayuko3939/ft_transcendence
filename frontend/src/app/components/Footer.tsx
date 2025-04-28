export default function Footer() {
  return (
    <footer className="fixed right-0 bottom-0 left-0 z-10 flex items-center justify-center p-4 text-white">
      <p className="text-sm">
        &copy; {new Date().getFullYear()} 42Tokyo. All rights reserved.
      </p>
    </footer>
  );
}
