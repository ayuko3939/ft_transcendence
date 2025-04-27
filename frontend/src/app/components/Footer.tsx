export default function Footer() {
  return (
    <footer className="flex items-center justify-center bg-black p-4 text-white">
      <p className="text-sm">
        &copy; {new Date().getFullYear()} 42Tokyo. All rights reserved.
      </p>
    </footer>
  );
}
