import Link from "next/link";

export default function Services() {
  return (
    <section className="w-100 bg-light py-5">
      <div className="container-lg px-4">
        <h2 className="mb-5 text-center display-5 fw-bold text-dark">
          Our Internet Services
        </h2>

        <div className="row g-4">
          {/* FTTH / FTTB */}
          <div className="col-12 col-md-6 col-lg-4">
            <div className="card border rounded-3 bg-white p-4 shadow-sm h-100">
              <h3 className="h5 fw-semibold text-primary">FTTH / FTTB</h3>
              <p className="mt-3 text-muted">
                High‑speed fibre for homes and businesses. Uncapped, unshaped,
                unthrottled — the holy grail of "stop buffering".
              </p>
              <Link
                href="/fibre"
                className="mt-auto d-inline-block fw-semibold text-primary text-decoration-none"
              >
                Learn more →
              </Link>
            </div>
          </div>

          {/* Wireless Internet */}
          <div className="col-12 col-md-6 col-lg-4">
            <div className="card border rounded-3 bg-white p-4 shadow-sm h-100">
              <h3 className="h5 fw-semibold text-success">
                Wireless Internet
              </h3>
              <p className="mt-3 text-muted">
                Fibre‑backed wireless connectivity with massive coverage. Perfect
                for rural areas, farms, and fibre‑less zones.
              </p>
              <Link
                href="/wireless"
                className="mt-auto d-inline-block fw-semibold text-success text-decoration-none"
              >
                Learn more →
              </Link>
            </div>
          </div>

          {/* VOIP */}
          <div className="col-12 col-md-6 col-lg-4">
            <div className="card border rounded-3 bg-white p-4 shadow-sm h-100">
              <h3 className="h5 fw-semibold" style={{ color: "#9333ea" }}>VOIP</h3>
              <p className="mt-3 text-muted">
                Crystal‑clear voice calls over your connection. Reliable,
                affordable, and business‑ready.
              </p>
              <Link
                href="/voip"
                className="mt-auto d-inline-block fw-semibold text-decoration-none"
                style={{ color: "#9333ea" }}
              >
                Learn more →
              </Link>
            </div>
          </div>

          {/* Web Hosting */}
          <div className="col-12 col-md-6 col-lg-4">
            <div className="card border rounded-3 bg-white p-4 shadow-sm h-100">
              <h3 className="h5 fw-semibold text-warning">
                Web Hosting
              </h3>
              <p className="mt-3 text-muted">
                Fast, secure hosting for websites and email. No nonsense, no
                hidden fees, no WordPress demons.
              </p>
              <Link
                href="/hosting"
                className="mt-auto d-inline-block fw-semibold text-warning text-decoration-none"
              >
                Learn more →
              </Link>
            </div>
          </div>

          {/* Routers & Antennas */}
          <div className="col-12 col-lg-8">
            <div className="card border rounded-3 bg-white p-4 shadow-sm h-100">
              <h3 className="h5 fw-semibold text-danger">
                Routers & Antennas
              </h3>
              <p className="mt-3 text-muted">
                High‑quality equipment for fibre and wireless installations. We
                supply, install, and configure — minus the usual tech‑guy
                attitude.
              </p>
              <Link
                href="/equipment"
                className="mt-auto d-inline-block fw-semibold text-danger text-decoration-none"
              >
                Learn more →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
