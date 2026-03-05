export default function CoveragePage() {
  return (
    <main className="w-full bg-white py-20">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Coverage Map</h1>
          <p className="mt-4 text-lg text-gray-600">
            Check if your area is covered by our network.
          </p>
        </div>

        {/* Intro */}
        <p className="mt-8 text-lg text-gray-700">
          Your Company provides services across the region. Our network covers
          towns, rural areas, and growing communities — delivering fast, reliable
          service where it matters most.
        </p>

        {/* Coverage Areas */}
        <section className="mt-16 w-full">
          <h2 className="text-3xl font-bold text-gray-900 text-center">
            Areas We Cover
          </h2>

          <p className="mt-4 text-center text-gray-600">
            Coverage includes (but is not limited to) the following areas:
          </p>

          <div className="mt-10 grid gap-6 text-center md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
              <h3 className="text-xl font-semibold text-sky-600">Area 1</h3>
              <ul className="mt-3 space-y-1 text-gray-700">
                <li>Town A</li>
                <li>Town B</li>
                <li>Town C</li>
              </ul>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
              <h3 className="text-xl font-semibold text-green-700">Area 2</h3>
              <ul className="mt-3 space-y-1 text-gray-700">
                <li>Town D</li>
                <li>Town E</li>
                <li>Town F</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Map Embed */}
        <section className="mt-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center">
            Service Area Map
          </h2>

          <p className="mt-4 text-center text-gray-600">
            Use the map below to check if your area is covered.
          </p>

          <div className="mt-10 flex justify-center">
            <div className="aspect-video w-full max-w-4xl overflow-hidden rounded-lg shadow-lg bg-gray-100 flex items-center justify-center">
              <p className="text-gray-500 text-lg">Map embed — configure your service area</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-20 text-center">
          <a
            href="/support"
            className="inline-block rounded bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Not sure if you&apos;re covered? Contact us
          </a>
        </section>
      </div>
    </main>
  );
}
