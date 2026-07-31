import EarthBackground from "@/components/earth/EarthBackground";

export default function Home() {
  return (
    // `relative` matters: EarthBackground is absolutely positioned, so without
    // a positioned ancestor it escapes and pins itself to the body instead.
    <section className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden px-6">
      <EarthBackground rotationPeriod={140} overlayOpacity={0.5} />

      {/* z-10 keeps the copy in front of the globe. */}
      <div className="relative z-10 text-center">
        <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-7xl">
          Dane of Earth
        </h1>
        <p className="mt-6 text-lg text-white/70">
          Something is being built here.
        </p>
        <a
          href="https://daneofearth.org/"
          className="mt-10 inline-block text-sm text-white/50 underline-offset-4 transition-colors hover:text-white/80 hover:underline"
        >
          daneofearth.org
        </a>
      </div>
    </section>
  );
}
