import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold mb-4">Daz Barber</h1>
        <p className="text-lg mb-8 text-gray-600">
          Join our waitlist to get your haircut
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/signup"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Join Waitlist
          </Link>
          <Link
            href="/login"
            className="border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition"
          >
            Barber Login
          </Link>
        </div>
      </div>
    </div>
  );
}

