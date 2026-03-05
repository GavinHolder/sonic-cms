import Image from "next/image";
import Link from "next/link";

export default function EquipmentPage() {
  return (
    <main className="w-full bg-white py-20">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header Image (optional) */}
        <div className="flex justify-center">
          <Image
            src="/images/placeholder-hero.jpg"
            alt="Equipment"
            width={800}
            height={300}
            className="w-full max-w-3xl rounded-lg"
            priority
          />
        </div>

        {/* Intro */}
        <p className="mt-8 text-lg text-gray-700">
          We supply high‑quality networking equipment for both Fibre and
          Wireless installations. Whether you're connecting a home, a farm, or a
          business, we provide reliable hardware that keeps your connection
          fast, stable, and headache‑free.
        </p>

        {/* Equipment Grid */}
        <section className="mt-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center">
            Equipment We Provide
          </h2>

          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {/* Routers */}
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition">
              <Image
                src="/images/router.jpg"
                alt="Routers"
                width={400}
                height={250}
                className="h-auto w-full rounded-md"
              />
              <h3 className="mt-4 text-xl font-semibold text-blue-700">
                Routers
              </h3>
              <p className="mt-2 text-gray-600">
                High‑performance routers for fibre and wireless connections.
                Stable, fast, and built for modern streaming and gaming.
              </p>
            </div>

            {/* Wireless Antennas */}
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition">
              <Image
                src="/images/antenna.jpg"
                alt="Wireless Antennas"
                width={400}
                height={250}
                className="h-auto w-full rounded-md"
              />
              <h3 className="mt-4 text-xl font-semibold text-green-700">
                Wireless Antennas
              </h3>
              <p className="mt-2 text-gray-600">
                Long‑range wireless antennas for rural and remote areas. Perfect
                for farms, small towns, and fibre‑less zones.
              </p>
            </div>

            {/* Fibre ONTs */}
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition">
              <Image
                src="/images/ont.jpg"
                alt="Fibre ONTs"
                width={400}
                height={250}
                className="h-auto w-full rounded-md"
              />
              <h3 className="mt-4 text-xl font-semibold text-purple-700">
                Fibre ONTs
              </h3>
              <p className="mt-2 text-gray-600">
                Optical Network Terminals for FTTH and FTTB installations.
                Reliable, fast, and fully compatible with our services.
              </p>
            </div>

            {/* CPE Units */}
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition md:col-span-3">
              <Image
                src="/images/cpe.jpg"
                alt="CPE Units"
                width={800}
                height={300}
                className="h-auto w-full rounded-md"
              />
              <h3 className="mt-4 text-xl font-semibold text-red-700">
                Wireless CPE Units
              </h3>
              <p className="mt-2 text-gray-600">
                Customer‑premises equipment for wireless installations. Strong
                signal, stable performance, and built for the Your Region’s
                weather.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-20 text-center">
          <Link
            href="/support"
            className="inline-block rounded bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Need help choosing equipment?
          </Link>
        </section>
      </div>
    </main>
  );
}
