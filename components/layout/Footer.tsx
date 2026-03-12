"use client";

import Image from "next/image";
import Link from "next/link";

interface Branch {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
  };
}

interface SocialLink {
  platform: "facebook" | "instagram" | "twitter";
  url: string;
  label: string;
}

interface FooterProps {
  branches?: Branch[];
  socialLinks?: SocialLink[];
  showRegulatory?: boolean;
}

// TODO: Fetch branch data from API endpoint: GET /api/branches
// Expected response format: Array<Branch>

// TODO: Fetch social media links from API endpoint: GET /api/social-links
// Expected response format: Array<SocialLink>

export default function Footer({
  branches = [
    {
      id: "1",
      name: "Main Office",
      phone: "+27 00 000 0000",
      email: "info@yourcompany.co.za",
      address: {
        street: "123 Main Road",
        city: "City",
        postalCode: "0000",
      },
    },
  ],
  socialLinks = [
    { platform: "facebook", url: "#", label: "Facebook" },
    { platform: "instagram", url: "#", label: "Instagram" },
    { platform: "twitter", url: "#", label: "Twitter/X" },
  ],
  showRegulatory = true,
}: FooterProps) {
  const socialIcons = {
    facebook: (
      <svg style={{ width: "24px", height: "24px" }} fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    instagram: (
      <svg style={{ width: "24px", height: "24px" }} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
      </svg>
    ),
    twitter: (
      <svg style={{ width: "24px", height: "24px" }} fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  };

  return (
    <footer className="w-100 bg-dark py-5 text-light" style={{ backgroundColor: "#111827" }}>
      <div className="container-lg px-4">
        <div className="row g-5">
          {/* Logo + About */}
          <div className="col-12 col-md-6 col-lg-3">
            <p className="fw-bold text-white fs-5 mb-0">Your Company</p>
            <p className="mt-2 small text-muted">
              Replace this with your company tagline or a short description.
            </p>

            {/* Social Links */}
            <div className="mt-4 d-flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.platform}
                  href={social.url}
                  className="text-muted"
                  style={{ transition: "color 0.2s" }}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#6c757d")}
                >
                  {socialIcons[social.platform]}
                </a>
              ))}
            </div>

            {/* Regulatory / Compliance badge — configure as needed */}
            {showRegulatory && (
              <div className="mt-4">
                <p className="small text-muted mb-0">
                  Regulatory / Compliance
                </p>
              </div>
            )}
          </div>

          {/* Branch Locations - Dynamic rendering */}
          {branches.slice(0, 2).map((branch) => (
            <div key={branch.id} className="col-12 col-md-6 col-lg-3">
              <h3 className="h5 fw-semibold text-white">
                {branch.name}
              </h3>
              <div className="mt-3 small">
                <p className="mb-1">{branch.address.street}</p>
                <p className="mb-3">
                  {branch.address.city}, {branch.address.postalCode}
                </p>
                <p className="mb-1">
                  <span className="fw-medium text-white">Phone:</span>{" "}
                  <a
                    href={`tel:${branch.phone.replace(/\s/g, "")}`}
                    className="text-decoration-none text-light"
                    style={{ transition: "color 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#f8f9fa")}
                  >
                    {branch.phone}
                  </a>
                </p>
                <p className="mb-0">
                  <span className="fw-medium text-white">Email:</span>{" "}
                  <a
                    href={`mailto:${branch.email}`}
                    className="text-decoration-none text-light"
                    style={{ transition: "color 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#f8f9fa")}
                  >
                    {branch.email}
                  </a>
                </p>
              </div>
            </div>
          ))}

          {/* Quick Links */}
          <div className="col-12 col-md-6 col-lg-3">
            <h3 className="h5 fw-semibold text-white">Quick Links</h3>
            <ul className="list-unstyled mt-3 small">
              <li className="mb-2">
                <Link
                  href="/coverage"
                  className="text-decoration-none text-light"
                  style={{ transition: "color 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#f8f9fa")}
                >
                  Coverage Map
                </Link>
              </li>
              <li className="mb-2">
                <Link
                  href="/support"
                  className="text-decoration-none text-light"
                  style={{ transition: "color 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#f8f9fa")}
                >
                  Support
                </Link>
              </li>
              <li className="mb-2">
                <Link
                  href="/services"
                  className="text-decoration-none text-light"
                  style={{ transition: "color 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#f8f9fa")}
                >
                  Services
                </Link>
              </li>
              <li className="mb-2">
                <Link
                  href="/equipment"
                  className="text-decoration-none text-light"
                  style={{ transition: "color 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#f8f9fa")}
                >
                  Equipment
                </Link>
              </li>
              <li className="mb-2">
                <Link
                  href="/client-login"
                  className="text-decoration-none text-light"
                  style={{ transition: "color 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#f8f9fa")}
                >
                  Client Login
                </Link>
              </li>
              <li className="mb-2">
                <Link
                  href="/privacy-policy"
                  className="text-decoration-none text-light"
                  style={{ transition: "color 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#f8f9fa")}
                >
                  Privacy Policy
                </Link>
              </li>
              <li className="mb-0">
                <Link
                  href="/terms"
                  className="text-decoration-none text-light"
                  style={{ transition: "color 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#f8f9fa")}
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Third branch in a separate row if exists */}
        {branches.length > 2 && (
          <div className="row g-5 border-top border-secondary pt-5 mt-5">
            {branches.slice(2).map((branch) => (
              <div key={branch.id} className="col-12 col-md-6 col-lg-4">
                <h3 className="h5 fw-semibold text-white">
                  {branch.name}
                </h3>
                <div className="mt-3 small">
                  <p className="mb-1">{branch.address.street}</p>
                  <p className="mb-3">
                    {branch.address.city}, {branch.address.postalCode}
                  </p>
                  <p className="mb-1">
                    <span className="fw-medium text-white">Phone:</span>{" "}
                    <a
                      href={`tel:${branch.phone.replace(/\s/g, "")}`}
                      className="text-decoration-none text-light"
                      style={{ transition: "color 0.2s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#f8f9fa")}
                    >
                      {branch.phone}
                    </a>
                  </p>
                  <p className="mb-0">
                    <span className="fw-medium text-white">Email:</span>{" "}
                    <a
                      href={`mailto:${branch.email}`}
                      className="text-decoration-none text-light"
                      style={{ transition: "color 0.2s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#f8f9fa")}
                    >
                      {branch.email}
                    </a>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Partners / Suppliers Logo Strip */}
        <div className="border-top border-secondary pt-5 mt-5">
          <p className="text-center text-muted small text-uppercase fw-semibold mb-4" style={{ letterSpacing: "0.12em", fontSize: "0.7rem" }}>
            Our Partners &amp; Suppliers
          </p>
          <div className="d-flex flex-wrap align-items-center justify-content-center gap-4 gap-md-5 pb-2">
            {[
              { name: "Partner 1" },
              { name: "Partner 2" },
              { name: "Partner 3" },
              { name: "Partner 4" },
              { name: "Partner 5" },
              { name: "Partner 6" },
            ].map((partner) => (
              <div
                key={partner.name}
                className="d-flex align-items-center justify-content-center"
                style={{
                  width: "120px",
                  height: "48px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.35)",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  transition: "all 0.2s",
                  cursor: "default",
                  userSelect: "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.1)";
                  (e.currentTarget as HTMLDivElement).style.color = "rgba(255,255,255,0.7)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.05)";
                  (e.currentTarget as HTMLDivElement).style.color = "rgba(255,255,255,0.35)";
                }}
              >
                {partner.name}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-top border-secondary pt-4 mt-5 text-center small text-muted">
          © {new Date().getFullYear()} Your Company. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
