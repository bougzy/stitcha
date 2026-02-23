import Link from "next/link";
import connectDB from "@/lib/db";
import { Designer } from "@/lib/models/designer";
import { Order } from "@/lib/models/order";

/* -------------------------------------------------------------------------- */
/*  Not found view                                                            */
/* -------------------------------------------------------------------------- */

function NotFoundView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#1A1A2E]/5">
          <span className="text-3xl font-bold text-[#1A1A2E]/30">404</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">
          Designer Not Found
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[#1A1A2E]/55">
          This designer profile is not available or does not exist.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#C75B39] to-[#D4A853] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Profile view                                                              */
/* -------------------------------------------------------------------------- */

interface DesignerData {
  _id: string;
  name: string;
  businessName: string;
  bio?: string;
  specialties: string[];
  city?: string;
  state?: string;
  country: string;
  phone?: string;
  avatar?: string;
}

interface PortfolioItem {
  title: string;
  garmentType: string;
  image: string;
}

function ProfileView({
  designer,
  portfolio,
}: {
  designer: DesignerData;
  portfolio: PortfolioItem[];
}) {
  const initials = designer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative min-h-screen bg-[#FAFAF8]">
      {/* Background mesh gradient */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#C75B39]/[0.06] blur-[120px]" />
        <div className="absolute top-1/3 -left-24 h-[400px] w-[400px] rounded-full bg-[#D4A853]/[0.05] blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-[350px] w-[350px] rounded-full bg-[#F5E6D3]/[0.08] blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-12 sm:px-6">
        {/* Glass card */}
        <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/70 shadow-[0_8px_32px_rgba(26,26,46,0.08)] backdrop-blur-xl">
          {/* Header gradient bar */}
          <div className="h-2 bg-gradient-to-r from-[#C75B39] to-[#D4A853]" />

          <div className="p-8 sm:p-10">
            {/* Avatar & name */}
            <div className="flex flex-col items-center text-center">
              {/* Avatar circle */}
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#C75B39] to-[#D4A853] shadow-lg">
                <span className="text-2xl font-bold text-white">
                  {initials}
                </span>
              </div>

              {/* Business name */}
              <h1 className="mt-5 text-2xl font-bold text-[#1A1A2E]">
                {designer.businessName}
              </h1>

              {/* Designer name */}
              <p className="mt-1 text-sm text-[#1A1A2E]/55">
                {designer.name}
              </p>

              {/* Location */}
              {(designer.city || designer.state) && (
                <p className="mt-2 text-sm text-[#1A1A2E]/45">
                  {[designer.city, designer.state].filter(Boolean).join(", ")}
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="my-8 h-px bg-[#1A1A2E]/8" />

            {/* Bio section */}
            {designer.bio && (
              <div className="mb-8">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#1A1A2E]/40">
                  About
                </h2>
                <p className="text-sm leading-relaxed text-[#1A1A2E]/70">
                  {designer.bio}
                </p>
              </div>
            )}

            {/* Specialties section */}
            {designer.specialties && designer.specialties.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#1A1A2E]/40">
                  Specialties
                </h2>
                <div className="flex flex-wrap gap-2">
                  {designer.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="rounded-full border border-[#C75B39]/15 bg-[#C75B39]/5 px-3.5 py-1.5 text-xs font-medium text-[#C75B39]"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Contact section */}
            {designer.phone && (
              <div className="mb-8">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#1A1A2E]/40">
                  Contact
                </h2>
                <a
                  href={`tel:${designer.phone}`}
                  className="inline-flex items-center gap-2 text-sm text-[#1A1A2E]/70 transition-colors hover:text-[#C75B39]"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  {designer.phone}
                </a>
              </div>
            )}

            {/* Location details */}
            {(designer.city || designer.state || designer.country) && (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#1A1A2E]/40">
                  Location
                </h2>
                <p className="text-sm text-[#1A1A2E]/70">
                  {[designer.city, designer.state, designer.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            )}

            {/* Portfolio */}
            {portfolio.length > 0 && (
              <div className="mt-8">
                <div className="my-8 h-px bg-[#1A1A2E]/8" />
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#1A1A2E]/40">
                  Portfolio
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {portfolio.map((item, i) => (
                    <div
                      key={i}
                      className="group overflow-hidden rounded-xl border border-white/30 bg-white/40"
                    >
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                      <div className="p-2">
                        <p className="truncate text-xs font-medium text-[#1A1A2E]">
                          {item.title}
                        </p>
                        <p className="text-[10px] capitalize text-[#1A1A2E]/40">
                          {item.garmentType}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-[#1A1A2E]/40 transition-colors hover:text-[#C75B39]"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-[#C75B39] to-[#D4A853]">
              <span className="text-[8px] font-bold text-white">S</span>
            </span>
            Powered by Stitcha
          </Link>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Server component — page                                                   */
/* -------------------------------------------------------------------------- */

export default async function PublicDesignerProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Validate that the id looks like a valid MongoDB ObjectId
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return <NotFoundView />;
  }

  try {
    await connectDB();
    const designer = await Designer.findById(id)
      .select(
        "-password -verificationToken -resetPasswordToken -resetPasswordExpires -email"
      )
      .lean();

    if (!designer || !(designer as Record<string, unknown>).publicProfile) {
      return <NotFoundView />;
    }

    const d = designer as unknown as DesignerData;

    // Fetch portfolio: delivered orders with gallery images
    const ordersWithGallery = await Order.find({
      designerId: id,
      status: "delivered",
      "gallery.0": { $exists: true },
    })
      .select("title garmentType gallery")
      .sort({ updatedAt: -1 })
      .limit(12)
      .lean();

    const portfolio: PortfolioItem[] = [];
    for (const order of ordersWithGallery) {
      const o = order as Record<string, unknown>;
      const images = (o.gallery as string[]) || [];
      // Take first image from each order
      if (images.length > 0) {
        portfolio.push({
          title: o.title as string,
          garmentType: o.garmentType as string,
          image: images[0],
        });
      }
    }

    return <ProfileView designer={d} portfolio={portfolio} />;
  } catch {
    return <NotFoundView />;
  }
}
